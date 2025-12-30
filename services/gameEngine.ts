import { 
  GameState, Station, TransitLine, Train, Passenger, StationType, CITIES, City 
} from '../types';
import { GAME_CONFIG, THEME } from '../constants';
import { getDistance, isSegmentCrossingWater, distToSegment } from './geometry';

export class GameEngine {
  state: GameState;
  lastUpdate: number = 0;
  passengerIdCounter: number = 0;
  stationIdCounter: number = 10;
  
  constructor(initialState: GameState) {
    this.state = initialState;
    this.state.nextRewardIn = 60000 * 7; 
  }

  update(currentTime: number) {
    if (!this.state.gameActive) return;

    if (this.lastUpdate === 0) {
      this.lastUpdate = currentTime;
      return;
    }

    const rawDt = currentTime - this.lastUpdate;
    this.lastUpdate = currentTime;

    const dt = Math.min(rawDt, 100) * this.state.timeScale;

    this.updateTime(dt);
    this.updateTrains(dt);
    this.updateStations(dt);
    this.updateLevel();
    this.checkFailure();
  }

  updateTime(dt: number) {
    this.state.daysElapsed += dt / 60000;
    this.state.nextRewardIn -= dt;
    
    if (this.state.nextRewardIn <= 0) {
      this.state.nextRewardIn = 60000 * 7; 
    }
  }

  updateLevel() {
    const newLevel = Math.floor(this.state.daysElapsed / 7) + 1;
    if (newLevel > this.state.level) {
      this.state.level = newLevel;
      this.giveReward();
    }
  }

  giveReward() {
    this.state.resources.lines += 1;
    this.state.resources.trains += 2;
    this.state.resources.tunnels += 2;
  }

  getDynamicSpawnRate() {
    const baseRate = GAME_CONFIG.spawnRate;
    const levelFactor = 1 + (this.state.level - 1) * 0.2;
    const timeFactor = 1 + (this.state.daysElapsed / 28); // Increases slightly over weeks
    return Math.max(800, baseRate / (levelFactor * timeFactor));
  }

  /**
   * BFS Pathfinding to find the shortest leg (Line + Next Interchange/Target)
   */
  findNextLeg(currentStationId: number, targetType: StationType): { lineId: number, transferStationId: number } | null {
    const stations = this.state.stations;
    const lines = this.state.lines;

    if (lines.length === 0) return null;

    // 1. Build Adjacency List (Graph)
    // Map stationId -> Array of neighbors: { toId, lineId }
    const adj = new Map<number, { to: number, lineId: number }[]>();
    for (const line of lines) {
      for (let i = 0; i < line.stations.length - 1; i++) {
        const s1 = line.stations[i];
        const s2 = line.stations[i + 1];
        
        if (!adj.has(s1)) adj.set(s1, []);
        if (!adj.has(s2)) adj.set(s2, []);
        
        adj.get(s1)!.push({ to: s2, lineId: line.id });
        adj.get(s2)!.push({ to: s1, lineId: line.id });
      }
    }

    // 2. BFS to find nearest station of targetType
    const queue: number[] = [currentStationId];
    const visited = new Set<number>([currentStationId]);
    const parent = new Map<number, { from: number, lineId: number }>();

    let foundTargetStationId: number | null = null;

    while (queue.length > 0) {
      const uId = queue.shift()!;
      const uStation = stations.find(s => s.id === uId);
      
      if (uStation && uStation.type === targetType && uId !== currentStationId) {
        foundTargetStationId = uId;
        break;
      }

      const neighbors = adj.get(uId) || [];
      for (const edge of neighbors) {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          parent.set(edge.to, { from: uId, lineId: edge.lineId });
          queue.push(edge.to);
        }
      }
    }

    if (foundTargetStationId === null) return null;

    // 3. Reconstruct Path
    const path: number[] = [];
    let curr = foundTargetStationId;
    while (curr !== currentStationId) {
      path.push(curr);
      const pData = parent.get(curr);
      if (!pData) break;
      curr = pData.from;
    }
    path.push(currentStationId);
    path.reverse(); // [Start, S1, S2, ..., Target]

    if (path.length < 2) return null;

    // 4. Identify the first line in the path
    const firstLegData = parent.get(path[1]);
    if (!firstLegData) return null;
    const firstStepLineId = firstLegData.lineId;
    
    // Find the furthest station on this same line before a transfer is needed
    let transferStationId = path[1];
    for (let i = 1; i < path.length; i++) {
      const edge = parent.get(path[i]);
      if (edge && edge.lineId === firstStepLineId) {
        transferStationId = path[i];
      } else {
        break;
      }
    }

    return { lineId: firstStepLineId, transferStationId };
  }

  updateTrains(dt: number) {
    this.state.lines.forEach(line => {
      line.trains.forEach(train => {
        if (line.stations.length < 2) return;
        
        train.progress += GAME_CONFIG.trainSpeed * (dt / 16);

        if (train.progress >= 1) {
          train.progress = 0;
          this.handleTrainAtStation(train, line);
        }
      });
    });
  }

  handleTrainAtStation(train: Train, line: TransitLine) {
    if (train.nextStationIndex >= line.stations.length || train.nextStationIndex < 0) {
      train.nextStationIndex = Math.max(0, Math.min(1, line.stations.length - 1));
      train.progress = 0;
      return;
    }

    const stationId = line.stations[train.nextStationIndex];
    const station = this.state.stations.find(s => s.id === stationId);
    if (!station) return;

    // 1. Alighting Logic:
    const alighting: Passenger[] = [];
    train.passengers = train.passengers.filter(p => {
      // Arrival at destination
      if (p.targetType === station.type) {
        this.state.score++;
        return false;
      }
      
      // Arrival at transfer hub - Alight to wait for next leg
      if (station.id === p.nextTransferStationId) {
        p.requiredLineId = undefined;
        p.nextTransferStationId = undefined;
        alighting.push(p);
        return false;
      }
      
      return true;
    });

    station.waitingPassengers.push(...alighting);

    // 2. Boarding Logic:
    // Ensure waiting passengers have updated routing
    station.waitingPassengers.forEach(p => {
      if (p.requiredLineId === undefined || p.nextTransferStationId === undefined) {
        const leg = this.findNextLeg(station.id, p.targetType);
        if (leg) {
          p.requiredLineId = leg.lineId;
          p.nextTransferStationId = leg.transferStationId;
        }
      }
    });

    const availableSpace = train.capacity - train.passengers.length;
    if (availableSpace > 0 && station.waitingPassengers.length > 0) {
      // Passengers only board if this train's line is their required next leg
      const boardable = station.waitingPassengers.filter(p => p.requiredLineId === line.id);
      const toLoad = boardable.slice(0, availableSpace);
      
      const loadedIds = new Set(toLoad.map(p => p.id));
      station.waitingPassengers = station.waitingPassengers.filter(p => !loadedIds.has(p.id));
      
      train.passengers.push(...toLoad);
    }

    // Pathing logic
    const isLoop = line.stations.length > 2 && line.stations[0] === line.stations[line.stations.length - 1];
    if (isLoop) {
      if (train.direction === 1) {
        if (train.nextStationIndex === line.stations.length - 1) {
          train.nextStationIndex = 1;
        } else {
          train.nextStationIndex++;
        }
      } else {
        if (train.nextStationIndex === 0) {
          train.nextStationIndex = line.stations.length - 2;
        } else {
          train.nextStationIndex--;
        }
      }
    } else {
      if (train.direction === 1) {
        if (train.nextStationIndex === line.stations.length - 1) {
          train.direction = -1;
          train.nextStationIndex--;
        } else {
          train.nextStationIndex++;
        }
      } else {
        if (train.nextStationIndex === 0) {
          train.direction = 1;
          train.nextStationIndex++;
        } else {
          train.nextStationIndex--;
        }
      }
    }

    train.nextStationIndex = Math.max(0, Math.min(train.nextStationIndex, line.stations.length - 1));
  }

  updateStations(dt: number) {
    this.state.stations.forEach(station => {
      if (station.waitingPassengers.length >= GAME_CONFIG.maxPassengers) {
        station.timer = Math.min(1.0, station.timer + dt / (THEME.timerThreshold * 4));
      } else {
        station.timer = Math.max(0, station.timer - dt / (THEME.timerThreshold * 2));
      }
    });
  }

  checkFailure() {
    // If timer reaches 1.0, it's game over.
    const failingStation = this.state.stations.find(s => s.timer >= 1.0);
    if (failingStation && this.state.gameActive) {
      this.state.gameActive = false;
      console.log("Game Over: Overcrowding at ", failingStation.name);
    }
  }

  spawnPassenger() {
    if (!this.state.gameActive || this.state.stations.length < 2) return;
    
    const startStation = this.state.stations[Math.floor(Math.random() * this.state.stations.length)];
    const availableTypes = Array.from(new Set(this.state.stations.map(s => s.type)))
      .filter(t => t !== startStation.type);
    
    if (availableTypes.length === 0) return;
    const targetType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    
    const p: Passenger = {
      id: this.passengerIdCounter++,
      targetType,
      spawnTime: performance.now()
    };

    const leg = this.findNextLeg(startStation.id, targetType);
    if (leg) {
      p.requiredLineId = leg.lineId;
      p.nextTransferStationId = leg.transferStationId;
    }

    startStation.waitingPassengers.push(p);
  }

  refreshAllPassengerRoutes() {
    // Recalculate routes for all waiting and traveling passengers when network changes
    this.state.stations.forEach(s => {
      s.waitingPassengers.forEach(p => {
        const leg = this.findNextLeg(s.id, p.targetType);
        if (leg) {
          p.requiredLineId = leg.lineId;
          p.nextTransferStationId = leg.transferStationId;
        } else {
          p.requiredLineId = undefined;
          p.nextTransferStationId = undefined;
        }
      });
    });

    this.state.lines.forEach(l => {
      l.trains.forEach(t => {
        t.passengers.forEach(p => {
          const currentStationId = l.stations[t.nextStationIndex];
          const leg = this.findNextLeg(currentStationId, p.targetType);
          if (leg) {
            p.requiredLineId = leg.lineId;
            p.nextTransferStationId = leg.transferStationId;
          }
        });
      });
    });
  }

  spawnStation(width: number, height: number, projectFn: any) {
    if (!this.state.gameActive) return;
    const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
    
    const allTypes: StationType[] = ['circle', 'triangle', 'square', 'pentagon', 'star'];
    const typePoolCount = Math.min(allTypes.length, 2 + Math.floor(this.state.level / 2));
    const availableTypes = allTypes.slice(0, typePoolCount);

    for (let attempt = 0; attempt < 50; attempt++) {
      const range = Math.min(0.95, 0.4 + (this.state.level * 0.08));
      const lat = city.bounds.minLat + (0.5 - range/2 + Math.random() * range) * (city.bounds.maxLat - city.bounds.minLat);
      const lon = city.bounds.minLon + (0.5 - range/2 + Math.random() * range) * (city.bounds.maxLon - city.bounds.minLon);
      const pos = projectFn(lat, lon, city);
      
      const isTooCloseToStation = this.state.stations.some(s => getDistance(s, pos) < 70);
      if (isTooCloseToStation) continue;

      let isTooCloseToLine = false;
      for (const line of this.state.lines) {
        for (let i = 0; i < line.stations.length - 1; i++) {
          const s1 = this.state.stations.find(s => s.id === line.stations[i]);
          const s2 = this.state.stations.find(s => s.id === line.stations[i+1]);
          if (s1 && s2 && distToSegment(pos, s1, s2) < 40) {
            isTooCloseToLine = true;
            break;
          }
        }
        if (isTooCloseToLine) break;
      }
      if (isTooCloseToLine) continue;

      const names = ['Westminster', 'Soho', 'Camden', 'Greenwich', 'Chelsea', 'Islington', 'Hackney', 'Brixton', 'Peckham', 'Hampstead', 'Ealing', 'Richmond', 'Lambeth', 'Southwark', 'Tower Hamlets', 'Haringey', 'Newham', 'Waltham Forest'];
      
      this.state.stations.push({
        id: this.stationIdCounter++,
        type: availableTypes[Math.floor(Math.random() * availableTypes.length)],
        name: `${names[Math.floor(Math.random()*names.length)]}`,
        x: pos.x,
        y: pos.y,
        waitingPassengers: [],
        timer: 0
      });
      break;
    }
  }

  addTrainToLine(lineId: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    if (line && this.state.resources.trains > 0) {
      line.trains.push({
        id: Date.now() + Math.random(),
        lineId: lineId,
        nextStationIndex: Math.floor(line.stations.length / 2) || 1,
        progress: 0,
        direction: 1,
        passengers: [],
        capacity: GAME_CONFIG.trainCapacity
      });
      this.state.resources.trains--;
    }
  }

  removeTrainFromLine(lineId: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    if (line && line.trains.length > 0) {
      const removed = line.trains.pop()!;
      const currentStationId = line.stations[Math.max(0, removed.nextStationIndex - (removed.direction === 1 ? 1 : 0))];
      const station = this.state.stations.find(s => s.id === currentStationId);
      if (station) {
        station.waitingPassengers.push(...removed.passengers);
        this.refreshAllPassengerRoutes();
      }
      this.state.resources.trains++;
    }
  }

  removeLine(lineId: number) {
    const lineIdx = this.state.lines.findIndex(l => l.id === lineId);
    if (lineIdx !== -1) {
      const line = this.state.lines[lineIdx];
      const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];

      for (let i = 0; i < line.stations.length - 1; i++) {
        const s1 = this.state.stations.find(s => s.id === line.stations[i]);
        const s2 = this.state.stations.find(s => s.id === line.stations[i+1]);
        if (s1 && s2 && isSegmentCrossingWater(s1, s2, city)) {
          this.state.resources.tunnels++;
        }
      }

      line.trains.forEach(train => {
         const currentStationId = line.stations[Math.max(0, train.nextStationIndex - (train.direction === 1 ? 1 : 0))];
         const station = this.state.stations.find(s => s.id === currentStationId);
         if (station) station.waitingPassengers.push(...train.passengers);
      });

      this.state.resources.lines++;
      this.state.resources.trains += line.trains.length;
      this.state.lines.splice(lineIdx, 1);
      this.refreshAllPassengerRoutes();
    }
  }

  removeStationFromLine(lineId: number, stationId: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    if (!line) return;

    const stationIdx = line.stations.indexOf(stationId);
    if (stationIdx === -1) return;

    const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
    const prevId = line.stations[stationIdx - 1];
    const nextId = line.stations[stationIdx + 1];
    const prev = this.state.stations.find(s => s.id === prevId);
    const curr = this.state.stations.find(s => s.id === stationId);
    const next = this.state.stations.find(s => s.id === nextId);

    if (prev && curr && isSegmentCrossingWater(prev, curr, city)) this.state.resources.tunnels++;
    if (next && curr && isSegmentCrossingWater(next, curr, city)) this.state.resources.tunnels++;

    if (line.stations.length <= 2) {
      this.removeLine(lineId);
      return;
    }

    line.stations.splice(stationIdx, 1);
    if (prev && next && isSegmentCrossingWater(prev, next, city)) {
      this.state.resources.tunnels--;
    }

    line.trains.forEach(train => {
      if (train.nextStationIndex > stationIdx) {
        train.nextStationIndex--;
      } else if (train.nextStationIndex === stationIdx) {
        train.nextStationIndex = Math.min(stationIdx, line.stations.length - 1);
      }
    });

    this.refreshAllPassengerRoutes();
  }

  /**
   * Truncates a line from a specific segment based on proximity to head/tail.
   */
  removeSegment(lineId: number, idxA: number, idxB: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    if (!line) return;

    const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
    if (idxA < 0 || idxB >= line.stations.length) return;

    // Determine which end of the line to truncate based on which is closer to the segment
    const fromHead = idxA < (line.stations.length / 2) - 0.5;
    
    let stationsToRemove: number[] = [];
    if (fromHead) {
      // Remove everything from head (index 0) up to idxA
      stationsToRemove = line.stations.splice(0, idxA + 1);
      // Correct train indexes following removal from head
      line.trains.forEach(train => {
        train.nextStationIndex = Math.max(0, train.nextStationIndex - stationsToRemove.length);
        if (train.nextStationIndex < 0) {
            train.nextStationIndex = 0;
            train.progress = 0;
        }
      });
    } else {
      // Remove everything from idxB to the tail end
      stationsToRemove = line.stations.splice(idxB);
      // Bound trains to the new tail
      line.trains.forEach(train => {
        if (train.nextStationIndex >= idxB) {
          train.nextStationIndex = line.stations.length - 1;
          train.progress = 0;
        }
      });
    }

    // Recover tunnels for internal removed segments
    for (let i = 0; i < stationsToRemove.length - 1; i++) {
      const s1 = this.state.stations.find(s => s.id === stationsToRemove[i]);
      const s2 = this.state.stations.find(s => s.id === stationsToRemove[i+1]);
      if (s1 && s2 && isSegmentCrossingWater(s1, s2, city)) {
        this.state.resources.tunnels++;
      }
    }
    
    // Recover tunnel for the severed segment connection itself
    if (fromHead && line.stations.length > 0) {
        const sCut1 = this.state.stations.find(s => s.id === stationsToRemove[stationsToRemove.length-1]);
        const sCut2 = this.state.stations.find(s => s.id === line.stations[0]);
        if (sCut1 && sCut2 && isSegmentCrossingWater(sCut1, sCut2, city)) {
            this.state.resources.tunnels++;
        }
    } else if (!fromHead && line.stations.length > 0) {
        const sCut1 = this.state.stations.find(s => s.id === line.stations[line.stations.length-1]);
        const sCut2 = this.state.stations.find(s => s.id === stationsToRemove[0]);
        if (sCut1 && sCut2 && isSegmentCrossingWater(sCut1, sCut2, city)) {
            this.state.resources.tunnels++;
        }
    }

    // Cleanup line if it no longer has enough stations to form a route
    if (line.stations.length < 2) {
        this.removeLine(lineId);
    }
    this.refreshAllPassengerRoutes();
  }
}
