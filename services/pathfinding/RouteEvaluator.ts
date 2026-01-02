
import { Station, TransitLine, StationType, GameState } from '../../types';
import { PATHFINDING_CONFIG } from '../../constants/pathfinding.config';

export class RouteEvaluator {
  static canLineReachDestination(
    line: TransitLine,
    destinationShape: StationType,
    maxDepth: number,
    state: GameState
  ): boolean {
    return this.findRouteDepth(line, destinationShape, 0, maxDepth, new Set(), state) !== null;
  }

  static findRouteDepth(
    line: TransitLine,
    destShape: StationType,
    currentDepth: number,
    maxDepth: number,
    visitedLines: Set<number>,
    state: GameState
  ): number | null {
    if (currentDepth > maxDepth) return null;
    if (visitedLines.has(line.id)) return null;

    visitedLines.add(line.id);

    // Check if this line has a station with destShape
    const hasDest = line.stations.some(sId => {
      const s = state.stations.find(st => st.id === sId);
      return s && s.type === destShape;
    });

    if (hasDest) return currentDepth;

    // Recursive case: For each station on this line, check other lines
    for (const sId of line.stations) {
      const connectedLines = state.lines.filter(l => l.id !== line.id && l.stations.includes(sId));
      for (const nextLine of connectedLines) {
        const depth = this.findRouteDepth(nextLine, destShape, currentDepth + 1, maxDepth, new Set(visitedLines), state);
        if (depth !== null) return depth;
      }
    }

    return null;
  }

  static calculateRouteCost(line: TransitLine, destShape: StationType, state: GameState): number {
    const destIdx = line.stations.findIndex(sId => {
      const s = state.stations.find(st => st.id === sId);
      return s && s.type === destShape;
    });

    if (destIdx !== -1) {
      // Direct route: cost is index (approx distance) * multiplier
      return destIdx * PATHFINDING_CONFIG.COSTS.DIRECT_ROUTE;
    }

    // Check for transfer
    let minTransferCost = Infinity;
    for (let i = 0; i < line.stations.length; i++) {
      const sId = line.stations[i];
      const otherLines = state.lines.filter(l => l.id !== line.id && l.stations.includes(sId));
      for (const ol of otherLines) {
        const hasDestOnOther = ol.stations.some(sid => {
          const s = state.stations.find(st => st.id === sid);
          return s && s.type === destShape;
        });

        if (hasDestOnOther) {
          const cost = i + PATHFINDING_CONFIG.COSTS.TRANSFER_PENALTY;
          if (cost < minTransferCost) minTransferCost = cost;
        }
      }
    }

    return minTransferCost;
  }

  static findValidLines(station: Station, destinationShape: StationType, state: GameState): TransitLine[] {
    const stationLines = state.lines.filter(l => l.stations.includes(station.id));
    return stationLines.filter(line => 
      this.canLineReachDestination(line, destinationShape, PATHFINDING_CONFIG.MAX_TRANSFER_DEPTH, state)
    );
  }

  static getBetterLine(line1: TransitLine, line2: TransitLine, destShape: StationType, state: GameState): TransitLine | null {
    const cost1 = this.calculateRouteCost(line1, destShape, state);
    const cost2 = this.calculateRouteCost(line2, destShape, state);
    
    if (cost1 < cost2) return line1;
    if (cost2 < cost1) return line2;
    return null;
  }
}
