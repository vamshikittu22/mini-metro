
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
    this.state.remainingTime -= dt;
    
    if (this.state.nextRewardIn <= 0) {
      this.giveReward();
      this.state.nextRewardIn = 60000;
    }
  }

  updateLevel() {
    // Level up based on score or time
    const newLevel = Math.floor(this.state.score / 150) + 1;
    if (newLevel > this.state.level) {
      this.state.level = newLevel;
    }
  }

  giveReward() {
    this.state.resources.lines += 1;
    this.state.resources.trains += 1;
    this.state.resources.tunnels += 1;
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

    // Unload
    train.passengers = train.passengers.filter(p => {
      if (p.targetType === station.type) {
        this.state.score++;
        return false;
      }
      return true;
    });

    const availableSpace = train.capacity - train.passengers.length;
    if (availableSpace > 0 && station.waitingPassengers.length > 0) {
      const toLoad = station.waitingPassengers.splice(0, availableSpace);
      train.passengers.push(...toLoad);
    }

    // Loop logic
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
        station.timer += dt / THEME.timerThreshold;
      } else {
        station.timer = Math.max(0, station.timer - dt / (THEME.timerThreshold * 2));
      }
    });
  }

  checkFailure() {
    // Gridlock failure
    if (this.state.stations.some(s => s.timer >= 1)) {
      this.state.gameActive = false;
      this.saveHighScore();
    }
    // Time out failure
    if (this.state.remainingTime <= 0) {
      this.state.gameActive = false;
      this.saveHighScore();
    }
  }

  saveHighScore() {
    const key = `high_score_${this.state.cityId}`;
    const current = parseInt(localStorage.getItem(key) || '0');
    if (this.state.score > current) {
      localStorage.setItem(key, this.state.score.toString());
    }
  }

  getDynamicSpawnRate() {
    // Scaling based on level
    const levelMultiplier = 1 + (this.state.level * 0.25);
    const difficultyMultiplier = levelMultiplier + (this.state.daysElapsed * 0.1);
    return Math.max(600, GAME_CONFIG.spawnRate / difficultyMultiplier);
  }

  spawnPassenger() {
    if (!this.state.gameActive || this.state.stations.length < 2) return;
    const startStation = this.state.stations[Math.floor(Math.random() * this.state.stations.length)];
    const availableTypes = Array.from(new Set(this.state.stations.map(s => s.type))).filter(t => t !== startStation.type);
    if (availableTypes.length === 0) return;

    const sortedTypes = availableTypes.map(type => {
      const closestStation = this.state.stations
        .filter(s => s.type === type)
        .reduce((prev, curr) => getDistance(startStation, curr) < getDistance(startStation, prev) ? curr : prev);
      return { type, dist: getDistance(startStation, closestStation) };
    }).sort((a, b) => a.dist - b.dist);

    const targetType = Math.random() < 0.6 ? sortedTypes[0].type : sortedTypes[Math.floor(Math.random() * sortedTypes.length)].type;
    startStation.waitingPassengers.push({
      id: this.passengerIdCounter++,
      targetType,
      spawnTime: performance.now()
    });
  }

  spawnStation(width: number, height: number, projectFn: any) {
    if (!this.state.gameActive) return;
    const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
    
    // As level increases, add more station types to the pool
    const allTypes: StationType[] = ['circle', 'square', 'triangle', 'pentagon', 'star'];
    const typePoolCount = Math.min(allTypes.length, 2 + this.state.level);
    const availableTypes = allTypes.slice(0, typePoolCount);

    for (let attempt = 0; attempt < 30; attempt++) {
      // Station spawning spreads out more as level increases
      const spawnScale = 0.45 + (this.state.level * 0.05);
      const range = Math.min(0.9, spawnScale);
      
      const lat = city.bounds.minLat + (0.5 - range/2 + Math.random() * range) * (city.bounds.maxLat - city.bounds.minLat);
      const lon = city.bounds.minLon + (0.5 - range/2 + Math.random() * range) * (city.bounds.maxLon - city.bounds.minLon);
      const pos = projectFn(lat, lon, city);
      
      const isTooCloseToStation = this.state.stations.some(s => getDistance(s, pos) < 80);
      if (isTooCloseToStation) continue;

      let isTooCloseToLine = false;
      for (const line of this.state.lines) {
        for (let i = 0; i < line.stations.length - 1; i++) {
          const s1 = this.state.stations.find(s => s.id === line.stations[i]);
          const s2 = this.state.stations.find(s => s.id === line.stations[i+1]);
          if (s1 && s2 && distToSegment(pos, s1, s2) < 50) {
            isTooCloseToLine = true;
            break;
          }
        }
        if (isTooCloseToLine) break;
      }
      if (isTooCloseToLine) continue;

      const names = ['Canary Wharf', 'Paddington', 'Euston', 'Stratford', 'Bond St', 'Angel', 'Oxford Circus', 'Leicester Sq', 'Shibuya', 'Harajuku', 'Ginza', 'Manhattan', 'Brooklyn', 'Queens', 'Alexanderplatz', 'Kreuzberg', 'Mitte', 'Potsdamer Platz'];
      
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
         if (station) {
           station.waitingPassengers.push(...train.passengers);
         }
      });

      this.state.resources.lines++;
      this.state.resources.trains += line.trains.length;
      this.state.lines.splice(lineIdx, 1);
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
  }

  removeSegment(lineId: number, idxA: number, idxB: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    if (!line) return;

    const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
    if (idxA < 0 || idxB >= line.stations.length) return;

    const stationsToRemove = line.stations.splice(idxB);
    const s1 = this.state.stations.find(s => s.id === line.stations[idxA]);
    const s2 = this.state.stations.find(s => s.id === stationsToRemove[0]);
    
    if (s1 && s2 && isSegmentCrossingWater(s1, s2, city)) {
      this.state.resources.tunnels++;
    }

    stationsToRemove.forEach((id, i) => {
       if (i < stationsToRemove.length - 1) {
         const rs1 = this.state.stations.find(s => s.id === stationsToRemove[i]);
         const rs2 = this.state.stations.find(s => s.id === stationsToRemove[i+1]);
         if (rs1 && rs2 && isSegmentCrossingWater(rs1, rs2, city)) this.state.resources.tunnels++;
       }
    });

    line.trains.forEach(train => {
      if (train.nextStationIndex >= idxB) {
        train.nextStationIndex = idxA;
        train.progress = 0;
        train.direction = -1;
      }
    });

    if (line.stations.length < 2) this.removeLine(lineId);
  }
}
