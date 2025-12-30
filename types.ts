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
  difficulty: number; // Spawn rate multiplier
}

export interface GameState {
  cityId: string;
  mode: GameMode;
  stations: Station[];
  lines: TransitLine[];
  score: number;
  level: number;
  gameActive: boolean;
  autoSpawn: boolean; // Simulation toggle
  dayNightAuto: boolean; // Auto cycle toggle
  isNightManual: boolean; // Manual toggle
  timeScale: number;
  daysElapsed: number;
  nextRewardIn: number;
  resources: {
    lines: number;
    trains: number;
    tunnels: number;
    bridges: number;
    wagons: number;
  };
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
  },
  {
    id: 'berlin',
    name: 'Berlin',
    color: '#D7191C',
    center: { lat: 52.52, lon: 13.405 },
    difficulty: 0.95,
    bounds: { minLat: 52.45, maxLat: 52.58, minLon: 13.25, maxLon: 13.55 },
    water: [[
      { lat: 52.53, lon: 13.20 }, { lat: 52.52, lon: 13.30 }, { lat: 52.51, lon: 13.40 }, 
      { lat: 52.50, lon: 13.45 }, { lat: 52.48, lon: 13.55 }, { lat: 52.47, lon: 13.55 }, 
      { lat: 52.49, lon: 13.45 }, { lat: 52.50, lon: 13.40 }, { lat: 52.51, lon: 13.30 }, { lat: 52.52, lon: 13.20 }
    ]],
    initialStations: [
      { id: 13, type: 'circle', lat: 52.52, lon: 13.405, name: "Alexanderplatz" },
      { id: 14, type: 'square', lat: 52.506, lon: 13.332, name: "Zoo Garden" },
      { id: 15, type: 'triangle', lat: 52.525, lon: 13.369, name: "Hauptbahnhof" }
    ]
  },
  {
    id: 'singapore',
    name: 'Singapore',
    color: '#00A650',
    center: { lat: 1.3521, lon: 103.8198 },
    difficulty: 1.3,
    bounds: { minLat: 1.22, maxLat: 1.48, minLon: 103.60, maxLon: 104.05 },
    water: [[
      { lat: 1.25, lon: 103.60 }, { lat: 1.22, lon: 103.85 }, { lat: 1.28, lon: 104.05 }, 
      { lat: 1.45, lon: 104.05 }, { lat: 1.48, lon: 103.80 }, { lat: 1.45, lon: 103.60 }
    ]],
    initialStations: [
      { id: 16, type: 'square', lat: 1.284, lon: 103.851, name: "Raffles Place" },
      { id: 17, type: 'circle', lat: 1.300, lon: 103.854, name: "Bugis" },
      { id: 18, type: 'triangle', lat: 1.304, lon: 103.832, name: "Orchard" }
    ]
  },
  {
    id: 'sf',
    name: 'San Francisco',
    color: '#F98E1D',
    center: { lat: 37.7749, lon: -122.4194 },
    difficulty: 1.5,
    bounds: { minLat: 37.65, maxLat: 37.85, minLon: -122.55, maxLon: -122.30 },
    water: [[
      { lat: 37.85, lon: -122.55 }, { lat: 37.85, lon: -122.40 }, { lat: 37.75, lon: -122.30 }, 
      { lat: 37.65, lon: -122.30 }, { lat: 37.65, lon: -122.55 }
    ]],
    initialStations: [
      { id: 19, type: 'square', lat: 37.788, lon: -122.401, name: "Montgomery" },
      { id: 20, type: 'circle', lat: 37.764, lon: -122.419, name: "Mission St" },
      { id: 21, type: 'triangle', lat: 37.775, lon: -122.446, name: "Panhandle" }
    ]
  },
  {
    id: 'seoul',
    name: 'Seoul',
    color: '#0072CE',
    center: { lat: 37.5665, lon: 126.978 },
    difficulty: 1.2,
    bounds: { minLat: 37.45, maxLat: 37.65, minLon: 126.80, maxLon: 127.20 },
    water: [[
      { lat: 37.55, lon: 126.70 }, { lat: 37.53, lon: 126.90 }, { lat: 37.52, lon: 127.10 }, 
      { lat: 37.50, lon: 127.30 }, { lat: 37.48, lon: 127.30 }, { lat: 37.51, lon: 127.05 }, { lat: 37.52, lon: 126.80 }
    ]],
    initialStations: [
      { id: 22, type: 'square', lat: 37.561, lon: 126.982, name: "Myeong-dong" },
      { id: 23, type: 'circle', lat: 37.529, lon: 127.027, name: "Apgujeong" },
      { id: 24, type: 'triangle', lat: 37.512, lon: 127.102, name: "Jamsil" }
    ]
  },
  {
    id: 'sydney',
    name: 'Sydney',
    color: '#FF6F00',
    center: { lat: -33.8688, lon: 151.2093 },
    difficulty: 1.15,
    bounds: { minLat: -33.95, maxLat: -33.75, minLon: 151.05, maxLon: 151.35 },
    water: [[
      { lat: -33.75, lon: 151.25 }, { lat: -33.85, lon: 151.22 }, { lat: -33.85, lon: 151.35 }, 
      { lat: -33.95, lon: 151.35 }, { lat: -33.95, lon: 151.05 }, { lat: -33.85, lon: 151.05 }
    ]],
    initialStations: [
      { id: 25, type: 'square', lat: -33.867, lon: 151.207, name: "Town Hall" },
      { id: 26, type: 'circle', lat: -33.852, lon: 151.211, name: "Circular Quay" },
      { id: 27, type: 'triangle', lat: -33.882, lon: 151.201, name: "Central" }
    ]
  },
  {
    id: 'hk',
    name: 'Hong Kong',
    color: '#8E24AA',
    center: { lat: 22.3193, lon: 114.1694 },
    difficulty: 1.45,
    bounds: { minLat: 22.20, maxLat: 22.45, minLon: 114.00, maxLon: 114.30 },
    water: [[
      { lat: 22.28, lon: 114.00 }, { lat: 22.29, lon: 114.15 }, { lat: 22.28, lon: 114.30 }, 
      { lat: 22.20, lon: 114.30 }, { lat: 22.20, lon: 114.00 }
    ]],
    initialStations: [
      { id: 28, type: 'square', lat: 22.282, lon: 114.158, name: "Central" },
      { id: 29, type: 'circle', lat: 22.297, lon: 114.172, name: "Tsim Sha Tsui" },
      { id: 30, type: 'triangle', lat: 22.336, lon: 114.149, name: "Sham Shui Po" }
    ]
  }
];