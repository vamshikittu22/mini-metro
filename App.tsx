
import React, { useReducer, useEffect, useRef, useState } from 'react';
import { GameState, Station, City, Point, GameMode, TransitLine } from './types';
import { CITIES } from './data/cities';
import { project } from './services/geometry';
import { GameEngine } from './services/gameEngine';
import { Renderer } from './services/renderer';
import { Strategist } from './components/Strategist';
import { Stats } from './components/HUD/Stats';
import { ResourcePanel } from './components/HUD/ResourcePanel';
import { THEME, GAME_CONFIG } from './constants';
import { DataLogger } from './services/dataLogger';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingScreen } from './components/LoadingScreen';
import { GameCanvas } from './components/GameCanvas';
import { KeyboardHints } from './components/HUD/KeyboardHints';
import { MobileWarning } from './components/MobileWarning';
import { Toast } from './components/UI/Toast';
import { PersistenceManager } from './services/persistenceManager';

type AppView = 'MAIN_MENU' | 'CITY_SELECT' | 'MODE_SELECT' | 'GAME';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

type GameAction = 
  | { type: 'UPDATE_GAME'; payload: GameState }
  | { type: 'SYNC_TRAINS'; payload: TransitLine[] }
  | { type: 'SET_VIEW'; payload: AppView }
  | { type: 'RESET' };

function gameReducer(state: GameState | null, action: GameAction): GameState | null {
  switch (action.type) {
    case 'UPDATE_GAME':
      // Create a new reference for the UI state to trigger React re-render correctly
      return { ...action.payload };
    case 'SYNC_TRAINS':
      return state ? { ...state, lines: action.payload } : null;
    case 'RESET':
      return null;
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
  
  const [uiState, dispatch] = useReducer(gameReducer, null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [saveInfo, setSaveInfo] = useState<{ exists: boolean, time?: string }>({ exists: false });
  const [toast, setToast] = useState<{ msg: string, visible: boolean }>({ msg: '', visible: false });

  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState<Station | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Point | null>(null);
  const [activeLineIdx, setActiveLineIdx] = useState(0);

  const showToast = (msg: string) => {
    setToast({ msg, visible: true });
  };

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

  const initGame = (city: City) => {
    setCurrentCity(city);
    setView('MODE_SELECT');
  };

  const restartGame = () => {
    if (currentCity) startGame();
  };

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
      dispatch({ type: 'UPDATE_GAME', payload: engine.state });
      
      setView('GAME');
      setIsLoading(false);
      setIsFadingOut(true);
      setTimeout(() => setIsFadingOut(false), 500);
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
        stationIdCounter: 1000
      });
      engineRef.current = engine;
      dispatch({ type: 'UPDATE_GAME', payload: engine.state });
      
      setView('GAME');
      setIsLoading(false);
      setIsFadingOut(true);
      setTimeout(() => setIsFadingOut(false), 500);
    }, 2000);
  };

  const handleDownloadAnalysis = () => {
    if (engineRef.current && currentCity) {
      DataLogger.downloadReport(engineRef.current.state, currentCity);
    }
  };

  const syncStateImmediate = () => {
    if (engineRef.current) {
      dispatch({ type: 'UPDATE_GAME', payload: engineRef.current.state });
    }
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
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          dispatch({ type: 'UPDATE_GAME', payload: engineRef.current.state });
          lastUiUpdate = t;
        }
      }
      fId = requestAnimationFrame(loop);
    };
    fId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(fId);
  }, [camera, isDragging, isPanning, dragStart, dragCurrent, activeLineIdx, currentCity, view]);

  const handleLineDelete = () => {
    if (engineRef.current) { engineRef.current.removeLine(activeLineIdx); syncStateImmediate(); }
  };

  const handleAddTrain = () => {
    if (engineRef.current) { engineRef.current.addTrainToLine(activeLineIdx); syncStateImmediate(); }
  };

  const handleRemoveTrain = (trainId: number) => {
    if (engineRef.current) { engineRef.current.removeTrainFromLine(activeLineIdx, trainId); syncStateImmediate(); }
  };

  if (view === 'MAIN_MENU') {
    return (
      <div className="fixed inset-0 bg-[#1A1A1A] flex flex-col items-start justify-center p-24 select-none">
        <LoadingScreen isFading={!isLoading} />
        <h1 className="text-[120px] font-black tracking-tighter text-white mb-20 leading-none">MINI METRO ▲</h1>
        <div className="flex flex-col gap-4">
          <MenuBtn icon="→" onClick={() => setView('CITY_SELECT')}>New Connection</MenuBtn>
          <MenuBtn 
            icon="↗" 
            onClick={saveInfo.exists ? resumeGame : undefined} 
            className={!saveInfo.exists ? 'opacity-20 cursor-not-allowed grayscale' : ''}
          >
            Resume {saveInfo.time && <span className="text-[16px] lowercase opacity-50 ml-2">({saveInfo.time})</span>}
          </MenuBtn>
          <MenuBtn icon="→" onClick={() => {}}>Daily Challenge</MenuBtn>
          <MenuBtn icon="↓" onClick={() => {}}>Options</MenuBtn>
          <MenuBtn icon="↙" onClick={() => {}}>Exit</MenuBtn>
        </div>
      </div>
    );
  }

  if (view === 'CITY_SELECT') {
    return (
      <div className="fixed inset-0 bg-[#1A1A1A] p-24 text-white overflow-y-auto">
        <div className="flex justify-between items-center mb-16">
          <h2 className="text-8xl font-black opacity-20 uppercase tracking-tighter">Cities</h2>
          <button onClick={() => setView('MAIN_MENU')} className="text-xl font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all">Back</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12 pb-20">
          {CITIES.map(city => (
            <div key={city.id} onClick={() => initGame(city)} className="cursor-pointer group">
              <h3 className="text-5xl font-black uppercase tracking-tighter mb-6 group-hover:text-blue-400 transition-colors">{city.name}</h3>
              <div className="aspect-square bg-white/5 border border-white/10 relative overflow-hidden p-8 transition-all group-hover:border-white/30">
                <div className="flex gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: THEME.lineColors[0] }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: THEME.lineColors[1] }} />
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: THEME.lineColors[2] }} />
                </div>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Difficulty: {Math.floor(city.difficulty * 10)}/10.</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'MODE_SELECT') {
    return (
      <div className="fixed inset-0 bg-[#1A1A1A] flex flex-col items-center justify-center p-24 text-white">
        <div className="flex flex-col items-center gap-12 mb-32">
          {(['NORMAL', 'EXTREME', 'ENDLESS', 'CREATIVE'] as GameMode[]).map(m => (
            <ModeItem key={m} label={m} active={selectedMode === m} onClick={() => setSelectedMode(m)} />
          ))}
        </div>
        <div className="flex flex-col items-center gap-4 cursor-pointer group" onClick={startGame}>
          <div className="w-12 h-12 border-2 border-[#2ECC71] group-hover:bg-[#2ECC71] transition-all rounded-full flex items-center justify-center relative">
             <div className="w-px h-8 bg-[#2ECC71] group-hover:bg-white absolute" />
             <div className="w-8 h-px bg-[#2ECC71] group-hover:bg-white absolute" />
          </div>
          <span className="text-xl font-black uppercase tracking-[0.4em] group-hover:text-[#2ECC71]">Establish Link</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-screen h-screen overflow-hidden bg-[#F8F4EE]">
        <ErrorBoundary>
          {uiState && (
            <>
              <div className="absolute top-8 left-8 z-50 pointer-events-auto flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-black uppercase tracking-tighter text-black">{currentCity?.name}</h1>
                  <div className="bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase rounded-sm">Week {uiState.level}</div>
                </div>
                <p className="text-[10px] font-bold uppercase opacity-40 tracking-[0.3em] text-black">{DAYS[Math.floor(uiState.daysElapsed % 7)]}</p>
                <div className="flex items-center gap-2 mt-4">
                  <button onClick={() => {
                    if (engineRef.current) PersistenceManager.saveGame(engineRef.current.state, camera);
                    setView('MAIN_MENU');
                  }} className="text-[9px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 text-black text-left">← Main Hub</button>
                  <span className="w-1 h-1 bg-black/10 rounded-full" />
                  <span className="text-[8px] font-black uppercase opacity-20 tracking-widest text-black">Autosave Active</span>
                </div>
              </div>
  
              <Stats score={uiState.score} timeScale={uiState.timeScale} onSpeedChange={(s) => { if(engineRef.current) engineRef.current.state.timeScale = s; syncStateImmediate(); }} />
  
              <ResourcePanel 
                resources={uiState.resources} 
                activeLineIdx={activeLineIdx} 
                onLineIdxChange={setActiveLineIdx} 
                lines={uiState.lines} 
                stations={uiState.stations}
                onAddTrain={handleAddTrain} 
                onRemoveTrain={handleRemoveTrain}
                onDeleteLine={handleLineDelete} 
                onAudit={() => setShowAudit(!showAudit)}
                onAddWagon={(trainId) => { engineRef.current?.addWagonToTrain(activeLineIdx, trainId); syncStateImmediate(); }}
                onRemoveWagon={(trainId) => { engineRef.current?.removeWagonFromTrain(activeLineIdx, trainId); syncStateImmediate(); }}
                onDownload={handleDownloadAnalysis}
              />
              <KeyboardHints />
            </>
          )}
  
          <GameCanvas
            canvasRef={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            camera={camera}
            setCamera={setCamera}
            engineRef={engineRef}
            currentCity={currentCity}
            activeLineIdx={activeLineIdx}
            setActiveLineIdx={setActiveLineIdx}
            syncStateImmediate={syncStateImmediate}
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
          />
  
          <div className="fixed bottom-32 left-8 z-50 flex flex-col gap-2">
            <button onClick={() => setShowStrategist(!showStrategist)} className="bg-black text-white w-12 h-12 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all" title="AI Strategist"><span className="text-xl">🧠</span></button>
          </div>
  
          {showStrategist && uiState && <Strategist gameState={uiState} onClose={() => setShowStrategist(false)} />}
          
          {showAudit && uiState && (
            <div className="fixed bottom-32 left-8 z-[100] bg-white p-6 border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] min-w-[300px]">
               <h4 className="text-[10px] font-black uppercase mb-4 tracking-widest border-b border-black pb-2 text-black">System Audit & Integrity</h4>
               <div className="mb-4 p-2 bg-black/5 text-[9px] font-mono leading-tight border border-black/10 text-black font-bold">
                 STATUS: OPERATIONAL <br/>
                 VERIFICATION CYCLE: 5.0s
               </div>
               {Object.entries(uiState.totalResources).map(([k, v]) => (
                 <div key={k} className="flex justify-between py-1.5 text-[10px] font-black uppercase border-b border-black last:border-0 text-black">
                   <span className="opacity-70">{k}</span>
                   <span className="tabular-nums font-black">{uiState.resources[k as keyof typeof uiState.resources]} / {v as number}</span>
                 </div>
               ))}
            </div>
          )}
  
          {uiState?.isPausedForReward && uiState?.pendingRewardOptions && (
            <div className="fixed inset-0 z-[400] flex items-center justify-center bg-white/40 backdrop-blur-sm">
              <div className="bg-white p-12 max-w-2xl w-full border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-95">
                <h2 className="text-4xl font-black uppercase tracking-tighter mb-12 border-b-4 border-black pb-4 text-black">System Expansion</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {uiState.pendingRewardOptions.map(choice => (
                    <button key={choice.id} onClick={() => { engineRef.current?.selectReward(choice); syncStateImmediate(); }} className="group flex flex-col items-center p-8 bg-white border-4 border-black hover:bg-black hover:text-white transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-2 hover:translate-y-2">
                      <span className="text-[10px] font-black uppercase mb-2 text-black group-hover:text-white">{choice.label}</span>
                      <span className="text-xl font-black uppercase text-center leading-tight text-black group-hover:text-white">{choice.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
  
          {uiState && !uiState.gameActive && (
            <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-md">
              <div className="bg-white p-12 max-w-xl w-full border-4 border-black shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] animate-in zoom-in-105">
                <h2 className="text-5xl font-black uppercase tracking-tighter mb-4 text-black border-b-8 border-black pb-4">System Halted</h2>
                <p className="text-xl font-black uppercase mb-12 text-black/60 tracking-tight">One of your stations reached critical capacity.</p>
                <div className="grid grid-cols-2 gap-1 mb-12 bg-black border-2 border-black">
                  <StatCard label="Final Throughput" val={uiState.score} />
                  <StatCard label="Weeks Operational" val={uiState.level} />
                  <StatCard label="Network Size" val={uiState.stations.length} />
                  <StatCard label="Transit Lines" val={uiState.lines.length} />
                </div>
                <div className="flex flex-col gap-4">
                  <button onClick={restartGame} className="w-full py-6 bg-[#2ECC71] text-white border-4 border-black text-2xl font-black uppercase tracking-tighter shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">Re-Initialize Network</button>
                  <button onClick={() => { PersistenceManager.clearSave(); setView('CITY_SELECT'); }} className="w-full py-4 bg-white text-black border-4 border-black text-lg font-black uppercase tracking-tighter hover:bg-black hover:text-white transition-colors">Change Region</button>
                  <button onClick={handleDownloadAnalysis} className="w-full py-2 bg-black text-white text-[10px] font-black uppercase">Download Analysis Data</button>
                </div>
              </div>
            </div>
          )}
        </ErrorBoundary>
      </div>
      <MobileWarning />
      <Toast message={toast.msg} visible={toast.visible} onHide={() => setToast({ ...toast, visible: false })} />
    </>
  );
};

const StatCard = ({ label, val }: { label: string, val: number | string }) => (
  <div className="bg-white p-6 flex flex-col justify-center border border-black">
    <span className="text-[9px] font-black uppercase tracking-widest text-black/40 mb-1">{label}</span>
    <span className="text-4xl font-black text-black tabular-nums leading-none">{val}</span>
  </div>
);

const MenuBtn = ({ children, icon, onClick, className = '' }: any) => (
  <div onClick={onClick} className={`flex items-center gap-6 group cursor-pointer ${className}`}>
    <span className="text-white/40 text-3xl font-black group-hover:text-blue-400">{icon}</span>
    <div className="bg-blue-600 px-8 py-3 group-hover:bg-white group-hover:text-black transition-all">
      <span className="text-4xl font-black text-white group-hover:text-black uppercase tracking-tighter">{children}</span>
    </div>
  </div>
);

const ModeItem = ({ label, active, onClick }: any) => (
  <div onClick={onClick} className={`cursor-pointer transition-all ${active ? 'bg-blue-600 px-16 py-4' : 'opacity-40 hover:opacity-100'}`}>
    <span className={`text-6xl font-black uppercase tracking-tighter ${active ? 'text-white' : 'text-white/40'}`}>{label}</span>
  </div>
);

export default App;
