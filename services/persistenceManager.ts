
import { GameState, SaveData } from '../types';

const STORAGE_KEY = 'mini-metro-web-save';

export class PersistenceManager {
  private static worker: Worker | null = null;

  private static getWorker() {
    if (!this.worker) {
      // Create worker from a blob to ensure it works in this ESM environment
      const workerCode = `
        self.onmessage = (e) => {
          const { saveData } = e.data;
          try {
            const serialized = JSON.stringify(saveData);
            self.postMessage({ success: true, serialized });
          } catch (error) {
            self.postMessage({ success: false, error: error.message });
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      
      this.worker.onmessage = (e) => {
        if (e.data.success) {
          localStorage.setItem(STORAGE_KEY, e.data.serialized);
          // Optional: Dispatch a custom event or callback if needed
        }
      };
    }
    return this.worker;
  }

  static saveGame(state: GameState, camera: { x: number; y: number; scale: number }) {
    const saveData: SaveData = {
      state,
      camera,
      timestamp: Date.now()
    };
    
    // Post to worker for background serialization
    this.getWorker().postMessage({ saveData });
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
