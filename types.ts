
export type StationType = 'circle' | 'square' | 'triangle' | 'pentagon' | 'star';
export type GameMode = 'NORMAL' | 'EXTREME' | 'ENDLESS' | 'CREATIVE';

export interface Point {
  x: number;
  y: number;
}

export interface ScoreAnimation {
  id: number;
  x: number;
  y: number;
  startTime: number;
  transferCount: number;
}

export interface Station extends Point {
  id: number;
  type: StationType;
  name: string;
  waitingPassengers: Passenger[];
  timer: number;
}

export interface Passenger {
  id: number;
  currentStationId: number;
  destinationShape: StationType;
  spawnTime: number;
  waitStartTime?: number;
  boardingHistory?: Array<{lineId: number, stationId: number, timestamp: number}>;
}

export interface TransitLine {
  id: number;
  color: string;
  stations: number[];
  trains: Train[];
}

export interface Train {
  id: number;
  lineId: number;
  nextStationIndex: number;
  progress: number;
  direction: 1 | -1;
  passengers: Passenger[];
  capacity: number;
  wagons: number;
}

export interface RewardChoice {
  id: string;
  label: string;
  description: string;
  bonus: {
    lines?: number;
    trains?: number;
    tunnels?: number;
    bridges?: number;
    wagons?: number;
  };
}

export interface City {
  id: string;
  name: string;
  color: string;
  center: { lat: number; lon: number };
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  water: { lat: number; lon: number }[][];
  initialStations: { id: number; type: StationType; lat: number; lon: number; name: string }[];
  difficulty: number;
}

export interface LogEntry {
  timestamp: number;
  score: number;
  stationCount: number;
  lineCount: number;
  trainCount: number;
  waitingTotal: number;
  resources: { lines: number; trains: number; tunnels: number; bridges: number; wagons: number };
}

export interface GameState {
  cityId: string;
  mode: GameMode;
  stations: Station[];
  lines: TransitLine[];
  score: number;
  level: number;
  gameActive: boolean;
  autoSpawn: boolean;
  dayNightAuto: boolean;
  isNightManual: boolean;
  timeScale: number;
  daysElapsed: number;
  nextRewardIn: number;
  resources: { lines: number; trains: number; tunnels: number; bridges: number; wagons: number };
  totalResources: { lines: number; trains: number; tunnels: number; bridges: number; wagons: number };
  weeklyAuditLog: any[];
  isPausedForReward: boolean;
  scoreAnimations: ScoreAnimation[];
  pendingRewardOptions?: RewardChoice[];
  passengerTimer: number;
  stationTimer: number;
  analytics: LogEntry[];
  // Added for Save/Resume continuity
  passengerIdCounter: number;
  stationIdCounter: number;
  lastSaved?: number;
}
