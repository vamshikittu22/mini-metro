import { 
  GameState, Station, TransitLine, Train, Passenger, StationType, City, RewardChoice, ScoreAnimation, LogEntry, LineSegment
} from '../types';
import { CITIES } from '../data/cities';
import { GAME_CONFIG, THEME, CITY_STATION_POOLS } from '../constants';
import { getDistance, isSegmentCrossingWater, project, WORLD_SIZE, isPointInPolygon } from './geometry';
import { InventoryManager } from './inventoryManager';
import { SystemValidator } from './validation';
import { HybridGreedyRouter } from './pathfinding/HybridGreedyRouter';
import { RouteEvaluator } from './pathfinding/RouteEvaluator';
import { HistoryManager, LineSnapshot } from './historyManager';

export class GameEngine {
  state: GameState;
  lastUpdate: number = 0;
  lastAuditTime: number = 0;
  lastLogTime: number = 0;
  lastCleanupTime: number = 0;
  prevStationCount: number = 0;
  simulationHistory: any[] = [];
  usedNames: Set<string> = new Set();
  router: HybridGreedyRouter;
  historyManager: HistoryManager;
  
  constructor(initialState: GameState) {
    this.state = {
      ...initialState,
      scoreAnimations: [],
      passengerIdCounter: initialState.passengerIdCounter || 0,
      stationIdCounter: initialState.stationIdCounter || 1000
    };
    
    this.usedNames = new Set();
    this.state.stations.forEach(s => this.usedNames.add(s.name));
    this.router = new HybridGreedyRouter();
    this.historyManager = new HistoryManager();
    this.prevStationCount = this.state.stations.length;

    // Migrate old lines without segments
    const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
    this.state.lines.forEach(line => {
      if (!line.segments) {
        line.segments = [];
        for (let i = 1; i < line.stations.length; i++) {
          const s1 = this.state.stations.find(s => s.id === line.stations[i - 1]);
          const s2 = this.state.stations.find(s => s.id === line.stations[i]);
          if (s1 && s2) {
            line.segments.push({ from: s1.id, to: s2.id, crossing: this.getCrossingType(s1, s2, city) });
          }
        }
      }
    });
  }

  private getCrossingType(s1: Station, s2: Station, city: City): 'tunnel' | 'bridge' | null {
    if (!isSegmentCrossingWater(s1, s2, city)) return null;
    // Consistent hash based on world coordinates
    return (s1.x + s1.y > s2.x + s2.y) ? 'tunnel' : 'bridge';
  }

  update(currentTime: number) {
    if (!this.state.gameActive || this.state.isPausedForReward) return;
    if (this.lastUpdate === 0) {
      this.lastUpdate = currentTime;
      this.lastAuditTime = currentTime;
      this.lastLogTime = currentTime;
      this.lastCleanupTime = currentTime;
      return;
    }

    // Clear RouteEvaluator cache on station count change
    if (this.state.stations.length !== this.prevStationCount) {
      RouteEvaluator.clearCache();
      this.router.clearCache();
      this.prevStationCount = this.state.stations.length;
    }

    const rawDt = currentTime - this.lastUpdate;
    this.lastUpdate = currentTime;
    const dt = Math.min(rawDt, 100) * this.state.timeScale;

    this.updateTime(dt);
    this.updateSpawning(dt);
    this.updateTrains(dt);
    this.updateStations(dt, currentTime);
    this.updateAnimations(currentTime);
    this.checkFailure();

    if (currentTime - this.lastAuditTime > 5000) {
      this.runAudit();
      this.lastAuditTime = currentTime;
    }

    if (currentTime - this.lastLogTime > 10000) {
      this.logAnalytics(currentTime);
      this.lastLogTime = currentTime;
    }
  }

  logAnalytics(timestamp: number) {
    const totalWaiting = this.state.stations.reduce((acc, s) => acc + s.waitingPassengers.length, 0);
    const entry: LogEntry = {
      timestamp,
      score: this.state.score,
      stationCount: this.state.stations.length,
      lineCount: this.state.lines.length,
      trainCount: this.state.lines.reduce((acc, l) => acc + l.trains.length, 0),
      waitingTotal: totalWaiting,
      resources: { ...this.state.resources }
    };
    this.state.analytics.push(entry);
  }

  updateSpawning(dt: number) {
    if (!this.state.autoSpawn) return;
    this.state.passengerTimer += dt;
    this.state.stationTimer += dt;
    const spawnRate = this.getDynamicSpawnRate();
    if (this.state.passengerTimer >= spawnRate) {
      this.spawnPassenger();
      this.state.passengerTimer = 0;
    }
    if (this.state.stationTimer >= GAME_CONFIG.stationSpawnRate) {
      this.spawnStation();
      this.state.stationTimer = 0;
    }
  }

  updateAnimations(currentTime: number) {
    // 1. Filter out expired animations (life: 1.2s)
    this.state.scoreAnimations = this.state.scoreAnimations.filter(anim => 
      currentTime - anim.startTime < 1200
    );

    // 2. Strict Performance Cap: Ensure the list does not exceed 100 entries
    if (this.state.scoreAnimations.length > 100) {
      this.state.scoreAnimations.splice(0, this.state.scoreAnimations.length - 100);
    }
  }

  runAudit() {
    const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
    SystemValidator.validateSystemState(this.state, city);
  }

  updateTime(dt: number) {
    this.state.daysElapsed += dt / 60000;
    if (this.state.daysElapsed >= 7 && Math.floor(this.state.daysElapsed % 7) === 0) {
      this.triggerWeeklyRewardCycle();
    }
  }

  triggerWeeklyRewardCycle() {
    this.state.isPausedForReward = true;
    this.state.level++;
    const options: RewardChoice[] = [
      { id: 'ext', label: 'Expansion Pack', description: '1 Line + 1 Locomotive', bonus: { lines: 1, trains: 1 } },
      { id: 'eng', label: 'Engineer Pack', description: '1 Locomotive + 2 Tunnels', bonus: { trains: 1, tunnels: 2 } },
      { id: 'hvy', label: 'Heavy Duty Pack', description: '1 Locomotive + 2 Wagons', bonus: { trains: 1, wagons: 2 } }
    ];
    this.state.pendingRewardOptions = [...options].sort(() => 0.5 - Math.random()).slice(0, 2);
  }

  selectReward(choice: RewardChoice) {
    InventoryManager.applyReward(this.state, choice.bonus);
    this.state.pendingRewardOptions = undefined;
    this.state.isPausedForReward = false;
  }

  getDynamicSpawnRate() {
    const baseRate = GAME_CONFIG.spawnRate;
    const levelFactor = 1 + (this.state.level - 1) * 0.2;
    return Math.max(800, baseRate / levelFactor);
  }

  tryConnectStations(lineIdx: number, startStation: Station, endStation: Station, city: City) {
    if (startStation.id === endStation.id) return lineIdx;
    let line = this.state.lines.find(l => l.id === lineIdx);
    
    const crossingType = this.getCrossingType(startStation, endStation, city);
    const segment: LineSegment = { from: startStation.id, to: endStation.id, crossing: crossingType };

    if (!line) {
      if (this.state.resources.lines > 0) {
        line = { 
          id: lineIdx, 
          color: THEME.lineColors[lineIdx], 
          stations: [startStation.id, endStation.id], 
          segments: [segment],
          trains: [] 
        };
        this.state.lines.push(line);
        this.addTrainToLine(lineIdx);
      }
    } else {
      if (line.stations[0] === startStation.id) {
        line.stations.unshift(endStation.id);
        line.segments.unshift({ from: endStation.id, to: startStation.id, crossing: crossingType });
      } else if (line.stations[line.stations.length - 1] === startStation.id) {
        line.stations.push(endStation.id);
        line.segments.push({ from: startStation.id, to: endStation.id, crossing: crossingType });
      }
    }
    RouteEvaluator.clearCache();
    this.router.clearCache();
    return lineIdx;
  }

  removeSegmentBetween(lineId: number, stationAId: number, stationBId: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    if (!line) return;
    const idxA = line.stations.indexOf(stationAId);
    const idxB = line.stations.indexOf(stationBId);
    if (idxA !== -1 && idxB !== -1 && Math.abs(idxA - idxB) === 1) {
      // Find segment
      const segIdx = line.segments.findIndex(seg => 
        (seg.from === stationAId && seg.to === stationBId) || 
        (seg.from === stationBId && seg.to === stationAId)
      );
      if (segIdx !== -1) line.segments.splice(segIdx, 1);
      
      // Remove station from array
      line.stations.splice(Math.max(idxA, idxB), 1);
    }
    if (line.stations.length < 2) this.removeLine(lineId);
    RouteEvaluator.clearCache();
    this.router.clearCache();
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
    const stationId = line.stations[train.nextStationIndex];
    const station = this.state.stations.find(s => s.id === stationId);
    if (!station) return;
    train.passengers = train.passengers.filter(p => p.destinationShape !== station.type);
    const capacity = GAME_CONFIG.trainCapacity * (1 + train.wagons);
    while (train.passengers.length < capacity && station.waitingPassengers.length > 0) {
      train.passengers.push(station.waitingPassengers.shift()!);
    }
    if (train.direction === 1) {
      if (train.nextStationIndex === line.stations.length - 1) { train.direction = -1; train.nextStationIndex--; }
      else train.nextStationIndex++;
    } else {
      if (train.nextStationIndex === 0) { train.direction = 1; train.nextStationIndex++; }
      else train.nextStationIndex--;
    }
  }

  updateStations(dt: number, currentTime: number) {
    // 1. Update overflow timers
    this.state.stations.forEach(station => {
      if (station.waitingPassengers.length >= GAME_CONFIG.maxPassengers - 1) station.timer = Math.min(1.0, station.timer + (dt / 40000));
      else station.timer = Math.max(0, station.timer - (dt / 20000));
    });

    // 2. Stranded Passenger Cleanup (every 10s)
    if (currentTime - this.lastCleanupTime > 10000) {
      this.state.stations.forEach(s => {
        s.waitingPassengers = s.waitingPassengers.filter(p => {
          const validLines = RouteEvaluator.findValidLines(s, p.destinationShape, this.state);
          // If no valid lines AND waited longer than 30s, clear them
          if (validLines.length === 0 && (Date.now() - p.spawnTime > 30000)) {
            return false;
          }
          return true;
        });
      });
      this.lastCleanupTime = currentTime;
    }
  }

  checkFailure() {
    if (this.state.mode !== 'ENDLESS' && this.state.stations.some(s => s.timer >= 1.0)) {
      this.state.gameActive = false;
    }
  }

  spawnPassenger() {
    if (this.state.stations.length < 2) return;
    const start = this.state.stations[Math.floor(Math.random() * this.state.stations.length)];
    const types = Array.from(new Set(this.state.stations.map(s => s.type))).filter(t => t !== start.type);
    if (types.length === 0) return;
    const id = this.state.passengerIdCounter++;
    start.waitingPassengers.push({ 
      id, 
      currentStationId: start.id, 
      destinationShape: types[Math.floor(Math.random() * types.length)] as StationType, 
      spawnTime: Date.now() 
    });
  }

  spawnStation() {
    const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
    const types: StationType[] = ['circle', 'triangle', 'square', 'pentagon', 'star'];
    const id = this.state.stationIdCounter++;
    const pos = { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE };
    this.state.stations.push({ id, type: types[Math.floor(Math.random() * types.length)], name: `Station ${id}`, x: pos.x, y: pos.y, waitingPassengers: [], timer: 0 });
    RouteEvaluator.clearCache();
    this.router.clearCache();
  }

  addTrainToLine(lineId: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    if (line) {
      line.trains.push({ id: Math.random(), lineId, nextStationIndex: 1, progress: 0, direction: 1, passengers: [], capacity: 6, wagons: 0 });
    }
  }

  removeLine(lineId: number) {
    const idx = this.state.lines.findIndex(l => l.id === lineId);
    if (idx !== -1) {
      this.state.lines.splice(idx, 1);
      RouteEvaluator.clearCache();
      this.router.clearCache();
    }
  }

  addWagonToTrain(lineId: number, trainId: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    const train = line?.trains.find(t => t.id === trainId);
    if (train) train.wagons++;
  }

  removeWagonFromTrain(lineId: number, trainId: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    const train = line?.trains.find(t => t.id === trainId);
    if (train && train.wagons > 0) train.wagons--;
  }

  removeTrainFromLine(lineId: number, trainId: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    if (line) {
      const idx = line.trains.findIndex(t => t.id === trainId);
      if (idx !== -1) line.trains.splice(idx, 1);
    }
  }
}