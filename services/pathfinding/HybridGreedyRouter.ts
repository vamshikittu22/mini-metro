
import { Passenger, Train, Station, GameState, TransitLine } from '../../types';
import { RouteEvaluator } from './RouteEvaluator';
import { PATHFINDING_CONFIG } from '../../constants/pathfinding.config';

export class HybridGreedyRouter {
  shouldPassengerBoard(
    passenger: Passenger,
    train: Train,
    currentStation: Station,
    state: GameState
  ): { shouldBoard: boolean; reason: string; alternativeLines?: number[] } {
    const trainLine = state.lines.find(l => l.id === train.lineId);
    if (!trainLine) return { shouldBoard: false, reason: 'no_line' };

    // 1. Check if train.line can reach passenger.destinationShape
    const canReach = RouteEvaluator.canLineReachDestination(
      trainLine,
      passenger.destinationShape,
      PATHFINDING_CONFIG.MAX_TRANSFER_DEPTH,
      state
    );

    if (!canReach) return { shouldBoard: false, reason: 'no_path' };

    // 2. Find all valid lines at currentStation
    const validLines = RouteEvaluator.findValidLines(currentStation, passenger.destinationShape, state);

    // 3. Filter for lines that are BETTER than train.line
    const betterLines = validLines.filter(l => 
      l.id !== train.lineId && RouteEvaluator.getBetterLine(l, trainLine, passenger.destinationShape, state)?.id === l.id
    );

    // 4. If better lines exist
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
          return { shouldBoard: true, reason: 'waited_long_enough' };
        }
      }
    }

    // 5. If no better lines exist
    const hasDirect = trainLine.stations.some(sId => state.stations.find(st => st.id === sId)?.type === passenger.destinationShape);
    return { 
      shouldBoard: true, 
      reason: hasDirect ? 'direct_route' : 'transfer_available' 
    };
  }

  shouldPassengerAlight(
    passenger: Passenger,
    currentStation: Station,
    train: Train,
    state: GameState
  ): { action: 'DELIVER' | 'TRANSFER' | 'STAY'; targetLineId?: number; reason: string } {
    // 1. Destination check
    if (currentStation.type === passenger.destinationShape) {
      return { action: 'DELIVER', reason: 'reached_destination' };
    }

    const trainLine = state.lines.find(l => l.id === train.lineId);
    if (!trainLine) return { action: 'STAY', reason: 'no_line' };

    // 2. Get all connected lines at station
    const connectedLines = state.lines.filter(l => l.stations.includes(currentStation.id) && l.id !== train.lineId);

    // 3. Filter for lines that are BETTER than train.line
    const betterLines = connectedLines.filter(l => {
      const isBetter = RouteEvaluator.getBetterLine(l, trainLine, passenger.destinationShape, state)?.id === l.id;
      const canReach = RouteEvaluator.canLineReachDestination(l, passenger.destinationShape, PATHFINDING_CONFIG.MAX_TRANSFER_DEPTH, state);
      return isBetter && canReach;
    });

    // 4. If better lines exist
    if (betterLines.length > 0) {
      return { action: 'TRANSFER', targetLineId: betterLines[0].id, reason: 'transfer_for_better_route' };
    }

    // 5. Else stay
    return { action: 'STAY', reason: 'no_better_option' };
  }

  resetWaitTimer(passenger: Passenger) {
    passenger.waitStartTime = undefined;
  }

  isPassengerStranded(passenger: Passenger, station: Station, state: GameState): boolean {
    const validLines = RouteEvaluator.findValidLines(station, passenger.destinationShape, state);
    if (validLines.length === 0) {
      const totalWaitTime = Date.now() - passenger.spawnTime;
      return totalWaitTime >= PATHFINDING_CONFIG.STRANDED_TIMEOUT;
    }
    return false;
  }
}
