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

    state.lines.forEach(line => {
      // Each line uses 1 train by default if it has stations
      active.trains += line.trains.length;
      active.wagons += line.trains.reduce((sum, t) => sum + t.wagons, 0);
      
      // Audit segments for water crossings
      for (let i = 0; i < line.stations.length - 1; i++) {
        const s1 = state.stations.find(s => s.id === line.stations[i]);
        const s2 = state.stations.find(s => s.id === line.stations[i + 1]);
        if (s1 && s2 && isSegmentCrossingWater(s1, s2, city)) {
          // Rule: Even lines use tunnels, odd lines use bridges (consistent with GameEngine)
          if (line.id % 2 === 0) active.tunnels++;
          else active.bridges++;
        }
      }
    });

    // 2. Cross-reference against Total Invariant and force-sync "Available"
    (Object.keys(state.totalResources) as Array<keyof typeof state.totalResources>).forEach(key => {
      const liveActive = active[key] || 0;
      const liveTotal = state.totalResources[key];

      // Available = Total - Active
      // This ensures the count is always balanced.
      state.resources[key] = Math.max(0, liveTotal - liveActive);
    });
  }

  /**
   * Performs a clean return of all assets on a line to the available pool.
   * Note: validateInventory will handle the actual subtraction logic.
   */
  static refundLine(state: GameState, line: TransitLine, city: City) {
    // In our centralized logic, we don't strictly need to increment here
    // because validateInventory is called immediately after line deletion.
    // However, it's good practice for manual updates.
    if (state.mode === 'CREATIVE') return;
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