
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
    bounds: { minLat: 51.45, maxLat: 51.55, minLon: -0.20, maxLon: -0.05 },
    water: [[{ lat: 51.485, lon: -0.25 }, { lat: 51.51, lon: -0.12 }, { lat: 51.505, lon: -0.03 }, { lat: 51.492, lon: -0.15 }]],
    initialStations: [{ id: 1, type: 'circle', lat: 51.503, lon: -0.119, name: "Waterloo" }, { id: 2, type: 'square', lat: 51.53, lon: -0.123, name: "King's Cross" }, { id: 3, type: 'triangle', lat: 51.496, lon: -0.144, name: "Victoria" }]
  },
  {
    id: 'paris', name: 'Paris', color: '#FABD00', center: { lat: 48.8566, lon: 2.3522 }, difficulty: 1.1,
    bounds: { minLat: 48.80, maxLat: 48.90, minLon: 2.25, maxLon: 2.45 },
    water: [[{ lat: 48.84, lon: 2.25 }, { lat: 48.86, lon: 2.30 }, { lat: 48.85, lon: 2.40 }]],
    initialStations: [{ id: 4, type: 'circle', lat: 48.853, lon: 2.348, name: "Châtelet" }, { id: 5, type: 'square', lat: 48.875, lon: 2.359, name: "Gare du Nord" }, { id: 6, type: 'triangle', lat: 48.841, lon: 2.321, name: "Montparnasse" }]
  },
  {
    id: 'nyc', name: 'New York', color: '#EE352E', center: { lat: 40.7128, lon: -74.0060 }, difficulty: 1.3,
    bounds: { minLat: 40.65, maxLat: 40.80, minLon: -74.10, maxLon: -73.90 },
    water: [[{ lat: 40.70, lon: -74.05 }, { lat: 40.80, lon: -73.95 }, { lat: 40.65, lon: -73.95 }]],
    initialStations: [{ id: 7, type: 'square', lat: 40.752, lon: -73.977, name: "Grand Central" }, { id: 8, type: 'circle', lat: 40.712, lon: -74.006, name: "World Trade" }, { id: 9, type: 'triangle', lat: 40.750, lon: -73.993, name: "Penn Station" }]
  },
  {
    id: 'tokyo', name: 'Tokyo', color: '#B0B0B0', center: { lat: 35.6895, lon: 139.6917 }, difficulty: 1.5,
    bounds: { minLat: 35.60, maxLat: 35.80, minLon: 139.60, maxLon: 139.80 },
    water: [[{ lat: 35.60, lon: 139.75 }, { lat: 35.65, lon: 139.85 }, { lat: 35.55, lon: 139.85 }]],
    initialStations: [{ id: 10, type: 'square', lat: 35.681, lon: 139.767, name: "Tokyo" }, { id: 11, type: 'circle', lat: 35.689, lon: 139.691, name: "Shinjuku" }, { id: 12, type: 'triangle', lat: 35.658, lon: 139.701, name: "Shibuya" }]
  },
  {
    id: 'berlin', name: 'Berlin', color: '#D21034', center: { lat: 52.5200, lon: 13.4050 }, difficulty: 1.1,
    bounds: { minLat: 52.45, maxLat: 52.55, minLon: 13.30, maxLon: 13.45 },
    water: [[{ lat: 52.50, lon: 13.35 }, { lat: 52.52, lon: 13.45 }, { lat: 52.51, lon: 13.55 }]],
    initialStations: [{ id: 13, type: 'square', lat: 52.525, lon: 13.369, name: "Hauptbahnhof" }, { id: 14, type: 'circle', lat: 52.521, lon: 13.413, name: "Alex" }, { id: 15, type: 'triangle', lat: 52.507, lon: 13.332, name: "Zoo Garten" }]
  },
  { id: 'seoul', name: 'Seoul', color: '#0047A0', center: { lat: 37.566, lon: 126.978 }, difficulty: 1.4, bounds: { minLat: 37.50, maxLat: 37.60, minLon: 126.90, maxLon: 127.10 }, water: [[{ lat: 37.52, lon: 126.90 }, { lat: 37.54, lon: 127.05 }]], initialStations: [{ id: 100, type: 'square', lat: 37.555, lon: 126.972, name: "Seoul Station" }, { id: 101, type: 'circle', lat: 37.53, lon: 126.99, name: "Itaewon" }, { id: 102, type: 'triangle', lat: 37.5, lon: 127.04, name: "Gangnam" }] },
  { id: 'sydney', name: 'Sydney', color: '#FDB813', center: { lat: -33.868, lon: 151.209 }, difficulty: 1.2, bounds: { minLat: -33.95, maxLat: -33.80, minLon: 151.10, maxLon: 151.30 }, water: [[{ lat: -33.85, lon: 151.15 }, { lat: -33.86, lon: 151.25 }]], initialStations: [{ id: 103, type: 'square', lat: -33.868, lon: 151.209, name: "Town Hall" }, { id: 104, type: 'circle', lat: -33.856, lon: 151.215, name: "Circular Quay" }, { id: 105, type: 'triangle', lat: -33.883, lon: 151.203, name: "Central" }] },
  { id: 'mumbai', name: 'Mumbai', color: '#FF9933', center: { lat: 19.076, lon: 72.877 }, difficulty: 1.6, bounds: { minLat: 18.90, maxLat: 19.30, minLon: 72.75, maxLon: 73.00 }, water: [[{ lat: 19.0, lon: 72.80 }, { lat: 19.1, lon: 72.85 }]], initialStations: [{ id: 106, type: 'square', lat: 18.94, lon: 72.83, name: "CSMT" }, { id: 107, type: 'circle', lat: 19.05, lon: 72.83, name: "Bandra" }, { id: 108, type: 'triangle', lat: 19.11, lon: 72.86, name: "Andheri" }] },
  { id: 'cairo', name: 'Cairo', color: '#C09300', center: { lat: 30.044, lon: 31.235 }, difficulty: 1.4, bounds: { minLat: 29.95, maxLat: 30.15, minLon: 31.15, maxLon: 31.35 }, water: [[{ lat: 30.0, lon: 31.22 }, { lat: 30.1, lon: 31.24 }]], initialStations: [{ id: 109, type: 'square', lat: 30.044, lon: 31.235, name: "Tahrir" }, { id: 110, type: 'circle', lat: 30.013, lon: 31.208, name: "Giza" }, { id: 111, type: 'triangle', lat: 30.06, lon: 31.28, name: "Heliopolis" }] },
  { id: 'rio', name: 'Rio', color: '#009B3A', center: { lat: -22.906, lon: -43.172 }, difficulty: 1.3, bounds: { minLat: -23.05, maxLat: -22.85, minLon: -43.35, maxLon: -43.10 }, water: [[{ lat: -22.9, lon: -43.15 }, { lat: -23.0, lon: -43.2 }]], initialStations: [{ id: 112, type: 'square', lat: -22.906, lon: -43.172, name: "Centro" }, { id: 113, type: 'circle', lat: -22.98, lon: -43.2, name: "Ipanema" }, { id: 114, type: 'triangle', lat: -22.95, lon: -43.18, name: "Botafogo" }] },
  { id: 'moscow', name: 'Moscow', color: '#D52B1E', center: { lat: 55.755, lon: 37.617 }, difficulty: 1.2, bounds: { minLat: 55.65, maxLat: 55.85, minLon: 37.50, maxLon: 37.80 }, water: [[{ lat: 55.75, lon: 37.60 }, { lat: 55.78, lon: 37.65 }]], initialStations: [{ id: 115, type: 'square', lat: 55.755, lon: 37.617, name: "Kremlin" }, { id: 116, type: 'circle', lat: 55.77, lon: 37.58, name: "Belorussky" }, { id: 117, type: 'triangle', lat: 55.73, lon: 37.63, name: "Paveletsky" }] },
  { id: 'beijing', name: 'Beijing', color: '#EE1C25', center: { lat: 39.904, lon: 116.407 }, difficulty: 1.5, bounds: { minLat: 39.80, maxLat: 40.00, minLon: 116.30, maxLon: 116.50 }, water: [], initialStations: [{ id: 118, type: 'square', lat: 39.904, lon: 116.407, name: "Tiananmen" }, { id: 119, type: 'circle', lat: 39.93, lon: 116.42, name: "Sanlitun" }, { id: 120, type: 'triangle', lat: 39.9, lon: 116.35, name: "Xidan" }] },
  { id: 'toronto', name: 'Toronto', color: '#FF0000', center: { lat: 43.653, lon: -79.383 }, difficulty: 1.1, bounds: { minLat: 43.60, maxLat: 43.75, minLon: -79.50, maxLon: -79.30 }, water: [[{ lat: 43.6, lon: -79.4 }, { lat: 43.63, lon: -79.3 }]], initialStations: [{ id: 121, type: 'square', lat: 43.645, lon: -79.38, name: "Union" }, { id: 122, type: 'circle', lat: 43.67, lon: -79.38, name: "Bloor" }, { id: 123, type: 'triangle', lat: 43.65, lon: -79.4, name: "Spadina" }] },
  { id: 'barcelona', name: 'Barcelona', color: '#CC0000', center: { lat: 41.385, lon: 2.173 }, difficulty: 1.2, bounds: { minLat: 41.30, maxLat: 41.45, minLon: 2.10, maxLon: 2.25 }, water: [[{ lat: 41.35, lon: 2.2 }, { lat: 41.4, lon: 2.25 }]], initialStations: [{ id: 124, type: 'square', lat: 41.385, lon: 2.173, name: "Catalunya" }, { id: 125, type: 'circle', lat: 41.403, lon: 2.174, name: "Sagrada" }, { id: 126, type: 'triangle', lat: 41.37, lon: 2.15, name: "Sants" }] },
  { id: 'amsterdam', name: 'Amsterdam', color: '#FF4F00', center: { lat: 52.367, lon: 4.904 }, difficulty: 1.3, bounds: { minLat: 52.30, maxLat: 52.45, minLon: 4.80, maxLon: 5.00 }, water: [[{ lat: 52.38, lon: 4.85 }, { lat: 52.4, lon: 4.95 }]], initialStations: [{ id: 127, type: 'square', lat: 52.379, lon: 4.900, name: "Centraal" }, { id: 128, type: 'circle', lat: 52.35, lon: 4.88, name: "Museum" }, { id: 129, type: 'triangle', lat: 52.36, lon: 4.92, name: "Oost" }] },
  { id: 'rome', name: 'Rome', color: '#BE0000', center: { lat: 41.902, lon: 12.496 }, difficulty: 1.2, bounds: { minLat: 41.80, maxLat: 42.00, minLon: 12.40, maxLon: 12.60 }, water: [[{ lat: 41.9, lon: 12.45 }, { lat: 41.88, lon: 12.48 }]], initialStations: [{ id: 130, type: 'square', lat: 41.901, lon: 12.500, name: "Termini" }, { id: 131, type: 'circle', lat: 41.89, lon: 12.49, name: "Colosseo" }, { id: 132, type: 'triangle', lat: 41.91, lon: 12.45, name: "Vatican" }] },
  { id: 'istanbul', name: 'Istanbul', color: '#003399', center: { lat: 41.008, lon: 28.978 }, difficulty: 1.5, bounds: { minLat: 40.90, maxLat: 41.10, minLon: 28.90, maxLon: 29.10 }, water: [[{ lat: 41.0, lon: 28.98 }, { lat: 41.05, lon: 29.02 }]], initialStations: [{ id: 133, type: 'square', lat: 41.008, lon: 28.978, name: "Sultanahmet" }, { id: 134, type: 'circle', lat: 41.03, lon: 28.98, name: "Taksim" }, { id: 135, type: 'triangle', lat: 41.0, lon: 29.05, name: "Kadikoy" }] },
  { id: 'stockholm', name: 'Stockholm', color: '#006AA7', center: { lat: 59.329, lon: 18.068 }, difficulty: 1.3, bounds: { minLat: 59.25, maxLat: 59.40, minLon: 17.90, maxLon: 18.20 }, water: [[{ lat: 59.32, lon: 18.0 }, { lat: 59.34, lon: 18.15 }]], initialStations: [{ id: 136, type: 'square', lat: 59.33, lon: 18.06, name: "T-Centralen" }, { id: 137, type: 'circle', lat: 59.31, lon: 18.07, name: "Slussen" }, { id: 138, type: 'triangle', lat: 59.34, lon: 18.04, name: "Odenplan" }] },
  { id: 'mexico', name: 'Mexico City', color: '#E4007C', center: { lat: 19.432, lon: -99.133 }, difficulty: 1.6, bounds: { minLat: 19.30, maxLat: 19.55, minLon: -99.25, maxLon: -99.05 }, water: [], initialStations: [{ id: 139, type: 'square', lat: 19.432, lon: -99.133, name: "Zocalo" }, { id: 140, type: 'circle', lat: 19.42, lon: -99.16, name: "Condesa" }, { id: 141, type: 'triangle', lat: 19.45, lon: -99.12, name: "Tlatelolco" }] },
  { id: 'singapore', name: 'Singapore', color: '#ED2939', center: { lat: 1.352, lon: 103.819 }, difficulty: 1.4, bounds: { minLat: 1.20, maxLat: 1.45, minLon: 103.65, maxLon: 104.00 }, water: [[{ lat: 1.25, lon: 103.85 }, { lat: 1.3, lon: 104.0 }]], initialStations: [{ id: 142, type: 'square', lat: 1.3, lon: 103.85, name: "Raffles" }, { id: 143, type: 'circle', lat: 1.33, lon: 103.85, name: "Bishan" }, { id: 144, type: 'triangle', lat: 1.31, lon: 103.76, name: "Jurong" }] }
];
