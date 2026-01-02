import { Station, TransitLine, StationType, GameState } from '../../types';
import { PATHFINDING_CONFIG } from '../../constants/pathfinding.config';

export class RouteEvaluator {
  private static reachabilityCache = new Map<string, boolean>();
  private static costCache = new Map<string, number>();

  /**
   * Clears all pathfinding caches. Should be called whenever the network topology changes.
   */
  static clearCache() {
    this.reachabilityCache.clear();
    this.costCache.clear();
  }

  /**
   * Checks if a specific line can reach a destination station type within a set number of transfers.
   * GameState is passed to allow looking up stations and line connectivity.
   */
  static canLineReachDestination(
    line: TransitLine,
    destinationShape: StationType,
    maxDepth: number,
    state: GameState
  ): boolean {
    const cacheKey = `${line.id}_${destinationShape}_${maxDepth}`;
    if (this.reachabilityCache.has(cacheKey)) {
      return this.reachabilityCache.get(cacheKey)!;
    }

    const result = this.findRouteDepth(line, destinationShape, 0, maxDepth, new Set(), state) !== null;
    this.reachabilityCache.set(cacheKey, result);
    return result;
  }

  /**
   * Recursive depth-limited search to find a path to a destination shape across transit lines.
   * Always look up stations and connected lines using the provided GameState.
   */
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

    const newVisited = new Set(visitedLines);
    newVisited.add(line.id);

    // Check if this line has a station with the requested destination shape
    const hasDest = line.stations.some(sId => {
      const s = state.stations.find(st => st.id === sId);
      return s && s.type === destShape;
    });

    if (hasDest) return currentDepth;

    // Recursive case: For each station on this line, check for transfers to other connected lines
    for (const sId of line.stations) {
      // Dynamically filter lines at this station to check for transfers
      const connectedLines = state.lines.filter(l => l.id !== line.id && l.stations.includes(sId));
      
      for (const nextLine of connectedLines) {
        const depth = this.findRouteDepth(nextLine, destShape, currentDepth + 1, maxDepth, newVisited, state);
        if (depth !== null) return depth;
      }
    }

    return null;
  }

  /**
   * Calculates a heuristic cost for a line to reach a destination.
   * Direct routes are cheaper than transfers.
   */
  static calculateRouteCost(line: TransitLine, destShape: StationType, state: GameState): number {
    const cacheKey = `${line.id}_${destShape}`;
    if (this.costCache.has(cacheKey)) {
      return this.costCache.get(cacheKey)!;
    }

    const destIdx = line.stations.findIndex(sId => {
      const s = state.stations.find(st => st.id === sId);
      return s && s.type === destShape;
    });

    let result: number;

    if (destIdx !== -1) {
      // Direct route cost: (approximate distance in stations) * weight
      result = destIdx * PATHFINDING_CONFIG.COSTS.DIRECT_ROUTE;
    } else {
      // Transfer route evaluation: find the cheapest transfer at any station on the current line
      let minTransferCost = Infinity;
      for (let i = 0; i < line.stations.length; i++) {
        const sId = line.stations[i];
        // Look up other lines at this station
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
      result = minTransferCost;
    }

    this.costCache.set(cacheKey, result);
    return result;
  }

  /**
   * Finds all lines passing through a station that can eventually reach the target destination shape.
   */
  static findValidLines(station: Station, destinationShape: StationType, state: GameState): TransitLine[] {
    // Find all lines passing through this specific station
    const stationLines = state.lines.filter(l => l.stations.includes(station.id));
    
    return stationLines.filter(line => 
      this.canLineReachDestination(line, destinationShape, PATHFINDING_CONFIG.MAX_TRANSFER_DEPTH, state)
    );
  }

  /**
   * Compares two lines and returns the one with a lower estimated cost to reach the destination shape.
   */
  static getBetterLine(line1: TransitLine, line2: TransitLine, destShape: StationType, state: GameState): TransitLine | null {
    const cost1 = this.calculateRouteCost(line1, destShape, state);
    const cost2 = this.calculateRouteCost(line2, destShape, state);
    
    if (cost1 < cost2) return line1;
    if (cost2 < cost1) return line2;
    return null;
  }
}