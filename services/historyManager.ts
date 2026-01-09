import { TransitLine } from '../types';

export interface LineSnapshot {
  id: number;
  color: string;
  stations: number[];
}

export class HistoryManager {
  private undoStack: LineSnapshot[][] = [];
  private redoStack: LineSnapshot[][] = [];
  private maxHistory = 10;

  push(lines: TransitLine[]) {
    // Deep copy topology only to prevent reference issues
    const snapshot = lines.map(l => ({
      id: l.id,
      color: l.color,
      stations: [...l.stations]
    }));
    
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    // Clear redo stack whenever a new action is committed
    this.redoStack = []; 
  }

  undo(currentLines: TransitLine[]): LineSnapshot[] | null {
    if (this.undoStack.length === 0) return null;
    
    // Save current state to redo stack before reverting
    const currentSnapshot = currentLines.map(l => ({
      id: l.id,
      color: l.color,
      stations: [...l.stations]
    }));
    this.redoStack.push(currentSnapshot);

    return this.undoStack.pop() || null;
  }

  redo(currentLines: TransitLine[]): LineSnapshot[] | null {
    if (this.redoStack.length === 0) return null;

    // Save current state to undo stack before re-applying
    const currentSnapshot = currentLines.map(l => ({
      id: l.id,
      color: l.color,
      stations: [...l.stations]
    }));
    this.undoStack.push(currentSnapshot);

    return this.redoStack.pop() || null;
  }
  
  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
  
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}