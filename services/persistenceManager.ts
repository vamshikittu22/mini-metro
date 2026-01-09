
import { GameState, City } from '../types';

const STORAGE_KEY = 'mini-metro-web-save';

export interface SaveData {
  state: GameState;
  camera: { x: number; y: number; scale: number };
  timestamp: number;
}

export class PersistenceManager {
  static saveGame(state: GameState, camera: { x: number; y: number; scale: number }) {
    try {
      const saveData: SaveData = {
        state,
        camera,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    } catch (e) {
      console.error('Failed to save game state:', e);
    }
  }

  static loadGame(): SaveData | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data) as SaveData;
    } catch (e) {
      console.error('Failed to load game state:', e);
      return null;
    }
  }

  static clearSave() {
    localStorage.removeItem(STORAGE_KEY);
  }

  static hasSave(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }
}
