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
  targetType: StationType;
  spawnTime: number;
  nextTransferStationId?: number;
  requiredLineId?: number;
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
}

export const CITIES: City[] = [
  {
    id: 'london', name: 'London', color: '#019AD1', center: { lat: 51.5074, lon: -0.1278 }, difficulty: 1.0,
    bounds: { minLat: 51.45, maxLat: 51.55, minLon: -0.25, maxLon: 0.05 },
    water: [
      // The River Thames - detailed winding path through central London
      [
        { lat: 51.485, lon: -0.30 }, { lat: 51.487, lon: -0.25 }, { lat: 51.478, lon: -0.22 }, 
        { lat: 51.485, lon: -0.18 }, { lat: 51.482, lon: -0.14 }, { lat: 51.505, lon: -0.12 }, 
        { lat: 51.510, lon: -0.10 }, { lat: 51.505, lon: -0.06 }, { lat: 51.498, lon: -0.02 }, 
        { lat: 51.492, lon: 0.02 }, { lat: 51.505, lon: 0.05 }, { lat: 51.515, lon: 0.10 },
        // Back around for thickness
        { lat: 51.505, lon: 0.10 }, { lat: 51.495, lon: 0.05 }, { lat: 51.482, lon: 0.02 }, 
        { lat: 51.488, lon: -0.02 }, { lat: 51.495, lon: -0.06 }, { lat: 51.500, lon: -0.10 }, 
        { lat: 51.495, lon: -0.12 }, { lat: 51.472, lon: -0.14 }, { lat: 51.475, lon: -0.18 }, 
        { lat: 51.468, lon: -0.22 }, { lat: 51.477, lon: -0.25 }, { lat: 51.475, lon: -0.30 }
      ]
    ],
    initialStations: [{ id: 1, type: 'circle', lat: 51.503, lon: -0.119, name: "Waterloo" }, { id: 2, type: 'square', lat: 51.53, lon: -0.123, name: "King's Cross" }, { id: 3, type: 'triangle', lat: 51.496, lon: -0.144, name: "Victoria" }]
  },
  {
    id: 'paris', name: 'Paris', color: '#FABD00', center: { lat: 48.8566, lon: 2.3522 }, difficulty: 1.1,
    bounds: { minLat: 48.80, maxLat: 48.90, minLon: 2.20, maxLon: 2.50 },
    water: [
      // The Seine - gracefully curving through Paris
      [
        { lat: 48.82, lon: 2.20 }, { lat: 48.84, lon: 2.25 }, { lat: 48.86, lon: 2.30 }, 
        { lat: 48.85, lon: 2.35 }, { lat: 48.84, lon: 2.40 }, { lat: 48.82, lon: 2.50 },
        // Returning to create width
        { lat: 48.81, lon: 2.50 }, { lat: 48.83, lon: 2.40 }, { lat: 48.84, lon: 2.35 }, 
        { lat: 48.85, lon: 2.30 }, { lat: 48.83, lon: 2.25 }, { lat: 48.81, lon: 2.20 }
      ]
    ],
    initialStations: [{ id: 4, type: 'circle', lat: 48.853, lon: 2.348, name: "Châtelet" }, { id: 5, type: 'square', lat: 48.875, lon: 2.359, name: "Gare du Nord" }, { id: 6, type: 'triangle', lat: 48.841, lon: 2.321, name: "Montparnasse" }]
  },
  {
    id: 'nyc', name: 'New York', color: '#EE352E', center: { lat: 40.7128, lon: -74.0060 }, difficulty: 1.3,
    bounds: { minLat: 40.65, maxLat: 40.80, minLon: -74.10, maxLon: -73.90 },
    water: [
      // Hudson River (West)
      [
        { lat: 40.80, lon: -74.10 }, { lat: 40.80, lon: -74.00 }, { lat: 40.70, lon: -74.05 }, { lat: 40.65, lon: -74.08 },
        { lat: 40.65, lon: -74.15 }, { lat: 40.80, lon: -74.15 }
      ],
      // East River (East)
      [
        { lat: 40.80, lon: -73.95 }, { lat: 40.75, lon: -73.96 }, { lat: 40.70, lon: -73.98 }, { lat: 40.65, lon: -74.00 },
        { lat: 40.65, lon: -73.85 }, { lat: 40.80, lon: -73.85 }
      ]
    ],
    initialStations: [{ id: 7, type: 'square', lat: 40.752, lon: -73.977, name: "Grand Central" }, { id: 8, type: 'circle', lat: 40.712, lon: -74.006, name: "World Trade" }, { id: 9, type: 'triangle', lat: 40.750, lon: -73.993, name: "Penn Station" }]
  }
];