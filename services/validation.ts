
import { GameState, City, StationType } from '../types';
import { InventoryManager } from './inventoryManager';
import { isSegmentCrossingWater } from './geometry';
import { RouteEvaluator } from './pathfinding/RouteEvaluator';
import { MODE_CONFIG } from '../constants';

export class SystemValidator {
  /**
   * State Integrity Check: Verifies Total === Active + Available.
   * Force-corrects the available pool if a leak is detected.
   */
  static validateSystemState(state: GameState, city: City) {
    if (MODE_CONFIG[state.mode].infiniteResources) return true;

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
   * Quantifies the system's structural integrity.
   * 100 = Perfect resource accounting.
   * Drops based on discrepancies and network bottlenecks.
   */
  static calculateIntegrityScore(state: GameState, city: City): number {
    if (MODE_CONFIG[state.mode].infiniteResources) return 100;

    // Resource Discrepancy Component
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
        if (s1 && s2 && isSegmentCrossingWater(s1, s2, city)) waterCrossings++;
      }
    });

    let remainingCrossings = waterCrossings;
    const tunnelBudget = Math.min(remainingCrossings, state.totalResources.tunnels);
    remainingCrossings -= tunnelBudget;
    const bridgeBudget = Math.min(remainingCrossings, state.totalResources.bridges);

    const resourceKeys = ['lines', 'trains', 'tunnels', 'bridges', 'wagons'] as const;
    let discrepancies = 0;
    resourceKeys.forEach(key => {
      let calcActive = active[key];
      if (key === 'tunnels') calcActive = tunnelBudget;
      if (key === 'bridges') calcActive = bridgeBudget;
      
      const calculatedAvailable = state.totalResources[key] - calcActive;
      if (state.resources[key] !== calculatedAvailable) discrepancies++;
    });

    // Score Calculation:
    // Discrepancies reduce the score (Primary factor)
    let score = 100 - (discrepancies * 20);
    
    // Efficiency Component: Overloaded stations also impact "Integrity" of service
    const overloadedRatio = state.overloadedStationsCount / (state.stations.length || 1);
    score -= (overloadedRatio * 30); // Max -30 for complete overload

    return Math.max(0, Math.round(score));
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
