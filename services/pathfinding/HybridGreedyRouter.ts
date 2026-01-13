
import { Passenger, Train, Station, GameState, TransitLine } from '../../types';
import { RouteEvaluator } from './RouteEvaluator';
import { PATHFINDING_CONFIG } from '../../constants/pathfinding.config';
import { MODE_CONFIG } from '../../constants';

export class HybridGreedyRouter {
  /**
   * Retrieves all stations that the train will visit in its current direction before turning around.
   */
  private getFutureStops(train: Train, line: TransitLine, state: GameState): Station[] {
    const stops: Station[] = [];
    if (train.direction === 1) {
      for (let i = train.nextStationIndex; i < line.stations.length; i++) {
        const sId = line.stations[i];
        const s = state.stations.find(st => st.id === sId);
        if (s) stops.push(s);
      }
    } else if (train.direction === -1) {
      for (let i = train.nextStationIndex; i >= 0; i--) {
        const sId = line.stations[i];
        const s = state.stations.find(st => st.id === sId);
        if (s) stops.push(s);
      }
    }
    return stops;
  }

  /**
   * Determines if a passenger should board a specific train at the current station.
   */
  shouldPassengerBoard(
    passenger: Passenger,
    train: Train,
    currentStation: Station,
    state: GameState
  ): { shouldBoard: boolean; reason: string; alternativeLines?: number[] } {
    const trainLine = state.lines.find(l => l.id === train.lineId);
    if (!trainLine) return { shouldBoard: false, reason: 'no_line' };

    const maxDepth = MODE_CONFIG[state.mode].maxTransferDepth;

    // 1. Verify if this train's line can reach the destination within max transfer depth
    const canReach = RouteEvaluator.canLineReachDestination(
      trainLine,
      passenger.destinationShape,
      maxDepth,
      state
    );

    if (!canReach) return { shouldBoard: false, reason: 'no_path' };

    // 2. Identify all valid transit options available at this station
    const validLines = RouteEvaluator.findValidLines(currentStation, passenger.destinationShape, state);

    // 3. Compare the current train's line against other available lines at the station
    const betterLines = validLines.filter(l => 
      l.id !== train.lineId && RouteEvaluator.getBetterLine(l, trainLine, passenger.destinationShape, state)?.id === l.id
    );

    // 4. Preference logic: If a significantly better line exists, the passenger may choose to wait
    if (betterLines.length > 0) {
      if (passenger.waitStartTime === undefined) {
        passenger.waitStartTime = Date.now();
        if (PATHFINDING_CONFIG.ENABLE_DECISION_LOGS) {
          console.debug(`Passenger ${passenger.id} waiting for better line at ${currentStation.name}`);
        }
        return { shouldBoard: false, reason: 'waiting_for_better' };
      } else {
        const waitedTime = Date.now() - passenger.waitStartTime;
        if (waitedTime < PATHFINDING_CONFIG.PREFERENCE_WAIT_TIME) {
          return { shouldBoard: false, reason: 'keep_waiting' };
        } else {
          // Board anyway if waited too long for a "better" train
          return { shouldBoard: true, reason: 'waited_long_enough' };
        }
      }
    }

    // 5. Directional check: Is the train actually heading towards the destination on its current leg?
    const futureStops = this.getFutureStops(train, trainLine, state);
    const hasDirectOnPath = futureStops.some(s => s.type === passenger.destinationShape);
    
    return { 
      shouldBoard: true, 
      reason: hasDirectOnPath ? 'direct_route_on_path' : 'line_reaches_destination' 
    };
  }

  /**
   * Determines if a passenger should alight (exit) the train at the current station.
   */
  shouldPassengerAlight(
    passenger: Passenger,
    currentStation: Station,
    train: Train,
    state: GameState
  ): { action: 'DELIVER' | 'TRANSFER' | 'STAY'; targetLineId?: number; reason: string } {
    // 1. Delivery Check: If this station matches the passenger's destination shape
    if (currentStation.type === passenger.destinationShape) {
      return { action: 'DELIVER', reason: 'reached_destination' };
    }

    const trainLine = state.lines.find(l => l.id === train.lineId);
    if (!trainLine) return { action: 'STAY', reason: 'no_line' };

    const maxDepth = MODE_CONFIG[state.mode].maxTransferDepth;

    // 2. Transfer Check: Dynamically find all other lines passing through this station
    const otherConnectedLines = state.lines.filter(l => l.stations.includes(currentStation.id) && l.id !== train.lineId);

    // 3. Evaluation: Is any other line passing through here strictly better than the current one?
    const betterLines = otherConnectedLines.filter(l => {
      const isBetter = RouteEvaluator.getBetterLine(l, trainLine, passenger.destinationShape, state)?.id === l.id;
      const canReach = RouteEvaluator.canLineReachDestination(l, passenger.destinationShape, maxDepth, state);
      return isBetter && canReach;
    });

    // 4. If a better line exists at this station, initiate a transfer
    if (betterLines.length > 0) {
      return { action: 'TRANSFER', targetLineId: betterLines[0].id, reason: 'transfer_for_better_route' };
    }

    // 5. Default: Stay on the current train if no delivery or better transfer is available
    return { action: 'STAY', reason: 'no_better_option' };
  }

  /**
   * Resets the preference timer for a passenger (e.g. after boarding or transferring).
   */
  resetWaitTimer(passenger: Passenger) {
    passenger.waitStartTime = undefined;
  }

  /**
   * Checks if a passenger has become stranded (no reachable paths) for an extended duration.
   */
  isPassengerStranded(passenger: Passenger, station: Station, state: GameState): boolean {
    const validLines = RouteEvaluator.findValidLines(station, passenger.destinationShape, state);
    if (validLines.length === 0) {
      const totalWaitTime = Date.now() - passenger.spawnTime;
      return totalWaitTime >= PATHFINDING_CONFIG.STRANDED_TIMEOUT;
    }
    return false;
  }
}
