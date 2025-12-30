
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
    id: "paris",
    name: "Paris",
    bounds: { minLat: 48.82, maxLat: 48.90, minLon: 2.25, maxLon: 2.42 },
    water: [
      [
        { lat: 48.84, lon: 2.24 }, 
        { lat: 48.86, lon: 2.30 }, 
        { lat: 48.85, lon: 2.36 },
        { lat: 48.83, lon: 2.42 }, 
        { lat: 48.82, lon: 2.42 },
        { lat: 48.84, lon: 2.36 },
        { lat: 48.85, lon: 2.30 },
        { lat: 48.83, lon: 2.24 }
      ]
    ],
    initialStations: [
      { id: 1, type: 'circle', lat: 48.8584, lon: 2.2945, name: "Eiffel" },
      { id: 2, type: 'square', lat: 48.8606, lon: 2.3376, name: "Louvre" },
      { id: 3, type: 'triangle', lat: 48.8738, lon: 2.2950, name: "Étoile" }
    ]
  }
];

export const CITY_DATA = CITIES[0];
