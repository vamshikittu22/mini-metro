
import { 
  GameState, Station, TransitLine, Train, Passenger, StationType, City, RewardChoice, ScoreAnimation, LogEntry
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
  passengerIdCounter: number = 0;
  stationIdCounter: number = 1000;
  lastAuditTime: number = 0;
  lastLogTime: number = 0;
  simulationHistory: any[] = [];
  usedNames: Set<string> = new Set();
  router: HybridGreedyRouter;
  historyManager: HistoryManager;
  
  constructor(initialState: GameState) {
    this.state = {
      ...initialState,
      scoreAnimations: [],
      passengerTimer: 0,
      stationTimer: 0,
      analytics: initialState.analytics || []
    };
    this.state.nextRewardIn = 60000 * 7; 
    this.usedNames = new Set();
    this.state.stations.forEach(s => this.usedNames.add(s.name));
    this.router = new HybridGreedyRouter();
    this.historyManager = new HistoryManager();
  }

  update(currentTime: number) {
    if (!this.state.gameActive || this.state.isPausedForReward) return;
    if (this.lastUpdate === 0) {
      this.lastUpdate = currentTime;
      this.lastAuditTime = currentTime;
      this.lastLogTime = currentTime;
      return;
    }
    const rawDt = currentTime - this.lastUpdate;
    this.lastUpdate = currentTime;
    const dt = Math.min(rawDt, 100) * this.state.timeScale;

    this.updateTime(dt);
    this.updateSpawning(dt);
    this.updateTrains(dt);
    this.updateStations(dt);
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
    // Extend life to 1.2s to accommodate easing
    this.state.scoreAnimations = this.state.scoreAnimations.filter(anim => 
      currentTime - anim.startTime < 1200
    );
  }

  runAudit() {
    const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
    SystemValidator.validateSystemState(this.state, city);
  }

  updateTime(dt: number) {
    const prevWeek = Math.floor(this.state.daysElapsed / 7);
    this.state.daysElapsed += dt / 60000;
    const currentWeek = Math.floor(this.state.daysElapsed / 7);

    if (currentWeek > prevWeek) {
      this.triggerWeeklyRewardCycle();
    }
  }

  triggerWeeklyRewardCycle() {
    const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
    
    this.simulationHistory.push({
      week: this.state.level,
      score: this.state.score,
      totalAssets: { ...this.state.totalResources },
      timestamp: Date.now()
    });

    this.state.isPausedForReward = true;
    this.state.level++;

    InventoryManager.validateInventory(this.state, city);

    const options: RewardChoice[] = [
      { id: 'ext', label: 'Expansion Pack', description: '1 Line + 1 Locomotive', bonus: { lines: 1, trains: 1 } },
      { id: 'eng', label: 'Engineer Pack', description: '1 Locomotive + 2 Tunnels', bonus: { trains: 1, tunnels: 2 } },
      { id: 'hvy', label: 'Heavy Duty Pack', description: '1 Locomotive + 2 Wagons', bonus: { trains: 1, wagons: 2 } },
      { id: 'riv', label: 'River Support', description: '2 Tunnels + 2 Bridges', bonus: { tunnels: 2, bridges: 2 } }
    ];

    const shuffled = [...options].sort(() => 0.5 - Math.random());
    this.state.pendingRewardOptions = [shuffled[0], shuffled[1]];
  }

  selectReward(choice: RewardChoice) {
    InventoryManager.applyReward(this.state, choice.bonus);
    this.state.pendingRewardOptions = undefined;
    this.state.isPausedForReward = false;
    this.runAudit();
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

  tryConnectStations(lineIdx: number, startStation: Station, endStation: Station, city: City) {
    if (startStation.id === endStation.id) return lineIdx;
    const isCreative = this.state.mode === 'CREATIVE';

    let line = this.state.lines.find(l => l.stations[0] === startStation.id || l.stations[l.stations.length - 1] === startStation.id);
    let targetLineId = line ? line.id : -1;
    if (targetLineId === -1) {
      const usedIds = new Set(this.state.lines.map(l => l.id));
      for(let i=0; i<10; i++) { if(!usedIds.has(i)) { targetLineId = i; break; } }
    }

    const crossesWater = isSegmentCrossingWater(startStation, endStation, city);
    if (crossesWater && !isCreative) {
      const totalAvailable = this.state.resources.tunnels + this.state.resources.bridges;
      if (totalAvailable <= 0) return lineIdx;
    }

    // Capture state before modification
    this.historyManager.push(this.state.lines);

    if (!line) {
      if (this.state.resources.lines > 0 || isCreative) {
        if (targetLineId !== -1) {
          lineIdx = targetLineId;
          line = { id: lineIdx, color: THEME.lineColors[lineIdx], stations: [startStation.id, endStation.id], trains: [] };
          this.state.lines.push(line);
          this.addTrainToLine(lineIdx);
        } else {
            // Revert history if we failed to create line
            this.historyManager.undo(this.state.lines);
            return lineIdx;
        }
      } else {
          this.historyManager.undo(this.state.lines);
          return lineIdx;
      }
    } else {
      const alreadyContainsEnd = line.stations.includes(endStation.id);
      const isClosingLoop = (line.stations[0] === startStation.id && line.stations[line.stations.length - 1] === endStation.id) ||
                            (line.stations[line.stations.length - 1] === startStation.id && line.stations[0] === endStation.id);
      
      const uniqueCount = new Set(line.stations).size;
      if (isClosingLoop && uniqueCount < 3) {
          this.historyManager.undo(this.state.lines);
          return lineIdx;
      }
      if (alreadyContainsEnd && !isClosingLoop) {
          this.historyManager.undo(this.state.lines);
          return lineIdx;
      }

      if (line.stations[0] === startStation.id) {
        line.stations.unshift(endStation.id);
        line.trains.forEach(train => train.nextStationIndex++);
      } else if (line.stations[line.stations.length - 1] === startStation.id) {
        line.stations.push(endStation.id);
      }
      lineIdx = line.id;
    }

    InventoryManager.validateInventory(this.state, city);
    RouteEvaluator.clearCache();
    return lineIdx;
  }

  removeSegmentBetween(lineId: number, stationAId: number, stationBId: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    if (!line) return;
    const idxA = line.stations.indexOf(stationAId);
    const idxB = line.stations.indexOf(stationBId);
    if (idxA === -1 || idxB === -1 || Math.abs(idxA - idxB) !== 1) return;

    // Capture state before modification
    this.historyManager.push(this.state.lines);

    const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
    const firstIdx = Math.min(idxA, idxB);
    
    const head = line.stations.slice(0, firstIdx + 1);
    const tail = line.stations.slice(firstIdx + 1);

    if (firstIdx === 0) {
      line.stations = tail;
      line.trains.forEach(t => t.nextStationIndex = Math.max(0, t.nextStationIndex - 1));
    } else if (firstIdx === line.stations.length - 2) {
      line.stations = head;
      line.trains.forEach(t => {
        if (t.nextStationIndex >= line.stations.length) t.nextStationIndex = line.stations.length - 1;
      });
    } else {
      if (this.state.resources.lines > 0 || this.state.mode === 'CREATIVE') {
        line.stations = head;
        const usedIds = new Set(this.state.lines.map(l => l.id));
        let nextId = -1;
        for(let i=0; i<10; i++) { if(!usedIds.has(i)) { nextId = i; break; } }
        
        if (nextId !== -1) {
          const newLine: TransitLine = { 
            id: nextId, 
            color: THEME.lineColors[nextId], 
            stations: tail, 
            trains: [] 
          };
          this.state.lines.push(newLine);
          this.addTrainToLine(nextId);
        }
      } else {
        line.stations = head;
      }
    }

    if (line.stations.length < 2) {
      this.removeLine(lineId, false); // Don't record history here, we already did
    }
    
    InventoryManager.validateInventory(this.state, city);
    RouteEvaluator.clearCache();
  }

  updateTrains(dt: number) {
    this.state.lines.forEach(line => {
      line.trains.forEach(train => {
        if (line.stations.length < 2) return;
        train.progress += GAME_CONFIG.trainSpeed * (dt / 16);
        if (train.progress >= 1) { train.progress = 0; this.handleTrainAtStation(train, line); }
      });
    });
  }

  /**
   * Comprehensive handler for train station stops using the HybridGreedyRouter.
   * Processes Alighting, Boarding, and Stranded checks.
   */
  handleTrainAtStation(train: Train, line: TransitLine) {
    const stationId = line.stations[train.nextStationIndex];
    const station = this.state.stations.find(s => s.id === stationId);
    if (!station) return;

    // --- PHASE 1: ALIGHT PASSENGERS ---
    train.passengers = train.passengers.filter(p => {
      const decision = this.router.shouldPassengerAlight(p, station, train, this.state);
      
      if (decision.action === 'DELIVER') {
        this.state.score++;
        
        // Calculate transfers: history length - 1 (initial board). Default to 0 if history missing.
        const transferCount = (p.boardingHistory?.length || 1) - 1;
        
        // Add minimal jitter to stacking animations so they don't perfectly overlap
        const jitterX = (Math.random() * 16) - 8;
        const jitterY = (Math.random() * 16) - 8;

        this.state.scoreAnimations.push({ 
          id: Math.random(), 
          x: station.x + jitterX, 
          y: station.y + jitterY, 
          startTime: Date.now(),
          transferCount: Math.max(0, transferCount)
        });
        return false; // Remove from train
      } else if (decision.action === 'TRANSFER') {
        this.router.resetWaitTimer(p);
        p.currentStationId = station.id;
        station.waitingPassengers.push(p);
        return false; // Remove from train
      }
      return true; // Stay on train (action === 'STAY')
    });

    // --- PHASE 2: BOARD PASSENGERS ---
    const totalCapacity = GAME_CONFIG.trainCapacity * (1 + train.wagons);
    let availableSpace = totalCapacity - train.passengers.length;
    
    if (availableSpace > 0) {
      const stillWaiting: Passenger[] = [];

      for (const p of station.waitingPassengers) {
        if (availableSpace > 0) {
          const decision = this.router.shouldPassengerBoard(p, train, station, this.state);
          if (decision.shouldBoard) {
            this.router.resetWaitTimer(p);
            p.boardingHistory = p.boardingHistory || [];
            p.boardingHistory.push({ 
              lineId: train.lineId, 
              stationId: station.id, 
              timestamp: Date.now() 
            });
            train.passengers.push(p);
            availableSpace--;
            continue; // Passenger boarded, don't add to stillWaiting
          }
        }
        stillWaiting.push(p);
      }
      station.waitingPassengers = stillWaiting;
    }

    // --- PHASE 3: CHECK STRANDED PASSENGERS ---
    station.waitingPassengers = station.waitingPassengers.filter(p => {
      const isStranded = this.router.isPassengerStranded(p, station, this.state);
      if (isStranded) {
        if (this.state.mode !== 'CREATIVE') {
          console.warn(`[ROUTING] Passenger ${p.id} removed from ${station.name} - no valid path to ${p.destinationShape}`);
        }
        return false; // Remove stranded passenger
      }
      return true; // Keep
    });

    // --- TRAIN PROGRESSION ---
    // Advance next station index based on current direction
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

  updateStations(dt: number) {
    if (this.state.mode === 'CREATIVE') return;
    this.state.stations.forEach(station => {
      if (station.waitingPassengers.length >= GAME_CONFIG.maxPassengers - 1) station.timer = Math.min(1.0, station.timer + (dt / 40000));
      else station.timer = Math.max(0, station.timer - (dt / 20000));
    });
  }

  checkFailure() {
    if (this.state.mode === 'ENDLESS' || this.state.mode === 'CREATIVE') return;
    if (this.state.stations.some(s => s.timer >= 1.0)) this.state.gameActive = false;
  }

  private getUniqueName(cityId: string): string {
    const pool = CITY_STATION_POOLS[cityId] || CITY_STATION_POOLS['london'];
    let baseCandidate = pool[Math.floor(Math.random() * pool.length)];
    let candidate = baseCandidate;
    let suffix = 1;
    
    while (this.usedNames.has(candidate)) {
      suffix++;
      const roman = this.toRoman(suffix);
      candidate = `${baseCandidate} ${roman}`.trim();
      if (suffix > 50) break;
    }
    
    this.usedNames.add(candidate);
    return candidate;
  }

  private toRoman(num: number): string {
    if (num <= 1) return "";
    const lookup: Record<string, number> = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1};
    let roman = '';
    for (let i in lookup) {
      while (num >= lookup[i]) {
        roman += i;
        num -= lookup[i];
      }
    }
    return roman;
  }

  spawnPassenger() {
    if (!this.state.gameActive || this.state.stations.length < 2) return;
    const start = this.state.stations[Math.floor(Math.random() * this.state.stations.length)];
    const types = Array.from(new Set(this.state.stations.map(s => s.type))).filter(t => t !== start.type);
    if (types.length === 0) return;
    const p: Passenger = { 
      id: this.passengerIdCounter++, 
      currentStationId: start.id,
      destinationShape: types[Math.floor(Math.random() * types.length)] as StationType, 
      spawnTime: Date.now() 
    };
    start.waitingPassengers.push(p);
  }

  spawnStation() {
    const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
    const types: StationType[] = ['circle', 'triangle', 'square', 'pentagon', 'star'];
    const screenPadding = 450; 
    
    const activeTrains = this.state.lines.reduce((acc, l) => acc + l.trains.length, 0);
    const totalWaterResources = this.state.totalResources.tunnels + this.state.totalResources.bridges;
    const availableWaterResources = this.state.resources.tunnels + this.state.resources.bridges;
    
    const diffMult = 1 / (city.difficulty * GAME_CONFIG.spawnRatios.difficultyMultiplier);
    const maxStationsGlobal = Math.max(5, activeTrains * GAME_CONFIG.spawnRatios.stationsPerTrain * diffMult);
    
    if (this.state.stations.length >= maxStationsGlobal && this.state.mode !== 'CREATIVE') return;

    const waterPolygons = city.water.map(poly => poly.map(pt => project(pt.lat, pt.lon, city)));
    const currentWaterStations = this.state.stations.filter(s => 
      waterPolygons.some(poly => isPointInPolygon(s, poly))
    ).length;
    
    const maxIsolatedStations = totalWaterResources * GAME_CONFIG.spawnRatios.stationsPerWaterResource * diffMult;
    const allowWaterSpawn = this.state.mode === 'CREATIVE' || (availableWaterResources > 0 && currentWaterStations < maxIsolatedStations);

    for (let i = 0; i < 60; i++) {
      const r1 = Math.random();
      const r2 = Math.random();
      
      const lat = city.bounds.minLat + (r1 * (city.bounds.maxLat - city.bounds.minLat));
      const lon = city.bounds.minLon + (r2 * (city.bounds.maxLon - city.bounds.minLon));
      const pos = project(lat, lon, city);

      if (pos.x < screenPadding || pos.x > WORLD_SIZE - screenPadding || 
          pos.y < screenPadding || pos.y > WORLD_SIZE - screenPadding) {
        continue;
      }

      const inWater = waterPolygons.some(poly => isPointInPolygon(pos, poly));
      if (inWater && !allowWaterSpawn) continue;

      if (this.state.stations.every(s => getDistance(s, pos) > 190)) {
        this.state.stations.push({ 
          id: this.stationIdCounter++, 
          type: types[Math.floor(Math.random() * types.length)], 
          name: this.getUniqueName(this.state.cityId), 
          x: pos.x, 
          y: pos.y, 
          waitingPassengers: [], 
          timer: 0 
        });
        break;
      }
    }
  }

  addTrainToLine(lineId: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    if (line && (this.state.resources.trains > 0 || this.state.mode === 'CREATIVE')) {
      line.trains.push({ 
        id: Math.random(), 
        lineId, 
        nextStationIndex: 1, 
        progress: 0, 
        direction: 1, 
        passengers: [], 
        capacity: GAME_CONFIG.trainCapacity, 
        wagons: 0 
      });
      const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
      InventoryManager.validateInventory(this.state, city);
    }
  }

  removeTrainFromLine(lineId: number, trainId: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    if (!line) return;
    const idx = line.trains.findIndex(t => t.id === trainId);
    if (idx !== -1) {
      line.trains.splice(idx, 1);
      const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
      InventoryManager.validateInventory(this.state, city);
    }
  }

  addWagonToTrain(lineId: number, trainId: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    if (!line) return;
    const train = line.trains.find(t => t.id === trainId);
    if (train && (this.state.resources.wagons > 0 || this.state.mode === 'CREATIVE')) {
      train.wagons++;
      const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
      InventoryManager.validateInventory(this.state, city);
    }
  }

  removeWagonFromTrain(lineId: number, trainId: number) {
    const line = this.state.lines.find(l => l.id === lineId);
    if (!line) return;
    const train = line.trains.find(t => t.id === trainId);
    if (train && train.wagons > 0) {
      train.wagons--;
      const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
      InventoryManager.validateInventory(this.state, city);
    }
  }

  removeLine(lineId: number, recordHistory: boolean = true) {
    if (recordHistory) {
      this.historyManager.push(this.state.lines);
    }

    const idx = this.state.lines.findIndex(l => l.id === lineId);
    if (idx !== -1) {
      this.state.lines.splice(idx, 1);
      const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
      InventoryManager.validateInventory(this.state, city);
      RouteEvaluator.clearCache();
    }
  }

  undo(): string | null {
    const snapshot = this.historyManager.undo(this.state.lines);
    if (snapshot) {
      this.restoreLines(snapshot);
      return "Undid line change";
    }
    return null;
  }

  redo(): string | null {
    const snapshot = this.historyManager.redo(this.state.lines);
    if (snapshot) {
      this.restoreLines(snapshot);
      return "Redid line change";
    }
    return null;
  }

  private restoreLines(snapshot: LineSnapshot[]) {
    // Map existing trains to keep them if possible (Preserve train state)
    const trainMap = new Map<number, Train[]>();
    this.state.lines.forEach(l => trainMap.set(l.id, l.trains));

    // Rebuild lines from snapshot
    this.state.lines = snapshot.map(snap => {
      let existingTrains = trainMap.get(snap.id) || [];
      
      // Safety check: ensure trains on restored/modified lines have valid indices
      existingTrains.forEach(t => {
        if (t.nextStationIndex >= snap.stations.length) {
          t.nextStationIndex = Math.max(0, snap.stations.length - 1);
          t.progress = 0; // Reset progress if route changed significantly
        }
      });
      
      return {
        id: snap.id,
        color: snap.color,
        stations: snap.stations,
        trains: existingTrains
      };
    });

    // Recalculate inventory
    const city = CITIES.find(c => c.id === this.state.cityId) || CITIES[0];
    InventoryManager.validateInventory(this.state, city);
    RouteEvaluator.clearCache();
  }
}
