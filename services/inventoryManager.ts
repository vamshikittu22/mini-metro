import { GameState, City } from '../types';

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
      active.trains += line.trains.length;
      active.wagons += line.trains.reduce((sum, t) => sum + t.wagons, 0);
      
      // Use segment metadata for accurate resource counting
      line.segments?.forEach(seg => {
        if (seg.crossing === 'tunnel') active.tunnels++;
        if (seg.crossing === 'bridge') active.bridges++;
      });
    });

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