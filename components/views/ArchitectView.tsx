
import React, { useState, useEffect, useRef, useReducer } from 'react';
import { GameState, Station, City, Point, StationType, Passenger } from '../../types';
import { GameEngine } from '../../services/gameEngine';
import { Renderer } from '../../services/renderer';
import { THEME, GAME_CONFIG } from '../../constants';
import { GameCanvas } from '../GameCanvas';
import { Stats } from '../HUD/Stats';
import { ResourcePanel } from '../HUD/ResourcePanel';

interface ArchitectViewProps {
  onBack: () => void;
}

const ARCHITECT_CITY: City = {
  id: 'architect',
  name: 'Architect Sandbox',
  color: '#3182CE',
  center: { lat: 0, lon: 0 },
  bounds: { minLat: -0.1, maxLat: 0.1, minLon: -0.1, maxLon: 0.1 },
  water: [],
  initialStations: [
    { id: 1, type: 'circle', lat: 0.02, lon: -0.02, name: "Alpha" },
    { id: 2, type: 'square', lat: -0.02, lon: 0.02, name: "Beta" },
    { id: 3, type: 'triangle', lat: 0, lon: 0, name: "Gamma" }
  ],
  difficulty: 0.5
};

type Action = { type: 'SYNC'; payload: GameState };
function stateReducer(state: GameState | null, action: Action): GameState | null {
  switch (action.type) {
    case 'SYNC': return { ...action.payload };
    default: return state;
  }
}

export const ArchitectView: React.FC<ArchitectViewProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [uiState, dispatch] = useReducer(stateReducer, null);
  
  const [camera, setCamera] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 0.6 });
  const [activeLineIdx, setActiveLineIdx] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState<Station | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Point | null>(null);
  const hoveredStationRef = useRef<Station | null>(null);
  const mousePosRef = useRef<Point>({ x: 0, y: 0 });

  // Architect Exclusive State
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [globalSpawnRate, setGlobalSpawnRate] = useState(4000); // ms
  const [autoSpawnEnabled, setAutoSpawnEnabled] = useState(false);

  // Initialize Engine ONCE
  useEffect(() => {
    const engine = new GameEngine({
      cityId: ARCHITECT_CITY.id,
      mode: 'CREATIVE',
      stations: [], 
      lines: [],
      score: 0,
      level: 1,
      gameActive: true,
      autoSpawn: false,
      dayNightAuto: false,
      isNightManual: false,
      timeScale: 1,
      daysElapsed: 0,
      nextRewardIn: 999999,
      resources: { lines: 10, trains: 10, tunnels: 10, bridges: 10, wagons: 10 },
      totalResources: { lines: 10, trains: 10, tunnels: 10, bridges: 10, wagons: 10 },
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

    ARCHITECT_CITY.initialStations.forEach(s => {
      engine.state.stations.push({
        id: s.id,
        type: s.type,
        name: s.name,
        x: (s.lon * 10000) + 1500,
        y: (s.lat * 10000) + 1500,
        waitingPassengers: [],
        timer: 0
      });
    });

    engineRef.current = engine;
    if (canvasRef.current) rendererRef.current = new Renderer(canvasRef.current);

    return () => {
      engineRef.current = null;
    };
  }, []);

  // Separate animation loop to decouple from re-initialization
  useEffect(() => {
    let fId: number;
    const loop = (t: number) => {
      if (engineRef.current && rendererRef.current) {
        // Sync custom sandbox settings to engine
        engineRef.current.state.autoSpawn = autoSpawnEnabled;
        (engineRef.current as any).getDynamicSpawnRate = () => globalSpawnRate;

        engineRef.current.update(t);
        rendererRef.current.draw(
          engineRef.current.state,
          camera,
          ARCHITECT_CITY,
          { active: isDragging, start: dragStart, current: dragCurrent, activeLineIdx },
          { hoveredStation: hoveredStationRef.current, mousePos: mousePosRef.current }
        );
        dispatch({ type: 'SYNC', payload: engineRef.current.state });
      }
      fId = requestAnimationFrame(loop);
    };
    fId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(fId);
  }, [camera, isDragging, dragStart, dragCurrent, activeLineIdx, autoSpawnEnabled, globalSpawnRate]);

  const spawnManualStation = (type: StationType) => {
    if (!engineRef.current) return;
    const world = {
      x: (mousePosRef.current.x - camera.x) / camera.scale,
      y: (mousePosRef.current.y - camera.y) / camera.scale
    };
    const id = engineRef.current.state.stationIdCounter++;
    engineRef.current.state.stations.push({
      id,
      type,
      name: `S-${id}`,
      x: world.x,
      y: world.y,
      waitingPassengers: [],
      timer: 0
    });
  };

  const deleteStation = (id: number) => {
    if (!engineRef.current) return;
    const state = engineRef.current.state;
    // 1. Remove station from global list
    state.stations = state.stations.filter(s => s.id !== id);
    // 2. Remove from all lines
    state.lines.forEach(line => {
      line.stations = line.stations.filter(sid => sid !== id);
    });
    // 3. Clean up invalid lines
    state.lines = state.lines.filter(l => l.stations.length >= 2);
    
    if (selectedStationId === id) setSelectedStationId(null);
  };

  const spawnManualPassenger = (targetType: StationType, stationId?: number) => {
    if (!engineRef.current) return;
    const sid = stationId || hoveredStationRef.current?.id;
    if (!sid) return;
    
    const station = engineRef.current.state.stations.find(s => s.id === sid);
    if (!station) return;

    const p: Passenger = {
      id: engineRef.current.state.passengerIdCounter++,
      currentStationId: sid,
      destinationShape: targetType,
      spawnTime: Date.now()
    };
    station.waitingPassengers.push(p);
  };

  const updatePassengerTarget = (stationId: number, passengerId: number, newShape: StationType) => {
    if (!engineRef.current) return;
    const station = engineRef.current.state.stations.find(s => s.id === stationId);
    if (!station) return;
    const p = station.waitingPassengers.find(p => p.id === passengerId);
    if (p) p.destinationShape = newShape;
  };

  const removePassenger = (stationId: number, passengerId: number) => {
    if (!engineRef.current) return;
    const station = engineRef.current.state.stations.find(s => s.id === stationId);
    if (!station) return;
    station.waitingPassengers = station.waitingPassengers.filter(p => p.id !== passengerId);
  };

  const selectedStation = uiState?.stations.find(s => s.id === selectedStationId);

  return (
    <div className="fixed inset-0 bg-[#F1F5F9] text-slate-900 font-sans overflow-hidden">
      {/* Blueprint Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-40 z-0" 
           style={{ backgroundImage: `linear-gradient(#94A3B8 1px, transparent 1px), linear-gradient(90deg, #94A3B8 1px, transparent 1px)`, backgroundSize: '50px 50px' }} />

      {/* Left HUD: Global Tools */}
      <div className="absolute top-8 left-8 z-50 flex flex-col gap-4 pointer-events-auto max-w-xs">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-blue-600 leading-none">Architect Scene</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mt-1">Direct System Manipulation Mode</p>
        </div>
        
        <button 
          onClick={onBack}
          className="bg-white border-2 border-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all self-start shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]"
        >
          ← EXIT TO HUB
        </button>

        {/* Global Simulation Controls */}
        <div className="bg-white border-2 border-slate-900 p-4 rounded-sm flex flex-col gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)]">
          <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest border-b border-slate-200 pb-2">Simulation Settings</span>
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase">Auto-Spawn</span>
            <button 
              onClick={() => setAutoSpawnEnabled(!autoSpawnEnabled)}
              className={`px-3 py-1 text-[8px] font-black uppercase border-2 border-slate-900 transition-colors ${autoSpawnEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}
            >
              {autoSpawnEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[10px] font-bold uppercase">
              <span>Spawn Frequency</span>
              <span className="text-blue-600">{(globalSpawnRate / 1000).toFixed(1)}s</span>
            </div>
            <input 
              type="range" min="500" max="10000" step="100" 
              value={globalSpawnRate} 
              onChange={(e) => setGlobalSpawnRate(Number(e.target.value))}
              className="w-full accent-blue-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Blueprint Tools */}
        <div className="bg-white border-2 border-slate-900 p-4 rounded-sm flex flex-col gap-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)]">
          <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest border-b border-slate-200 pb-2">Quick Spawn Entity</span>
          <div className="grid grid-cols-5 gap-2">
            {(['circle', 'square', 'triangle', 'pentagon', 'star'] as StationType[]).map(t => (
              <button 
                key={t}
                onClick={() => spawnManualStation(t)}
                className="w-10 h-10 bg-slate-50 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center border-2 border-slate-900 font-bold"
                title={`Spawn ${t} station`}
              >
                {t === 'circle' && '○'}
                {t === 'square' && '□'}
                {t === 'triangle' && '△'}
                {t === 'pentagon' && '⬠'}
                {t === 'star' && '☆'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right HUD: Station Inspector */}
      <div className="absolute top-8 right-8 z-50 flex flex-col gap-4 pointer-events-auto w-80">
        {selectedStation ? (
          <div className="bg-white text-slate-900 p-6 border-4 border-slate-900 shadow-[12px_12px_0px_0px_rgba(0,0,0,0.1)] animate-in slide-in-from-right-4">
            <div className="flex justify-between items-start mb-4 border-b-2 border-slate-900 pb-2">
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase opacity-40">Inspector v2</span>
                <h2 className="text-xl font-black uppercase tracking-tighter leading-none">{selectedStation.name}</h2>
              </div>
              <button onClick={() => setSelectedStationId(null)} className="text-sm font-black hover:text-red-500">✕</button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center bg-slate-50 p-2 border-2 border-slate-900">
                <span className="text-[10px] font-bold uppercase">Classification</span>
                <div className="text-lg font-bold">{selectedStation.type.toUpperCase()}</div>
              </div>

              {/* Passenger List */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Commuters ({selectedStation.waitingPassengers.length})</span>
                   <button 
                    onClick={() => spawnManualPassenger('circle', selectedStation.id)}
                    className="text-[8px] font-black bg-slate-900 text-white px-2 py-0.5 hover:bg-blue-600 transition-colors"
                   >+ ADD</button>
                </div>
                
                <div className="max-h-64 overflow-y-auto pr-1 flex flex-col gap-1 border-2 border-slate-200 p-2 bg-slate-50 rounded-sm">
                  {selectedStation.waitingPassengers.map((p) => (
                    <div key={p.id} className="flex items-center justify-between bg-white p-2 border border-slate-300 group shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-mono text-slate-400">#{p.id}</span>
                        <select 
                          value={p.destinationShape}
                          onChange={(e) => updatePassengerTarget(selectedStation.id, p.id, e.target.value as StationType)}
                          className="text-[9px] font-bold uppercase bg-transparent border-none outline-none cursor-pointer hover:text-blue-600"
                        >
                          <option value="circle">Target: ○</option>
                          <option value="square">Target: □</option>
                          <option value="triangle">Target: △</option>
                          <option value="pentagon">Target: ⬠</option>
                          <option value="star">Target: ☆</option>
                        </select>
                      </div>
                      <button 
                        onClick={() => removePassenger(selectedStation.id, p.id)}
                        className="opacity-0 group-hover:opacity-100 text-[8px] font-black text-red-500 hover:underline"
                      >REMOVE</button>
                    </div>
                  ))}
                  {selectedStation.waitingPassengers.length === 0 && (
                    <span className="text-[10px] italic text-slate-300 text-center py-8">Platform Clear</span>
                  )}
                </div>
              </div>

              <button 
                onClick={() => deleteStation(selectedStation.id)}
                className="mt-4 w-full py-3 bg-red-500 text-white text-[10px] font-black uppercase border-2 border-slate-900 hover:bg-red-600 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none"
              >
                Decommission Station
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-slate-900 p-6 text-slate-400 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)]">
            <span className="text-[10px] font-black uppercase tracking-widest italic">Pick a station to modify</span>
          </div>
        )}
      </div>

      <Stats 
        score={uiState?.score || 0} 
        timeScale={uiState?.timeScale || 1} 
        averageWaitTime={uiState?.averageWaitTime || 0}
        overloadedStationsCount={uiState?.overloadedStationsCount || 0}
        onSpeedChange={(s) => engineRef.current?.setTimeScale(s)} 
      />

      <ResourcePanel 
        resources={uiState?.resources || { lines: 0, trains: 0, tunnels: 0, bridges: 0, wagons: 0 }} 
        activeLineIdx={activeLineIdx} 
        onLineIdxChange={setActiveLineIdx} 
        lines={uiState?.lines || []} 
        stations={uiState?.stations || []}
        onAddTrain={() => engineRef.current?.addTrainToLine(activeLineIdx)} 
        onRemoveTrain={(id) => engineRef.current?.removeTrainFromLine(activeLineIdx, id)}
        onDeleteLine={() => engineRef.current?.removeLine(activeLineIdx)} 
        onAudit={() => {}}
        onAddWagon={(id) => engineRef.current?.addWagonToTrain(activeLineIdx, id)}
        onRemoveWagon={(id) => engineRef.current?.removeWagonFromTrain(activeLineIdx, id)}
      />

      <GameCanvas
        canvasRef={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        camera={camera}
        setCamera={setCamera}
        engineRef={engineRef}
        currentCity={ARCHITECT_CITY}
        activeLineIdx={activeLineIdx}
        setActiveLineIdx={setActiveLineIdx}
        syncStateImmediate={() => dispatch({ type: 'SYNC', payload: engineRef.current!.state })}
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
        onStationClick={(id) => setSelectedStationId(id)}
      />

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-2 text-[10px] font-black uppercase tracking-[0.3em] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] z-10">
        ARCHITECT LAB ACTIVE • VERSION 2.5.1
      </div>
    </div>
  );
};
