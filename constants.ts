
export const THEME = {
  background: '#F8F4EE',
  text: '#2F3436',
  stationStroke: '#2F3436',
  stationFill: '#FFFFFF',
  lineColors: [
    '#EB2827', // Red (Central)
    '#019AD1', // Blue (Piccadilly)
    '#51A03E', // Green (District)
    '#FBAE17', // Yellow (Circle)
    '#A05DA5', // Purple (Metropolitan)
    '#F15B22', // Orange (Bakerloo)
    '#00A3E0', // Cyan (Victoria)
    '#9B9B9B', // Grey (Jubilee)
    '#F3A9BB', // Pink (Hammersmith)
    '#00782A'  // Dark Green (Overground)
  ],
  lineWidth: 8,
  stationSize: 12,
  passengerSize: 4,
  trainWidth: 20,
  trainHeight: 10,
  timerThreshold: 10000, // 10 seconds to overcrowding failure
  minZoom: 0.3,
  maxZoom: 2.0
};

export const GAME_CONFIG = {
  maxPassengers: 6,
  trainCapacity: 6,
  spawnRate: 4000, // New passenger every 4 seconds
  stationSpawnRate: 30000, // New station every 30 seconds
  trainSpeed: 0.002, // Distance per frame
  MAX_GAME_TIME: 600000, // 10 minutes in milliseconds
};
