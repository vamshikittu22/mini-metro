
// Fix: Added React import to satisfy namespace references for MutableRefObject
import React, { useEffect } from 'react';
import { GameEngine } from '../services/gameEngine';
import { Renderer } from '../services/renderer';
import { PersistenceManager } from '../services/persistenceManager';

interface HotkeyProps {
  view: string;
  engineRef: React.MutableRefObject<GameEngine | null>;
  rendererRef: React.MutableRefObject<Renderer | null>;
  activeLineIdx: number;
  setActiveLineIdx: (idx: number) => void;
  syncStateImmediate: () => void;
  onBackToMenu: () => void;
  camera: { x: number; y: number; scale: number };
}

/**
 * Hook to handle global keyboard shortcuts for the game.
 * Manages speed, pausing, line cycling, undo/redo, and system functions.
 */
export const useGameHotkeys = ({
  view,
  engineRef,
  rendererRef,
  activeLineIdx,
  setActiveLineIdx,
  syncStateImmediate,
  onBackToMenu,
  camera
}: HotkeyProps) => {

  useEffect(() => {
    // Only register shortcuts when in the game view
    if (view !== 'GAME') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      const key = e.key.toLowerCase();

      // Avoid triggering shortcuts when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (key) {
        case ' ': // Pause/Play toggle
          e.preventDefault();
          engine.togglePause();
          syncStateImmediate();
          break;

        case '1': // Normal speed
          engine.setTimeScale(1);
          syncStateImmediate();
          break;

        case '2': // 2x speed
          engine.setTimeScale(2);
          syncStateImmediate();
          break;

        case '3': // 4x speed
        case '4':
          engine.setTimeScale(4);
          syncStateImmediate();
          break;

        case 'tab': // Cycle active line
          e.preventDefault();
          setActiveLineIdx((activeLineIdx + 1) % 10);
          break;

        case 'z': // Undo / Redo
          // Handle Ctrl+Z / Cmd+Z and Ctrl+Shift+Z / Cmd+Shift+Z
          if (e.shiftKey || e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              engine.redo();
            } else {
              engine.undo();
            }
          } else {
            engine.undo();
          }
          syncStateImmediate();
          break;

        case 'y': // Explicit Redo (Ctrl+Y)
          if (e.ctrlKey || e.metaKey) {
            engine.redo();
            syncStateImmediate();
          }
          break;

        case 'd': // Toggle Debug Mode in Renderer
          rendererRef.current?.toggleDebug();
          break;

        case 's': // Manual Sync (Save)
          PersistenceManager.saveGame(engine.state, camera);
          break;

        case 'escape': // Return to Main Menu
          onBackToMenu();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    view,
    activeLineIdx,
    camera,
    onBackToMenu,
    setActiveLineIdx,
    syncStateImmediate,
    engineRef,
    rendererRef
  ]);
};
