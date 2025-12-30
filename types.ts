
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
  timer: number; // 0 to 1 for failure countdown
}

export interface Passenger {
  id: number;
  targetType: StationType;
  spawnTime: number;
}

export interface TransitLine {
  id: number;
  color: string;
  stations: number[]; // Ordered list of station IDs
  trains: Train[];
}

export interface Train {
  id: number;
  lineId: number;
  nextStationIndex: number; // Index in line.stations
  progress: number; // 0 to 1 between stations
  direction: 1 | -1;
  passengers: Passenger[];
  capacity: number;
}

export interface City {
  id: string;
  name: string;
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  water: { lat: number; lon: number }[][];
  initialStations: { id: number; type: StationType; lat: number; lon: number; name: string }[];
}

export interface GameState {
  cityId: string;
  stations: Station[];
  lines: TransitLine[];
  score: number;
  gameActive: boolean;
  timeScale: number; // 1 for normal, 2 for fast
  daysElapsed: number;
  nextRewardIn: number; // Progress towards next reward
  resources: {
    lines: number;
    trains: number;
    tunnels: number;
  };
}

export const CITIES: City[] = [
  {
    id: "london",
    name: "London",
    bounds: { minLat: 51.48, maxLat: 51.55, minLon: -0.16, maxLon: -0.08 },
    water: [
      [
        { lat: 51.485, lon: -0.18 }, 
        { lat: 51.490, lon: -0.15 }, 
        { lat: 51.505, lon: -0.12 }, 
        { lat: 51.500, lon: -0.09 }, 
        { lat: 51.515, lon: -0.07 },
        { lat: 51.510, lon: -0.07 },
        { lat: 51.495, lon: -0.09 },
        { lat: 51.500, lon: -0.12 },
        { lat: 51.485, lon: -0.15 },
        { lat: 51.480, lon: -0.18 }
      ]
    ],
    initialStations: [
      { id: 1, type: 'circle', lat: 51.5033, lon: -0.1195, name: "Waterloo" },
      { id: 2, type: 'square', lat: 51.5306, lon: -0.1230, name: "King's Cross" },
      { id: 3, type: 'triangle', lat: 51.4965, lon: -0.1447, name: "Victoria" }
    ]
  },
  {
    id: "newyork",
    name: "New York",
    bounds: { minLat: 40.70, maxLat: 40.82, minLon: -74.02, maxLon: -73.92 },
    water: [
      [ // Hudson River
        { lat: 40.70, lon: -74.02 }, { lat: 40.82, lon: -73.99 }, { lat: 40.82, lon: -73.96 }, { lat: 40.70, lon: -74.00 }
      ],
      [ // East River
        { lat: 40.70, lon: -74.00 }, { lat: 40.75, lon: -73.96 }, { lat: 40.80, lon: -73.93 }, { lat: 40.80, lon: -73.91 }, { lat: 40.70, lon: -73.98 }
      ]
    ],
    initialStations: [
      { id: 1, type: 'circle', lat: 40.7128, lon: -74.0060, name: "City Hall" },
      { id: 2, type: 'square', lat: 40.7527, lon: -73.9772, name: "Grand Central" },
      { id: 3, type: 'triangle', lat: 40.7580, lon: -73.9855, name: "Times Sq" }
    ]
  },
  {
    id: "tokyo",
    name: "Tokyo",
    bounds: { minLat: 35.65, maxLat: 35.75, minLon: 139.68, maxLon: 139.80 },
    water: [
      [
        { lat: 35.65, lon: 139.75 }, { lat: 35.68, lon: 139.78 }, { lat: 35.70, lon: 139.80 }, { lat: 35.64, lon: 139.80 }
      ]
    ],
    initialStations: [
      { id: 1, type: 'circle', lat: 35.6812, lon: 139.7671, name: "Tokyo St" },
      { id: 2, type: 'square', lat: 35.6895, lon: 139.7005, name: "Shinjuku" },
      { id: 3, type: 'triangle', lat: 35.6586, lon: 139.7454, name: "Minato" }
    ]
  },
  {
    id: "berlin",
    name: "Berlin",
    bounds: { minLat: 52.48, maxLat: 52.55, minLon: 13.35, maxLon: 13.45 },
    water: [
      [
        { lat: 52.52, lon: 13.35 }, { lat: 52.51, lon: 13.40 }, { lat: 52.50, lon: 13.45 }, { lat: 52.49, lon: 13.45 }, { lat: 52.51, lon: 13.35 }
      ]
    ],
    initialStations: [
      { id: 1, type: 'circle', lat: 52.5200, lon: 13.4050, name: "Alexanderplatz" },
      { id: 2, type: 'square', lat: 52.5250, lon: 13.3694, name: "Hauptbahnhof" },
      { id: 3, type: 'triangle', lat: 52.5030, lon: 13.3300, name: "Zoo Garden" }
    ]
  }
];

export const CITY_DATA = CITIES[0];
