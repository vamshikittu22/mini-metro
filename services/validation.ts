import { GameState, City, StationType } from '../types';
import { InventoryManager } from './inventoryManager';
import { RouteEvaluator } from './pathfinding/RouteEvaluator';

export class SystemValidator {
  /**
   * State Integrity Check: Verifies Total === Active + Available.
   * Force-corrects the available pool if a leak is detected.
   */
  static validateSystemState(state: GameState, city: City) {
    if (state.mode === 'CREATIVE') return true;

    // 1. Calculate Active Assets
    const active = {
      lines: state.lines.length,
      trains: 0,
      wagons: 0,
      tunnels: 0,
      bridges: 0,
    };

    state.lines.forEach(line => {
      active.trains += line.trains.length;
      active.wagons += line.trains.reduce((sum, t) => sum + t.wagons, 0);
      
      line.segments?.forEach(seg => {
        if (seg.crossing === 'tunnel') active.tunnels++;
        if (seg.crossing === 'bridge') active.bridges++;
      });
    });

    // 2. Cross-check against invariants
    let integrityViolation = false;
    const resourceKeys = ['lines', 'trains', 'tunnels', 'bridges', 'wagons'] as const;

    resourceKeys.forEach(key => {
      const calculatedAvailable = state.totalResources[key] - active[key];
      if (state.resources[key] !== calculatedAvailable) {
        console.warn(`[AUDIT] Resource leak detected in ${key}. Correcting: ${state.resources[key]} -> ${calculatedAvailable}`);
        state.resources[key] = Math.max(0, calculatedAvailable);
        integrityViolation = true;
      }
    });

    return !integrityViolation;
  }

  /**
   * Pathfinding Stress Test: Headless verification of the routing engine using Hybrid Greedy logic.
   * Simulates 100 passengers and calculates reachability rate.
   */
  static runPathfindingStressTest(state: GameState, engine: any): { successRate: number, paths: number } {
    if (state.stations.length < 2 || state.lines.length === 0) return { successRate: 0, paths: 0 };

    let successes = 0;
    const iterations = 100;
    const stationTypes: StationType[] = ['circle', 'square', 'triangle', 'pentagon', 'star'];

    for (let i = 0; i < iterations; i++) {
      const startStation = state.stations[Math.floor(Math.random() * state.stations.length)];
      const targetType = stationTypes[Math.floor(Math.random() * stationTypes.length)] as StationType;
      
      // Skip if start station is already the target type
      if (startStation.type === targetType) {
        successes++;
        continue;
      }

      // Check if any line at the start station can reach the destination via Hybrid Greedy evaluation
      const validLines = RouteEvaluator.findValidLines(startStation, targetType, state);
      if (validLines.length > 0) {
        successes++;
      }
    }

    const rate = (successes / iterations) * 100;
    console.debug(`[AUDIT] Pathfinding Stress Test: ${rate}% Reachability Rate (${successes}/${iterations})`);
    return { successRate: rate, paths: successes };
  }
}