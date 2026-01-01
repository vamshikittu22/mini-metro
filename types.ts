export type StationType = 'circle' | 'square' | 'triangle' | 'pentagon' | 'star';
export type GameMode = 'NORMAL' | 'EXTREME' | 'ENDLESS' | 'CREATIVE';

export interface Point {
  x: number;
  y: number;
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
  
  // Available for placement
  resources: {
    lines: number;
    trains: number;
    tunnels: number;
    bridges: number;
    wagons: number;
  };

  // Invariants (Initial + Rewards)
  totalResources: {
    lines: number;
    trains: number;
    tunnels: number;
    bridges: number;
    wagons: number;
  };

  weeklyAuditLog: { 
    week: number; 
    choice: string; 
    snapshot: Record<string, number>;
  }[];
  
  pendingRewardOptions?: [RewardChoice, RewardChoice];
  isPausedForReward: boolean;
}

export const CITIES: City[] = [
  {
    id: 'london',
    name: 'London',
    color: '#019AD1',
    center: { lat: 51.5074, lon: -0.1278 },
    difficulty: 1.0,
    bounds: { minLat: 51.45, maxLat: 51.55, minLon: -0.20, maxLon: -0.05 },
    water: [[
      { lat: 51.485, lon: -0.25 }, { lat: 51.482, lon: -0.21 }, { lat: 51.488, lon: -0.18 }, 
      { lat: 51.502, lon: -0.16 }, { lat: 51.515, lon: -0.12 }, { lat: 51.510, lon: -0.08 }, 
      { lat: 51.505, lon: -0.03 }, { lat: 51.492, lon: -0.02 }, { lat: 51.498, lon: -0.08 }, 
      { lat: 51.505, lon: -0.12 }, { lat: 51.492, lon: -0.15 }, { lat: 51.478, lon: -0.18 }, 
      { lat: 51.475, lon: -0.25 }
    ]],
    initialStations: [
      { id: 1, type: 'circle', lat: 51.5033, lon: -0.1195, name: "Waterloo" },
      { id: 2, type: 'square', lat: 51.5306, lon: -0.1230, name: "King's Cross" },
      { id: 3, type: 'triangle', lat: 51.4965, lon: -0.1447, name: "Victoria" }
    ]
  },
  {
    id: 'nyc',
    name: 'New York',
    color: '#EB2827',
    center: { lat: 40.7128, lon: -74.0060 },
    difficulty: 1.2,
    bounds: { minLat: 40.65, maxLat: 40.80, minLon: -74.10, maxLon: -73.90 },
    water: [
      [{ lat: 40.70, lon: -74.05 }, { lat: 40.72, lon: -74.03 }, { lat: 40.76, lon: -74.01 }, { lat: 40.82, lon: -73.98 }, { lat: 40.82, lon: -73.96 }, { lat: 40.75, lon: -73.99 }, { lat: 40.70, lon: -74.02 }],
      [{ lat: 40.70, lon: -74.01 }, { lat: 40.71, lon: -73.98 }, { lat: 40.73, lon: -73.96 }, { lat: 40.76, lon: -73.94 }, { lat: 40.78, lon: -73.93 }, { lat: 40.77, lon: -73.92 }, { lat: 40.71, lon: -73.96 }, { lat: 40.69, lon: -74.00 }]
    ],
    initialStations: [
      { id: 4, type: 'square', lat: 40.7527, lon: -73.9772, name: "Grand Central" },
      { id: 5, type: 'circle', lat: 40.7128, lon: -74.0060, name: "World Trade" },
      { id: 6, type: 'triangle', lat: 40.7505, lon: -73.9934, name: "Penn Station" }
    ]
  },
  {
    id: 'paris',
    name: 'Paris',
    color: '#F0CB16',
    center: { lat: 48.8566, lon: 2.3522 },
    difficulty: 1.1,
    bounds: { minLat: 48.80, maxLat: 48.90, minLon: 2.25, maxLon: 2.45 },
    water: [[
      { lat: 48.845, lon: 2.20 }, { lat: 48.852, lon: 2.25 }, { lat: 48.865, lon: 2.30 }, 
      { lat: 48.855, lon: 2.35 }, { lat: 48.845, lon: 2.42 }, { lat: 48.835, lon: 2.45 }, 
      { lat: 48.842, lon: 2.40 }, { lat: 48.852, lon: 2.32 }, { lat: 48.860, lon: 2.28 }, 
      { lat: 48.840, lon: 2.20 }
    ]],
    initialStations: [
      { id: 7, type: 'circle', lat: 48.8534, lon: 2.3488, name: "Châtelet" },
      { id: 8, type: 'square', lat: 48.8752, lon: 2.3593, name: "Gare du Nord" },
      { id: 9, type: 'triangle', lat: 48.8412, lon: 2.3211, name: "Montparnasse" }
    ]
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    color: '#51A03E',
    center: { lat: 35.6895, lon: 139.6917 },
    difficulty: 1.4,
    bounds: { minLat: 35.60, maxLat: 35.80, minLon: 139.60, maxLon: 139.80 },
    water: [[
      { lat: 35.60, lon: 139.75 }, { lat: 35.62, lon: 139.77 }, { lat: 35.65, lon: 139.82 }, 
      { lat: 35.68, lon: 139.88 }, { lat: 35.58, lon: 139.85 }, { lat: 35.55, lon: 139.75 }
    ]],
    initialStations: [
      { id: 10, type: 'square', lat: 35.6812, lon: 139.7671, name: "Tokyo" },
      { id: 11, type: 'circle', lat: 35.6895, lon: 139.6917, name: "Shinjuku" },
      { id: 12, type: 'triangle', lat: 35.6581, lon: 139.7016, name: "Shibuya" }
    ]
  }
];