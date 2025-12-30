
export const THEME = {
  background: '#F8F4EE',
  text: '#2F3436',
  stationStroke: '#2F3436',
  stationFill: '#FFFFFF',
  lineColors: [
    '#EB2827', // Red
    '#019AD1', // Blue
    '#51A03E', // Green
    '#FBAE17', // Yellow
    '#A05DA5'  // Purple
  ],
  lineWidth: 8,
  stationSize: 12,
  passengerSize: 4,
  trainWidth: 20,
  trainHeight: 10,
  timerThreshold: 15000, // 15 seconds to overcrowding failure
  minZoom: 0.3,
  maxZoom: 2.0
};

export const GAME_CONFIG = {
  maxPassengers: 6,
  trainCapacity: 6,
  spawnRate: 4000, // New passenger every 4 seconds
  stationSpawnRate: 30000, // New station every 30 seconds
  trainSpeed: 0.002, // Distance per frame
};
