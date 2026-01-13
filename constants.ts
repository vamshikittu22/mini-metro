
import { GameMode } from './types';

export const THEME = {
  background: '#F8F4EE', 
  water: '#D8E2EB',      
  grid: '#EBE5DA',       
  menuBg: '#1A1A1A',
  text: '#1A1A1A',
  menuText: '#FFFFFF',
  accentBlue: '#3E86C6',
  accentGreen: '#2ECC71',
  stationStroke: '#1A1A1A',
  uiBorder: '#1A1A1A',
  uiShadow: 'rgba(0,0,0,1)',
  lineColors: [
    '#EF3340', // Red
    '#0038A8', // Royal Blue
    '#009639', // Green
    '#FFD100', // Yellow
    '#72246C', // Purple
    '#FF8200', // Orange
    '#E40066', // Magenta/Pink
    '#00AFAD', // Cyan
    '#8B4513', // Brown
    '#707070'  // Steel Gray
  ],
  lineWidth: 8,
  stationSize: 22,
  passengerSize: 8,
  trainWidth: 54,  
  trainHeight: 30, 
  timerThreshold: 10000, 
};

export const GAME_CONFIG = {
  maxPassengers: 8,
  softCapacity: 6,
  trainCapacity: 6, 
  spawnRate: 4000, 
  stationSpawnRate: 30000, 
  trainSpeed: 0.002, 
  // Ratios to prevent "unwinnable" resource scenarios
  spawnRatios: {
    stationsPerTrain: 4,      // Max stations per active train
    stationsPerWaterResource: 1.2, // Max isolated water stations per bridge/tunnel
    difficultyMultiplier: 0.8  // Higher difficulty lowers the allowance
  },
  baseResources: {
    lines: 3,
    trains: 2,
    tunnels: 2,
    bridges: 1,
    wagons: 2
  }
};

export const MODE_CONFIG: Record<GameMode, {
  spawnMultiplier: number;
  overflowEnabled: boolean;
  resourceMultiplier: number;
  maxTransferDepth: number;
  infiniteResources: boolean;
}> = {
  NORMAL: {
    spawnMultiplier: 1.0,
    overflowEnabled: true,
    resourceMultiplier: 1.0,
    maxTransferDepth: 2,
    infiniteResources: false
  },
  EXTREME: {
    spawnMultiplier: 1.5,
    overflowEnabled: true,
    resourceMultiplier: 1.0,
    maxTransferDepth: 1,
    infiniteResources: false
  },
  ENDLESS: {
    spawnMultiplier: 1.0,
    overflowEnabled: false,
    resourceMultiplier: 1.0,
    maxTransferDepth: 3,
    infiniteResources: false
  },
  CREATIVE: {
    spawnMultiplier: 0.5,
    overflowEnabled: false,
    resourceMultiplier: 2.0,
    maxTransferDepth: 4,
    infiniteResources: true
  }
};

export const CITY_STATION_POOLS: Record<string, string[]> = {
  london: ["Victoria", "Paddington", "King's Cross", "Oxford Circus", "Waterloo", "Chelsea", "Westminster", "Liverpool St", "Euston", "Bond St", "South Kensington", "Green Park"],
  paris: ["Châtelet", "Gare du Nord", "Montparnasse", "Bastille", "République", "Opéra", "Étoile", "Louvre", "Pigalle", "Saint-Lazare", "Nation", "Place d'Italie"],
  nyc: ["Grand Central", "Penn Station", "Times Square", "Wall Street", "Fulton St", "Canal St", "Union Sq", "Atlantic Av", "Columbus Circle", "World Trade Center", "High St", "Bedford Av"],
  tokyo: ["Shinjuku", "Shibuya", "Tokyo", "Ueno", "Ginza", "Roppongi", "Asakusa", "Akihabara", "Ikebukuro", "Shinagawa", "Omotesando", "Ebisu"],
  berlin: ["Hauptbahnhof", "Alexanderplatz", "Zool. Garten", "Friedrichstr.", "Potsdamer Platz", "Warschauer Str.", "Ostkreuz", "Hallesches Tor", "Kottbusser Tor", "Sudkreuz"],
  hk: ["Central", "Admiralty", "Tsim Sha Tsui", "Mong Kok", "Kowloon Tong", "Causeway Bay", "Wan Chai", "North Point", "Quarry Bay", "Tai Koo", "Yau Ma Tei", "Jordan"],
  cairo: ["Sadat", "Nasser", "Shohadaa", "Dokki", "Opera", "Attaba", "Ramses", "Giza", "Maadi", "Heliopolis", "Zamalek", "Sayeda Zeinab"]
};
