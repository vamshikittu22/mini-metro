import { City } from '../types';

export const CITIES: City[] = [
  {
    id: 'london', name: 'London', color: '#019AD1', center: { lat: 51.5074, lon: -0.1278 }, difficulty: 1.0,
    bounds: { minLat: 51.45, maxLat: 51.55, minLon: -0.25, maxLon: 0.05 },
    water: [
      [
        { lat: 51.485, lon: -0.30 }, { lat: 51.487, lon: -0.25 }, { lat: 51.478, lon: -0.22 }, 
        { lat: 51.485, lon: -0.18 }, { lat: 51.482, lon: -0.14 }, { lat: 51.505, lon: -0.12 }, 
        { lat: 51.510, lon: -0.10 }, { lat: 51.505, lon: -0.06 }, { lat: 51.498, lon: -0.02 }, 
        { lat: 51.492, lon: 0.02 }, { lat: 51.505, lon: 0.05 }, { lat: 51.515, lon: 0.10 },
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
      [
        { lat: 48.82, lon: 2.20 }, { lat: 48.84, lon: 2.25 }, { lat: 48.86, lon: 2.30 }, 
        { lat: 48.85, lon: 2.35 }, { lat: 48.84, lon: 2.40 }, { lat: 48.82, lon: 2.50 },
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
      [
        { lat: 40.80, lon: -74.10 }, { lat: 40.80, lon: -74.00 }, { lat: 40.70, lon: -74.05 }, { lat: 40.65, lon: -74.08 },
        { lat: 40.65, lon: -74.15 }, { lat: 40.80, lon: -74.15 }
      ],
      [
        { lat: 40.80, lon: -73.95 }, { lat: 40.75, lon: -73.96 }, { lat: 40.70, lon: -73.98 }, { lat: 40.65, lon: -74.00 },
        { lat: 40.65, lon: -73.85 }, { lat: 40.80, lon: -73.85 }
      ]
    ],
    initialStations: [{ id: 7, type: 'square', lat: 40.752, lon: -73.977, name: "Grand Central" }, { id: 8, type: 'circle', lat: 40.712, lon: -74.006, name: "World Trade" }, { id: 9, type: 'triangle', lat: 40.750, lon: -73.993, name: "Penn Station" }]
  },
  {
    id: 'tokyo', name: 'Tokyo', color: '#72246C', center: { lat: 35.6895, lon: 139.6917 }, difficulty: 1.5,
    bounds: { minLat: 35.60, maxLat: 35.75, minLon: 139.65, maxLon: 139.85 },
    water: [
      // Tokyo Bay Area
      [
        { lat: 35.60, lon: 139.85 }, { lat: 35.65, lon: 139.80 }, { lat: 35.62, lon: 139.75 }, 
        { lat: 35.60, lon: 139.70 }, { lat: 35.58, lon: 139.85 }
      ],
      // Sumida River
      [
        { lat: 35.75, lon: 139.80 }, { lat: 35.70, lon: 139.78 }, { lat: 35.65, lon: 139.76 }, 
        { lat: 35.65, lon: 139.74 }, { lat: 35.70, lon: 139.76 }, { lat: 35.75, lon: 139.78 }
      ]
    ],
    initialStations: [{ id: 10, type: 'circle', lat: 35.681, lon: 139.767, name: "Tokyo Station" }, { id: 11, type: 'square', lat: 35.689, lon: 139.700, name: "Shinjuku" }, { id: 12, type: 'triangle', lat: 35.713, lon: 139.777, name: "Ueno" }]
  },
  {
    id: 'berlin', name: 'Berlin', color: '#FFD100', center: { lat: 52.5200, lon: 13.4050 }, difficulty: 1.2,
    bounds: { minLat: 52.45, maxLat: 52.58, minLon: 13.25, maxLon: 13.55 },
    water: [
      // Spree River
      [
        { lat: 52.52, lon: 13.25 }, { lat: 52.53, lon: 13.35 }, { lat: 52.51, lon: 13.45 }, 
        { lat: 52.48, lon: 13.55 }, { lat: 52.47, lon: 13.55 }, { lat: 52.50, lon: 13.45 }, 
        { lat: 52.52, lon: 13.35 }, { lat: 52.51, lon: 13.25 }
      ]
    ],
    initialStations: [{ id: 13, type: 'circle', lat: 52.524, lon: 13.369, name: "Hauptbahnhof" }, { id: 14, type: 'square', lat: 52.521, lon: 13.413, name: "Alexanderplatz" }, { id: 15, type: 'triangle', lat: 52.503, lon: 13.332, name: "Zoologischer Garten" }]
  },
  {
    id: 'hk', name: 'Hong Kong', color: '#8B4513', center: { lat: 22.3193, lon: 114.1694 }, difficulty: 1.8,
    bounds: { minLat: 22.25, maxLat: 22.35, minLon: 114.10, maxLon: 114.25 },
    water: [
      // Victoria Harbour
      [
        { lat: 22.28, lon: 114.10 }, { lat: 22.30, lon: 114.15 }, { lat: 22.30, lon: 114.20 }, 
        { lat: 22.28, lon: 114.25 }, { lat: 22.25, lon: 114.25 }, { lat: 22.25, lon: 114.10 }
      ]
    ],
    initialStations: [{ id: 16, type: 'circle', lat: 22.319, lon: 114.169, name: "Mong Kok" }, { id: 17, type: 'square', lat: 22.282, lon: 114.158, name: "Central" }, { id: 18, type: 'triangle', lat: 22.337, lon: 114.176, name: "Kowloon Tong" }]
  },
  {
    id: 'cairo', name: 'Cairo', color: '#FF8200', center: { lat: 30.0444, lon: 31.2357 }, difficulty: 1.4,
    bounds: { minLat: 29.95, maxLat: 30.15, minLon: 31.15, maxLon: 31.35 },
    water: [
      // River Nile
      [
        { lat: 29.95, lon: 31.22 }, { lat: 30.00, lon: 31.23 }, { lat: 30.05, lon: 31.23 }, 
        { lat: 30.15, lon: 31.25 }, { lat: 30.15, lon: 31.27 }, { lat: 30.05, lon: 31.25 }, 
        { lat: 30.00, lon: 31.25 }, { lat: 29.95, lon: 31.24 }
      ]
    ],
    initialStations: [{ id: 19, type: 'circle', lat: 30.046, lon: 31.236, name: "Sadat" }, { id: 20, type: 'square', lat: 30.062, lon: 31.246, name: "Ramses" }, { id: 21, type: 'triangle', lat: 30.031, lon: 31.211, name: "Dokki" }]
  }
];
