import { 
  GameState, Station, TransitLine, Train, Passenger, StationType, CITIES, City 
} from '../types';
import { GAME_CONFIG, THEME } from '../constants';
import { getDistance, isSegmentCrossingWater, project } from './geometry';

export class GameEngine {
  state: GameState;
  lastUpdate: number = 0;
  passengerIdCounter: number = 0;
  stationIdCounter: number = 1000;
  
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
    this.state.resources.bridges += 1;
    this.state.resources.wagons += 3;
  }

  getDynamicSpawnRate() {
    const baseRate = GAME_CONFIG.spawnRate;
    const levelFactor = 1 + (this.state.level - 1) * 0.2;
    const timeFactor = 1 + (this.state.daysElapsed / 28);
    let modeFactor = 1.0;
    if (this.state.mode === 'EXTREME') modeFactor = 1.5;
    if (this.state.mode === 'CREATIVE') modeFactor = 0.5;
    
    return Math.max(800, (baseRate / (levelFactor * timeFactor)) / modeFactor);
  }

  findNextLeg(currentStationId: number, targetType: StationType): { lineId: number, transferStationId: number } | null {
    const stations = this.state.stations;
    const lines = this.state.lines;
    if (lines.length === 0) return null;

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
    const path: number[] = [];
    let curr = foundTargetStationId;
    while (curr !== currentStationId) {
      path.push(curr);
      const pData = parent.get(curr);
      if (!pData) break;
      curr = pData.from;
    }
    path.push(currentStationId);
    path.reverse();

    if (path.length < 2) return null;
    const firstLegData = parent.get(path[1]);
    if (!firstLegData) return null;
    const firstStepLineId = firstLegData.lineId;
    
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

    // Alighting
    const alighting: Passenger[] = [];
    train.passengers = train.passengers.filter(p => {
      if (p.targetType === station.type) {
        this.state.score++;
        return false;
      }
      if (station.id === p.nextTransferStationId) {
        p.requiredLineId = undefined;
        p.nextTransferStationId = undefined;
        alighting.push(p);
        return false;
      }
      return true;
    });
    station.waitingPassengers.push(...alighting);

    // Boarding
    station.waitingPassengers.forEach(p => {
      if (p.requiredLineId === undefined || p.nextTransferStationId === undefined) {
        const leg = this.findNextLeg(station.id, p.targetType);
        if (leg) {
          p.requiredLineId = leg.lineId;
          p.nextTransferStationId = leg.transferStationId;
        }
      }
    });

    const totalCapacity = GAME_CONFIG.trainCapacity * (1 + train.wagons);
    const availableSpace = totalCapacity - train.passengers.length;
    if (availableSpace > 0 && station.waitingPassengers.length > 0) {
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
        if (train.nextStationIndex === line.stations.length - 1) train.nextStationIndex = 1;
        else train.nextStationIndex++;
      } else {
        if (train.nextStationIndex === 0) train.nextStationIndex = line.stations.length - 2;
        else train.nextStationIndex--;
      }
    } else {
      if (train.direction === 1) {
        if (train.nextStationIndex === line.stations.length - 1) {
          train.direction = -1;
          train.nextStationIndex--;
        } else train.nextStationIndex++;
      } else {
        if (train.nextStationIndex === 0) {
          train.direction = 1;
          train.nextStationIndex++;
        } else train.nextStationIndex--;
      }
    }
    train.nextStationIndex = Math.max(0, Math.min(train.nextStationIndex, line.stations.length - 1));
  }

  updateStations(dt: number) {
    if (this.state.mode === 'CREATIVE') {
      this.state.stations.forEach(s => s.timer = 0);
      return;
    }

    const timerSpeed = this.state.mode === 'EXTREME' ? 1.5 : 1.0;

    this.state.stations.forEach(station => {
      if (station.waitingPassengers.length >= GAME_CONFIG.maxPassengers) {
        station.timer = Math.min(1.0, station.timer + (dt / (THEME.timerThreshold * 4)) * timerSpeed);
      } else {
        station.timer = Math.max(0, station.timer - (dt / (THEME.timerThreshold * 2)));
      }
    });
  }

  checkFailure() {
    if (this.state.mode === 'ENDLESS' || this.state.mode === 'CREATIVE') return;

    const failingStation = this.state.stations.find(s => s.timer >= 1.0);
    if (failingStation && this.state.gameActive) {
      this.state.gameActive = false;
    }
  }

  // Fix: Line 256 error. Corrected 't.type' to 's.type' in the map function to fix 'Cannot find name t'.
  spawnPassenger() {
    if (!this.state.gameActive || !this.state.autoSpawn || this.state.stations.length < 2) return;
    const startStation = this.state.stations[Math.floor(Math.random() * this.state.stations.length)];
    const availableTypes = Array.from(new Set(this.state.stations.map(s => s.type))).filter(t => t !== startStation.type);
    if (availableTypes.length === 0) return;
    const targetType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const p: Passenger = { id: this.passengerIdCounter++, targetType, spawnTime: performance.now() };
    const leg = this.findNextLeg(startStation.id, targetType);
    if (leg) { p.requiredLineId = leg.lineId; p.nextTransferStationId = leg.transferStationId; }
    startStation.waitingPassengers.push(p);
  }

  refreshAllPassengerRoutes() {
    this.state.stations.forEach(s => {
      s.waitingPassengers.forEach(p => {
        const leg = this.findNextLeg(s.id, p.targetType);
        if (leg) { p.requiredLineId = leg.lineId; p.nextTransferStationId = leg.transferStationId; }
        else { p.requiredLineId = undefined; p.nextTransferStationId = undefined; }
      });
    });
  }

  spawnStation(width: number, height: number, projectFn: any) {
    if (!this.state.gameActive || !this.state.autoSpawn) return;
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

      const names = ['Ginza', 'Shibuya', 'Broadway', 'Wall St', 'Piccadilly', 'Oxford', 'Kreuzberg', 'Mitte', 'Orchard', 'Newton', 'Westminster', 'Soho', 'Harajuku', 'Shinjuku', 'Brooklyn', 'Chelsea', 'Montmartre', 'Bastille'];
      this.state.stations.push({
        id: this.stationIdCounter++,
        type: availableTypes[Math.floor(Math.random() * availableTypes.length)],
        name: `${names[Math.floor(Math.random()*names.length)]}`,
        x: pos.x, y: pos.y, waitingPassengers: [], timer: 0
      });
      break;
    }
  }

  addManualStation(type: StationType, x: number, y: number) {
    if (this.state.mode !== 'CREATIVE') return;
    const names = ['Terminal', 'Plaza', 'Point', 'Hub', 'Nexus', 'Quarter', 'Gardens', 'Park', 'Street', 'Road', 'Avenue', 'Central', 'Bridge', 'Tower'];
    this.state.stations.push({
      id: this.stationIdCounter++,
      type,
      name: `${names[Math.floor(Math.random()*names.length)]}`,
      x, y, waitingPassengers: [], timer: 0
    });
  }

  removeStation(id: number) {
    const sIdx = this.state.stations.findIndex(s => s.id === id);
    if (sIdx === -1) return;

    // Cleanup lines that include this station
    const linesToCleanup = this.state.lines.filter(l => l.stations.includes(id));
    linesToCleanup.forEach(line => {
      const sPos = line.stations.indexOf(id);
      if (sPos !== -1) {
        // Simple logic: if station is in middle, remove line or break?
        // Mini Metro behavior: remove station from line and reconnect ends
        line.stations.splice(sPos, 1);
        if (line.stations.length < 2) {
          this.removeLine(line.id);
        }
      }
    });

    this.state.stations.splice(sIdx, 1);
    this.refreshAllPassengerRoutes();
  }

  addTrainToLine(lineId: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    if (line && (this.state.resources.trains > 0 || this.state.mode === 'CREATIVE')) {
      line.trains.push({
        id: Date.now() + Math.random(),
        lineId: lineId,
        nextStationIndex: 1,
        progress: 0,
        direction: 1,
        passengers: [],
        capacity: GAME_CONFIG.trainCapacity,
        wagons: 0
      });
      if (this.state.mode !== 'CREATIVE') this.state.resources.trains--;
    }
  }

  removeTrainFromLine(lineId: number, trainId: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    if (!line) return;
    const idx = line.trains.findIndex(t => t.id === trainId);
    if (idx !== -1) {
      const train = line.trains[idx];
      if (this.state.mode !== 'CREATIVE') {
        this.state.resources.trains++;
        this.state.resources.wagons += train.wagons;
      }
      // Re-route passengers back to nearest station
      const station = this.state.stations.find(s => s.id === line.stations[train.nextStationIndex]);
      if (station) station.waitingPassengers.push(...train.passengers);
      line.trains.splice(idx, 1);
    }
  }

  addWagonToTrain(lineId: number, trainId: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    if (!line) return;
    const train = line.trains.find(t => t.id === trainId);
    if (train && (this.state.resources.wagons > 0 || this.state.mode === 'CREATIVE')) {
      train.wagons++;
      if (this.state.mode !== 'CREATIVE') this.state.resources.wagons--;
    }
  }

  removeWagonFromTrain(lineId: number, trainId: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    if (!line) return;
    const train = line.trains.find(t => t.id === trainId);
    if (train && train.wagons > 0) {
      train.wagons--;
      if (this.state.mode !== 'CREATIVE') this.state.resources.wagons++;
    }
  }

  removeLine(lineId: number) {
    const lineIdx = this.state.lines.findIndex(l => l.id === lineId);
    if (lineIdx !== -1) {
      const line = this.state.lines[lineIdx];
      const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
      
      // Reclaim tunnels/bridges if not in creative
      if (this.state.mode !== 'CREATIVE') {
        for (let i = 0; i < line.stations.length - 1; i++) {
          const s1 = this.state.stations.find(s => s.id === line.stations[i]);
          const s2 = this.state.stations.find(s => s.id === line.stations[i+1]);
          if (s1 && s2 && isSegmentCrossingWater(s1, s2, city)) {
            if (line.id % 2 === 0) this.state.resources.tunnels++;
            else this.state.resources.bridges++;
          }
        }
        this.state.resources.lines++;
        line.trains.forEach(t => {
          this.state.resources.trains++;
          this.state.resources.wagons += t.wagons;
        });
      }

      this.state.lines.splice(lineIdx, 1);
      this.refreshAllPassengerRoutes();
    }
  }

  removeSegment(lineId: number, idxA: number, idxB: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    if (!line) return;
    
    const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
    const s1 = this.state.stations.find(s => s.id === line.stations[idxA]);
    const s2 = this.state.stations.find(s => s.id === line.stations[idxB]);
    
    if (s1 && s2 && isSegmentCrossingWater(s1, s2, city) && this.state.mode !== 'CREATIVE') {
      if (line.id % 2 === 0) this.state.resources.tunnels++;
      else this.state.resources.bridges++;
    }

    line.stations.splice(idxB, 1);
    if (line.stations.length < 2) this.removeLine(lineId);
    else this.refreshAllPassengerRoutes();
  }
}