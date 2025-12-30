export type StationType = 'circle' | 'square' | 'triangle' | 'pentagon' | 'star';

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
  stations: Station[];
  lines: TransitLine[];
  score: number;
  level: number;
  gameActive: boolean;
  timeScale: number;
  daysElapsed: number;
  nextRewardIn: number;
  resources: {
    lines: number;
    trains: number;
    tunnels: number;
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
    water: [[{ lat: 51.48, lon: -0.25 }, { lat: 51.49, lon: -0.15 }, { lat: 51.51, lon: -0.10 }, { lat: 51.50, lon: 0.05 }]],
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
    water: [[{ lat: 40.70, lon: -74.02 }, { lat: 40.75, lon: -74.00 }, { lat: 40.85, lon: -73.95 }]],
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
    water: [[{ lat: 48.85, lon: 2.20 }, { lat: 48.86, lon: 2.35 }, { lat: 48.84, lon: 2.50 }]],
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
    water: [[{ lat: 35.60, lon: 139.75 }, { lat: 35.65, lon: 139.80 }, { lat: 35.70, lon: 139.75 }]],
    initialStations: [
      { id: 10, type: 'square', lat: 35.6812, lon: 139.7671, name: "Tokyo" },
      { id: 11, type: 'circle', lat: 35.6895, lon: 139.6917, name: "Shinjuku" },
      { id: 12, type: 'triangle', lat: 35.6581, lon: 139.7016, name: "Shibuya" }
    ]
  },
  {
    id: 'berlin',
    name: 'Berlin',
    color: '#EF7D00',
    center: { lat: 52.5200, lon: 13.4050 },
    difficulty: 0.9,
    bounds: { minLat: 52.45, maxLat: 52.60, minLon: 13.30, maxLon: 13.50 },
    water: [[{ lat: 52.50, lon: 13.30 }, { lat: 52.52, lon: 13.40 }, { lat: 52.51, lon: 13.50 }]],
    initialStations: [
      { id: 13, type: 'square', lat: 52.5250, lon: 13.3694, name: "Hbf" },
      { id: 14, type: 'circle', lat: 52.5219, lon: 13.4132, name: "Alex" },
      { id: 15, type: 'triangle', lat: 52.5030, lon: 13.3353, name: "Zoo" }
    ]
  },
  {
    id: 'seoul',
    name: 'Seoul',
    color: '#0052A4',
    center: { lat: 37.5665, lon: 126.9780 },
    difficulty: 1.3,
    bounds: { minLat: 37.50, maxLat: 37.65, minLon: 126.90, maxLon: 127.10 },
    water: [[{ lat: 37.52, lon: 126.90 }, { lat: 37.53, lon: 127.00 }, { lat: 37.52, lon: 127.10 }]],
    initialStations: [
      { id: 16, type: 'circle', lat: 37.5617, lon: 126.9833, name: "Myeongdong" },
      { id: 17, type: 'square', lat: 37.5547, lon: 126.9706, name: "Seoul Station" },
      { id: 18, type: 'triangle', lat: 37.5242, lon: 127.0271, name: "Gangnam" }
    ]
  },
  {
    id: 'hongkong',
    name: 'Hong Kong',
    color: '#8A2B0F',
    center: { lat: 22.3193, lon: 114.1694 },
    difficulty: 1.5,
    bounds: { minLat: 22.25, maxLat: 22.35, minLon: 114.10, maxLon: 114.25 },
    water: [[{ lat: 22.28, lon: 114.10 }, { lat: 22.30, lon: 114.18 }, { lat: 22.28, lon: 114.25 }]],
    initialStations: [
      { id: 19, type: 'circle', lat: 22.2820, lon: 114.1585, name: "Central" },
      { id: 20, type: 'square', lat: 22.2988, lon: 114.1722, name: "Tsim Sha Tsui" },
      { id: 21, type: 'triangle', lat: 22.3130, lon: 114.1706, name: "Mong Kok" }
    ]
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    color: '#FFD700',
    center: { lat: 19.0760, lon: 72.8777 },
    difficulty: 1.3,
    bounds: { minLat: 18.90, maxLat: 19.15, minLon: 72.80, maxLon: 72.95 },
    water: [[{ lat: 18.90, lon: 72.82 }, { lat: 19.00, lon: 72.80 }, { lat: 19.10, lon: 72.85 }]],
    initialStations: [
      { id: 22, type: 'square', lat: 18.9400, lon: 72.8351, name: "CST" },
      { id: 23, type: 'circle', lat: 18.9218, lon: 72.8335, name: "Colaba" },
      { id: 24, type: 'triangle', lat: 19.0178, lon: 72.8478, name: "Dadar" }
    ]
  },
  {
    id: 'sydney',
    name: 'Sydney',
    color: '#002B7F',
    center: { lat: -33.8688, lon: 151.2093 },
    difficulty: 0.9,
    bounds: { minLat: -33.95, maxLat: -33.80, minLon: 151.10, maxLon: 151.30 },
    water: [[{ lat: -33.85, lon: 151.15 }, { lat: -33.86, lon: 151.21 }, { lat: -33.84, lon: 151.28 }]],
    initialStations: [
      { id: 25, type: 'circle', lat: -33.8675, lon: 151.2070, name: "Wynyard" },
      { id: 26, type: 'square', lat: -33.8824, lon: 151.2061, name: "Central" },
      { id: 27, type: 'triangle', lat: -33.8443, lon: 151.2101, name: "North Sydney" }
    ]
  },
  {
    id: 'chicago',
    name: 'Chicago',
    color: '#222222',
    center: { lat: 41.8781, lon: -87.6298 },
    difficulty: 1.1,
    bounds: { minLat: 41.80, maxLat: 41.95, minLon: -87.75, maxLon: -87.55 },
    water: [[{ lat: 41.80, lon: -87.60 }, { lat: 41.90, lon: -87.62 }, { lat: 41.95, lon: -87.60 }]],
    initialStations: [
      { id: 28, type: 'square', lat: 41.8832, lon: -87.6298, name: "The Loop" },
      { id: 29, type: 'circle', lat: 41.8756, lon: -87.6243, name: "Union Station" },
      { id: 30, type: 'triangle', lat: 41.9484, lon: -87.6553, name: "Wrigleyville" }
    ]
  }
];