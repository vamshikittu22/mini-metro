
import React, { useState, useEffect, useRef, useReducer } from 'react';
import { GameState, Station, City, Point, GameMode } from './types';
import { CITIES } from './data/cities';
import { project } from './services/geometry';
import { GameEngine } from './services/gameEngine';
import { Renderer } from './services/renderer';
import { THEME, GAME_CONFIG } from './constants';
import { DataLogger } from './services/dataLogger';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MobileWarning } from './components/MobileWarning';
import { Toast } from './components/UI/Toast';
import { PersistenceManager } from './services/persistenceManager';

// Import newly extracted views
import { MainMenuView } from './components/views/MainMenuView';
import { CitySelectView } from './components/views/CitySelectView';
import { ModeSelectView } from './components/views/ModeSelectView';
import { GameView } from './components/views/GameView';

// Import the hotkeys hook
import { useGameHotkeys } from './hooks/useGameHotkeys';

type AppView = 'MAIN_MENU' | 'CITY_SELECT' | 'MODE_SELECT' | 'GAME';

// Reducer for syncing game state to UI safely
type Action = { type: 'SYNC'; payload: GameState };
function stateReducer(state: GameState | null, action: Action): GameState | null {
  switch (action.type) {
    case 'SYNC':
      // Return a shallow copy to trigger React update
      return { ...action.payload };
    default:
      return state;
  }
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  
  const hoveredStationRef = useRef<Station | null>(null);
  const mousePosRef = useRef<Point>({ x: 0, y: 0 });
  
  const [view, setView] = useState<AppView>('MAIN_MENU');
  const [currentCity, setCurrentCity] = useState<City | null>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode>('NORMAL');
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 0.8 });
  const [showAudit, setShowAudit] = useState(false);
  const [showStrategist, setShowStrategist] = useState(false);
  
  const [uiState, dispatch] = useReducer(stateReducer, null);
  const [isLoading, setIsLoading] = useState(false);
  const [saveInfo, setSaveInfo] = useState<{ exists: boolean, time?: string }>({ exists: false });
  const [toast, setToast] = useState<{ msg: string, visible: boolean }>({ msg: '', visible: false });

  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState<Station | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Point | null>(null);
  const [activeLineIdx, setActiveLineIdx] = useState(0);

  const showToast = (msg: string) => {
    setToast({ msg, visible: true });
  };

  const syncStateImmediate = () => {
    if (engineRef.current) {
      dispatch({ type: 'SYNC', payload: engineRef.current.state });
    }
  };

  // Initialize Hotkeys
  useGameHotkeys({
    view,
    engineRef,
    rendererRef,
    activeLineIdx,
    setActiveLineIdx,
    syncStateImmediate,
    onBackToMenu: () => {
      if (engineRef.current) PersistenceManager.saveGame(engineRef.current.state, camera);
      setView('MAIN_MENU');
    },
    camera
  });

  useEffect(() => {
    const data = PersistenceManager.loadGame();
    if (data) {
      const diff = Date.now() - data.timestamp;
      let timeStr = "recently";
      if (diff > 3600000) timeStr = `${Math.floor(diff/3600000)}h ago`;
      else if (diff > 60000) timeStr = `${Math.floor(diff/60000)}m ago`;
      setSaveInfo({ exists: true, time: timeStr });
    } else {
      setSaveInfo({ exists: false });
    }
  }, [view]);

  const resumeGame = () => {
    const saveData = PersistenceManager.loadGame();
    if (!saveData) {
      showToast("No save data found.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const city = CITIES.find(c => c.id === saveData.state.cityId) || CITIES[0];
      setCurrentCity(city);
      setSelectedMode(saveData.state.mode);
      setCamera(saveData.camera);

      const engine = new GameEngine(saveData.state);
      engineRef.current = engine;
      dispatch({ type: 'SYNC', payload: engine.state });
      
      setView('GAME');
      setIsLoading(false);
      showToast("System Restored");
    }, 1200);
  };

  const startGame = () => {
    if (!currentCity) return;
    setIsLoading(true);

    setTimeout(() => {
      const initialStations: Station[] = currentCity.initialStations.map(s => {
        const pos = project(s.lat, s.lon, currentCity);
        return { ...pos, id: s.id, type: s.type, name: s.name, waitingPassengers: [], timer: 0 };
      });
      
      const scaleFactor = 1 + (currentCity.difficulty * 0.5);
      const initialInventory = { 
        lines: Math.ceil(GAME_CONFIG.baseResources.lines * scaleFactor), 
        trains: Math.ceil(GAME_CONFIG.baseResources.trains * scaleFactor), 
        tunnels: Math.ceil(GAME_CONFIG.baseResources.tunnels * scaleFactor), 
        bridges: Math.ceil(GAME_CONFIG.baseResources.bridges * scaleFactor), 
        wagons: Math.ceil(GAME_CONFIG.baseResources.wagons * scaleFactor) 
      };

      const engine = new GameEngine({
        cityId: currentCity.id, 
        mode: selectedMode, 
        stations: initialStations, 
        lines: [], 
        score: 0, 
        level: 1, 
        gameActive: true, 
        autoSpawn: true, 
        dayNightAuto: true, 
        isNightManual: false, 
        timeScale: 1, 
        daysElapsed: 0, 
        nextRewardIn: 60000 * 7,
        resources: { ...initialInventory }, 
        totalResources: { ...initialInventory }, 
        weeklyAuditLog: [], 
        isPausedForReward: false, 
        scoreAnimations: [],
        passengerTimer: 0, 
        stationTimer: 0,
        analytics: [],
        passengerIdCounter: 0,
        stationIdCounter: 1000,
        trainIdCounter: 0,
        animationIdCounter: 0,
        averageWaitTime: 0,
        overloadedStationsCount: 0
      });
      engineRef.current = engine;
      dispatch({ type: 'SYNC', payload: engine.state });
      
      const minX = Math.min(...initialStations.map(s => s.x));
      const maxX = Math.max(...initialStations.map(s => s.x));
      const minY = Math.min(...initialStations.map(s => s.y));
      const maxY = Math.max(...initialStations.map(s => s.y));
      const initialScale = Math.min(0.6, (window.innerWidth * 0.7) / (maxX - minX || 1));
      setCamera({ x: window.innerWidth / 2 - ((minX + maxX) / 2) * initialScale, y: window.innerHeight / 2 - ((minY + maxY) / 2) * initialScale, scale: initialScale });
      
      setView('GAME');
      setIsLoading(false);
    }, 2000);
  };

  useEffect(() => {
    if (view !== 'GAME' || !engineRef.current) return;
    const saveInterval = setInterval(() => {
      if (engineRef.current && engineRef.current.state.gameActive && !engineRef.current.state.isPausedForReward) {
        PersistenceManager.saveGame(engineRef.current.state, camera);
        showToast("System Sync Completed");
      }
    }, 45000); 
    return () => clearInterval(saveInterval);
  }, [view, camera]);

  useEffect(() => {
    if (!canvasRef.current || view !== 'GAME') return;
    rendererRef.current = new Renderer(canvasRef.current);
  }, [view]);

  useEffect(() => {
    if (!currentCity || view !== 'GAME') return;
    let fId: number;
    let lastUiUpdate = 0;
    const loop = (t: number) => {
      if (engineRef.current && rendererRef.current && currentCity) { 
        engineRef.current.update(t); 
        rendererRef.current.draw(
          engineRef.current.state, 
          camera, 
          currentCity, 
          { active: isDragging, start: dragStart, current: dragCurrent, activeLineIdx },
          { hoveredStation: hoveredStationRef.current, mousePos: mousePosRef.current }
        );
        if (t - lastUiUpdate > 100) {
          syncStateImmediate();
          lastUiUpdate = t;
        }
      }
      fId = requestAnimationFrame(loop);
    };
    fId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(fId);
  }, [camera, isDragging, isPanning, dragStart, dragCurrent, activeLineIdx, currentCity, view]);

  const handleBackToMenu = () => {
    if (engineRef.current) PersistenceManager.saveGame(engineRef.current.state, camera);
    setView('MAIN_MENU');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#F8F4EE]">
      <ErrorBoundary>
        {view === 'MAIN_MENU' && (
          <MainMenuView 
            isLoading={isLoading} 
            saveInfo={saveInfo} 
            onNewConnection={() => setView('CITY_SELECT')} 
            onResume={resumeGame} 
          />
        )}

        {view === 'CITY_SELECT' && (
          <CitySelectView 
            onCitySelect={(city) => { setCurrentCity(city); setView('MODE_SELECT'); }} 
            onBack={() => setView('MAIN_MENU')} 
          />
        )}

        {view === 'MODE_SELECT' && (
          <ModeSelectView 
            selectedMode={selectedMode} 
            onModeSelect={setSelectedMode} 
            onStart={startGame} 
          />
        )}

        {view === 'GAME' && uiState && (
          <GameView 
            uiState={uiState}
            currentCity={currentCity}
            camera={camera}
            setCamera={setCamera}
            engineRef={engineRef}
            canvasRef={canvasRef}
            activeLineIdx={activeLineIdx}
            setActiveLineIdx={setActiveLineIdx}
            syncStateImmediate={syncStateImmediate}
            onSpeedChange={(s) => { if(engineRef.current) engineRef.current.setTimeScale(s); syncStateImmediate(); }}
            onAddTrain={() => { engineRef.current?.addTrainToLine(activeLineIdx); syncStateImmediate(); }}
            onRemoveTrain={(id) => { engineRef.current?.removeTrainFromLine(activeLineIdx, id); syncStateImmediate(); }}
            onDeleteLine={() => { engineRef.current?.removeLine(activeLineIdx); syncStateImmediate(); }}
            onAddWagon={(id) => { engineRef.current?.addWagonToTrain(activeLineIdx, id); syncStateImmediate(); }}
            onRemoveWagon={(id) => { engineRef.current?.removeWagonFromTrain(activeLineIdx, id); syncStateImmediate(); }}
            onDownload={() => currentCity && DataLogger.downloadReport(engineRef.current!.state, currentCity)}
            onBackToMenu={handleBackToMenu}
            onRestart={startGame}
            onChangeRegion={() => { PersistenceManager.clearSave(); setView('CITY_SELECT'); }}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            isPanning={isPanning}
            setIsPanning={setIsPanning}
            dragStart={dragStart}
            setDragStart={setDragStart}
            dragCurrent={dragCurrent}
            setDragCurrent={setDragCurrent}
            hoveredStationRef={hoveredStationRef}
            mousePosRef={mousePosRef}
            showAudit={showAudit}
            setShowAudit={setShowAudit}
            showStrategist={showStrategist}
            setShowStrategist={setShowStrategist}
          />
        )}
      </ErrorBoundary>
      <MobileWarning />
      <Toast message={toast.msg} visible={toast.visible} onHide={() => setToast({ ...toast, visible: false })} />
    </div>
  );
};

export default App;
