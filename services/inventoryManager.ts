
import { GameState, City, TransitLine } from '../types';
import { isSegmentCrossingWater } from './geometry';

export class InventoryManager {
  /**
   * Internal Audit: Validates Active + Available === Total.
   * If a discrepancy is detected, Available is force-corrected to restore balance.
   */
  static validateInventory(state: GameState, city: City) {
    if (state.mode === 'CREATIVE') return;

    // 1. Calculate what is actually on the map
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

    // Allocate resources to crossings: prefer tunnels, then bridges
    let remainingCrossings = waterCrossings;
    
    // Max tunnels we have
    const tunnelBudget = state.totalResources.tunnels;
    active.tunnels = Math.min(remainingCrossings, tunnelBudget);
    remainingCrossings -= active.tunnels;

    // Max bridges we have
    const bridgeBudget = state.totalResources.bridges;
    active.bridges = Math.min(remainingCrossings, bridgeBudget);
    remainingCrossings -= active.bridges;

    // 2. Cross-reference against Total Invariant and force-sync "Available"
    (Object.keys(state.totalResources) as Array<keyof typeof state.totalResources>).forEach(key => {
      const liveActive = active[key] || 0;
      const liveTotal = state.totalResources[key];

      state.resources[key] = Math.max(0, liveTotal - liveActive);
    });
  }

  /**
   * Applies a reward choice to the global resource pool.
   */
  static applyReward(state: GameState, bonus: any) {
    (Object.keys(bonus) as Array<keyof typeof state.resources>).forEach(key => {
      const amount = bonus[key];
      if (amount) {
        state.totalResources[key] += amount;
      }
    });
  }
}
