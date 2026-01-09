
import { TransitLine, LineSegment } from '../types';

export interface LineSnapshot {
  id: number;
  color: string;
  stations: number[];
  segments: LineSegment[];
  trains: {
    id: number;
    nextStationIndex: number;
    progress: number;
    direction: 1 | -1;
  }[];
}

export class HistoryManager {
  private undoStack: LineSnapshot[][] = [];
  private redoStack: LineSnapshot[][] = [];
  private maxHistory = 20;

  push(lines: TransitLine[]) {
    // Deep copy state as requested to preserve full context including trains and segments
    const snapshot: LineSnapshot[] = lines.map(l => ({
      id: l.id,
      color: l.color,
      stations: [...l.stations],
      segments: [...l.segments],
      trains: l.trains.map(t => ({
        id: t.id,
        nextStationIndex: t.nextStationIndex,
        progress: t.progress,
        direction: t.direction
      }))
    }));
    
    // Check if the new snapshot is different from the last one to avoid redundant pushes
    if (this.undoStack.length > 0) {
      const last = JSON.stringify(this.undoStack[this.undoStack.length - 1]);
      if (last === JSON.stringify(snapshot)) return;
    }

    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; 
  }

  undo(currentLines: TransitLine[]): LineSnapshot[] | null {
    if (this.undoStack.length === 0) return null;
    
    const currentSnapshot: LineSnapshot[] = currentLines.map(l => ({
      id: l.id,
      color: l.color,
      stations: [...l.stations],
      segments: [...l.segments],
      trains: l.trains.map(t => ({
        id: t.id,
        nextStationIndex: t.nextStationIndex,
        progress: t.progress,
        direction: t.direction
      }))
    }));
    this.redoStack.push(currentSnapshot);

    return this.undoStack.pop() || null;
  }

  redo(currentLines: TransitLine[]): LineSnapshot[] | null {
    if (this.redoStack.length === 0) return null;

    const currentSnapshot: LineSnapshot[] = currentLines.map(l => ({
      id: l.id,
      color: l.color,
      stations: [...l.stations],
      segments: [...l.segments],
      trains: l.trains.map(t => ({
        id: t.id,
        nextStationIndex: t.nextStationIndex,
        progress: t.progress,
        direction: t.direction
      }))
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
