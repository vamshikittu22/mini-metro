
import { Passenger, Train, Station, GameState, TransitLine } from '../../types';
import { RouteEvaluator } from './RouteEvaluator';
import { PATHFINDING_CONFIG } from '../../constants/pathfinding.config';

interface CachedDecision {
  result: { shouldBoard: boolean; reason: string; alternativeLines?: number[] };
  timestamp: number;
}

export class HybridGreedyRouter {
  // Performance Cache: Prevents recalculating boarding logic 60 times a second for every passenger
  private boardingCache = new Map<string, CachedDecision>();
  private lastTopologyHash: string = '';

  /**
   * Clears the boarding decision cache.
   */
  clearCache() {
    this.boardingCache.clear();
  }

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

  shouldPassengerBoard(
    passenger: Passenger,
    train: Train,
    currentStation: Station,
    state: GameState
  ): { shouldBoard: boolean; reason: string; alternativeLines?: number[] } {
    // 0. Cache & Topology Check
    const currentHash = `${state.lines.length}_${state.stations.length}`;
    if (currentHash !== this.lastTopologyHash) {
      this.clearCache();
      this.lastTopologyHash = currentHash;
    }

    const cacheKey = `${passenger.id}_${train.id}`;
    const cached = this.boardingCache.get(cacheKey);
    const TTL = 5000; // 5 seconds
    if (cached && Date.now() - cached.timestamp < TTL) {
      return cached.result;
    }

    const trainLine = state.lines.find(l => l.id === train.lineId);
    if (!trainLine) return { shouldBoard: false, reason: 'no_line' };

    // 1. Path check
    const canReach = RouteEvaluator.canLineReachDestination(
      trainLine,
      passenger.destinationShape,
      PATHFINDING_CONFIG.MAX_TRANSFER_DEPTH,
      state
    );

    let result: { shouldBoard: boolean; reason: string; alternativeLines?: number[] };

    if (!canReach) {
      result = { shouldBoard: false, reason: 'no_path' };
    } else {
      const validLines = RouteEvaluator.findValidLines(currentStation, passenger.destinationShape, state);
      const betterLines = validLines.filter(l => 
        l.id !== train.lineId && RouteEvaluator.getBetterLine(l, trainLine, passenger.destinationShape, state)?.id === l.id
      );

      if (betterLines.length > 0) {
        if (passenger.waitStartTime === undefined) {
          passenger.waitStartTime = Date.now();
          result = { shouldBoard: false, reason: 'waiting_for_better' };
        } else {
          const waitedTime = Date.now() - passenger.waitStartTime;
          if (waitedTime < PATHFINDING_CONFIG.PREFERENCE_WAIT_TIME) {
            result = { shouldBoard: false, reason: 'keep_waiting' };
          } else {
            result = { shouldBoard: true, reason: 'waited_long_enough' };
          }
        }
      } else {
        const futureStops = this.getFutureStops(train, trainLine, state);
        const hasDirectOnPath = futureStops.some(s => s.type === passenger.destinationShape);
        result = { 
          shouldBoard: true, 
          reason: hasDirectOnPath ? 'direct_route_on_path' : 'line_reaches_destination' 
        };
      }
    }

    // Cache the outcome
    this.boardingCache.set(cacheKey, { result, timestamp: Date.now() });
    return result;
  }

  shouldPassengerAlight(
    passenger: Passenger,
    currentStation: Station,
    train: Train,
    state: GameState
  ): { action: 'DELIVER' | 'TRANSFER' | 'STAY'; targetLineId?: number; reason: string } {
    if (currentStation.type === passenger.destinationShape) {
      return { action: 'DELIVER', reason: 'reached_destination' };
    }

    const trainLine = state.lines.find(l => l.id === train.lineId);
    if (!trainLine) return { action: 'STAY', reason: 'no_line' };

    const otherConnectedLines = state.lines.filter(l => l.stations.includes(currentStation.id) && l.id !== train.lineId);
    const betterLines = otherConnectedLines.filter(l => {
      const isBetter = RouteEvaluator.getBetterLine(l, trainLine, passenger.destinationShape, state)?.id === l.id;
      const canReach = RouteEvaluator.canLineReachDestination(l, passenger.destinationShape, PATHFINDING_CONFIG.MAX_TRANSFER_DEPTH, state);
      return isBetter && canReach;
    });

    if (betterLines.length > 0) {
      return { action: 'TRANSFER', targetLineId: betterLines[0].id, reason: 'transfer_for_better_route' };
    }

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
