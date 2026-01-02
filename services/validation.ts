import { GameState, City, StationType } from '../types';
import { InventoryManager } from './inventoryManager';
import { isSegmentCrossingWater } from './geometry';
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

    let waterCrossings = 0;

    state.lines.forEach(line => {
      active.trains += line.trains.length;
      active.wagons += line.trains.reduce((sum, t) => sum + t.wagons, 0);
      
      for (let i = 0; i < line.stations.length - 1; i++) {
        const s1 = state.stations.find(s => s.id === line.stations[i]);
        const s2 = state.stations.find(s => s.id === line.stations[i + 1]);
        if (s1 && s2 && isSegmentCrossingWater(s1, s2, city)) {
          waterCrossings++;
        }
      }
    });

    // Allocate resources to crossings using the same shared pool logic as InventoryManager
    let remainingCrossings = waterCrossings;
    active.tunnels = Math.min(remainingCrossings, state.totalResources.tunnels);
    remainingCrossings -= active.tunnels;
    active.bridges = Math.min(remainingCrossings, state.totalResources.bridges);

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