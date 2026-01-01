
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
};

export const CITY_STATION_POOLS: Record<string, string[]> = {
  london: ["Victoria", "Paddington", "King's Cross", "Oxford Circus", "Waterloo", "Chelsea", "Westminster", "Liverpool St", "Euston", "Bond St"],
  paris: ["Châtelet", "Gare du Nord", "Montparnasse", "Bastille", "République", "Opéra", "Étoile", "Louvre", "Pigalle", "Saint-Lazare"],
  nyc: ["Grand Central", "Penn Station", "Times Square", "Wall Street", "Fulton St", "Canal St", "Union Sq", "Atlantic Av", "Columbus Circle", "World Trade Center"]
};
