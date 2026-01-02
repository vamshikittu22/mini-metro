export const PATHFINDING_CONFIG = {
  PREFERENCE_WAIT_TIME: 10000, // 10 seconds (how long passengers wait for better route)
  MAX_TRANSFER_DEPTH: 2, // maximum transfers allowed
  STRANDED_TIMEOUT: 30000, // 30 seconds (when to remove impossible passengers)
  COSTS: { 
    DIRECT_ROUTE: 1, 
    TRANSFER_PENALTY: 3, 
    LOOP_PENALTY: 2 
  },
  ENABLE_DECISION_LOGS: false
};