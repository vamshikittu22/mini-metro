import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameState, Station, TransitLine, CITIES, City, Point, StationType, GameMode, RewardChoice } from './types';
import { THEME, GAME_CONFIG } from './constants';
import { project, getDistance, isSegmentCrossingWater, getBentPath } from './services/geometry';
import { GameEngine } from './services/gameEngine';

// Components
import { Stats } from './components/HUD/Stats';
import { ResourcePanel } from './components/HUD/ResourcePanel';

type AppView = 'MAIN_MENU' | 'CITY_SELECT' | 'MODE_SELECT' | 'GAME';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<AppView>('MAIN_MENU');
  const [currentCity, setCurrentCity] = useState<City | null>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode>('NORMAL');
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 0.8 });
  const [showAudit, setShowAudit] = useState(false);
  
  const [gameState, setGameState] = useState<GameState>({
    cityId: '', mode: 'NORMAL', stations: [], lines: [], score: 0, level: 1, gameActive: true, autoSpawn: true, dayNightAuto: true, isNightManual: false, timeScale: 1, daysElapsed: 0, nextRewardIn: 60000 * 7,
    resources: { lines: 5, trains: 3, tunnels: 3, bridges: 2, wagons: 5 },
    totalResources: { lines: 5, trains: 3, tunnels: 3, bridges: 2, wagons: 5 },
    weeklyAuditLog: [], isPausedForReward: false
  });

  const engineRef = useRef<GameEngine | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState<Station | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Point | null>(null);
  const [activeLineIdx, setActiveLineIdx] = useState(0);

  const screenToWorld = (sx: number, sy: number) => ({
    x: (sx - camera.x) / camera.scale,
    y: (sy - camera.y) / camera.scale
  });

  const handleWheel = (e: React.WheelEvent) => {
    if (view !== 'GAME') return;
    const zoomIn = e.deltaY < 0;
    const factor = zoomIn ? 1.1 : 0.9;
    const newScale = Math.max(0.1, Math.min(5, camera.scale * factor));
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldMouse = screenToWorld(mx, my);
    setCamera({ scale: newScale, x: mx - worldMouse.x * newScale, y: my - worldMouse.y * newScale });
  };

  const initGame = (city: City) => {
    setCurrentCity(city);
    setView('MODE_SELECT');
  };

  const startGame = () => {
    if (!currentCity) return;
    const initialStations: Station[] = currentCity.initialStations.map(s => {
      const pos = project(s.lat, s.lon, currentCity);
      return { ...pos, id: s.id, type: s.type, name: s.name, waitingPassengers: [], timer: 0 };
    });
    
    const initialInventory = { lines: 5, trains: 3, tunnels: 3, bridges: 2, wagons: 5 };
    const engine = new GameEngine({
      cityId: currentCity.id, mode: selectedMode, stations: initialStations, lines: [], score: 0, level: 1, gameActive: true, autoSpawn: true, dayNightAuto: true, isNightManual: false, timeScale: 1, daysElapsed: 0, nextRewardIn: 60000 * 7,
      resources: { ...initialInventory }, totalResources: { ...initialInventory }, weeklyAuditLog: [], isPausedForReward: false
    });
    engineRef.current = engine;
    setGameState({ ...engine.state });
    
    const minX = Math.min(...initialStations.map(s => s.x));
    const maxX = Math.max(...initialStations.map(s => s.x));
    const minY = Math.min(...initialStations.map(s => s.y));
    const maxY = Math.max(...initialStations.map(s => s.y));
    const initialScale = Math.min(1.0, (window.innerWidth * 0.4) / (maxX - minX || 1));
    setCamera({ x: window.innerWidth / 2 - ((minX + maxX) / 2) * initialScale, y: window.innerHeight / 2 - ((minY + maxY) / 2) * initialScale, scale: initialScale });
    setView('GAME');
  };

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!currentCity || view !== 'GAME') return;
    let pTimeout: any;
    const spawnLoop = () => {
      if (engineRef.current?.state.gameActive && engineRef.current?.state.autoSpawn && !engineRef.current?.state.isPausedForReward) {
        engineRef.current.spawnPassenger();
        const next = engineRef.current.getDynamicSpawnRate() / currentCity.difficulty;
        pTimeout = setTimeout(spawnLoop, next);
      } else { pTimeout = setTimeout(spawnLoop, 2000); }
    };
    pTimeout = setTimeout(spawnLoop, GAME_CONFIG.spawnRate);
    const sInt = setInterval(() => {
      if (engineRef.current?.state.gameActive && engineRef.current?.state.autoSpawn && !engineRef.current?.state.isPausedForReward) {
        engineRef.current.spawnStation(window.innerWidth, window.innerHeight, project);
      }
    }, GAME_CONFIG.stationSpawnRate);
    return () => { clearTimeout(pTimeout); clearInterval(sInt); };
  }, [currentCity, view]);

  useEffect(() => {
    if (!currentCity || view !== 'GAME') return;
    let fId: number;
    const loop = (t: number) => {
      if (engineRef.current) { 
        engineRef.current.update(t); 
        setGameState({ ...engineRef.current.state }); 
        draw(); 
      }
      fId = requestAnimationFrame(loop);
    };
    fId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(fId);
  }, [dimensions, camera, isDragging, isPanning, dragStart, dragCurrent, activeLineIdx, currentCity, view]);

  const drawShape = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, size: number, type: StationType, fill: boolean = true, strokeWidth: number = 2.5) => {
    ctx.beginPath();
    if (type === 'circle') ctx.arc(x, y, size, 0, Math.PI * 2);
    else if (type === 'square') ctx.rect(x - size, y - size, size * 2, size * 2);
    else if (type === 'triangle') {
      ctx.moveTo(x, y - size); ctx.lineTo(x - size, y + size); ctx.lineTo(x + size, y + size); ctx.closePath();
    } else if (type === 'pentagon') {
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI / 5) - Math.PI / 2;
        ctx.lineTo(x + Math.cos(a) * size, y + Math.sin(a) * size);
      }
      ctx.closePath();
    } else if (type === 'star') {
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI / 5) - Math.PI / 2;
        const r = i % 2 === 0 ? size : size / 2;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath();
    }
    if (fill) { ctx.fillStyle = 'white'; ctx.fill(); }
    ctx.strokeStyle = THEME.text; ctx.lineWidth = strokeWidth; ctx.stroke();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !engineRef.current || !currentCity) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { stations, lines } = engineRef.current.state;

    ctx.fillStyle = THEME.background;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    // Grid
    ctx.strokeStyle = 'rgba(0,0,0,0.05)';
    ctx.lineWidth = 1;
    for (let x = -2000; x < 5000; x += 100) { ctx.beginPath(); ctx.moveTo(x, -2000); ctx.lineTo(x, 5000); ctx.stroke(); }
    for (let y = -2000; y < 5000; y += 100) { ctx.beginPath(); ctx.moveTo(-2000, y); ctx.lineTo(5000, y); ctx.stroke(); }

    // Water
    ctx.fillStyle = '#D1D1D1';
    currentCity.water.forEach(poly => {
      ctx.beginPath();
      const p0 = project(poly[0].lat, poly[0].lon, currentCity);
      ctx.moveTo(p0.x, p0.y);
      poly.forEach(pt => { const p = project(pt.lat, pt.lon, currentCity); ctx.lineTo(p.x, p.y); });
      ctx.fill();
    });

    // Tunnels/Bridges Visual
    lines.forEach(line => {
      for (let i = 1; i < line.stations.length; i++) {
        const sA = stations.find(s => s.id === line.stations[i-1]);
        const sB = stations.find(s => s.id === line.stations[i]);
        if (sA && sB && isSegmentCrossingWater(sA, sB, currentCity)) {
          const path = [sA, ...getBentPath(sA, sB)];
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = THEME.lineWidth + 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(path[0].x, path[0].y);
          for (let j = 1; j < path.length; j++) ctx.lineTo(path[j].x, path[j].y);
          ctx.stroke();
          
          ctx.strokeStyle = line.color;
          ctx.lineWidth = THEME.lineWidth;
          ctx.setLineDash([5, 5]); // Dashed tunnel effect
          ctx.beginPath();
          ctx.moveTo(path[0].x, path[0].y);
          for (let j = 1; j < path.length; j++) ctx.lineTo(path[j].x, path[j].y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    });

    // Lines & Trains
    lines.forEach(line => {
      if (line.stations.length < 2) return;
      ctx.strokeStyle = line.color; ctx.lineWidth = THEME.lineWidth; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      const s0 = stations.find(s => s.id === line.stations[0]);
      if (s0) {
        ctx.moveTo(s0.x, s0.y);
        for (let i = 1; i < line.stations.length; i++) {
          const sA = stations.find(s => s.id === line.stations[i-1]);
          const sB = stations.find(s => s.id === line.stations[i]);
          if (sA && sB) {
            // Only draw non-water segments normally (water segments handled above or drawn over)
            getBentPath(sA, sB).forEach(pt => ctx.lineTo(pt.x, pt.y));
          }
        }
        ctx.stroke();
      }

      // Render Trains
      line.trains.forEach(train => {
        const sIdx = Math.max(0, Math.min(train.nextStationIndex, line.stations.length - 1));
        const fIdx = Math.max(0, Math.min(train.direction === 1 ? sIdx - 1 : sIdx + 1, line.stations.length - 1));
        const fromS = stations.find(s => s.id === line.stations[fIdx]), toS = stations.find(s => s.id === line.stations[sIdx]);
        if (fromS && toS) {
          const pA = fIdx < sIdx ? fromS : toS, pB = fIdx < sIdx ? toS : fromS;
          let pts = [pA, ...getBentPath(pA, pB)]; if (fIdx >= sIdx) pts.reverse();
          const lenTotal = pts.reduce((acc, p, i) => i === 0 ? 0 : acc + getDistance(pts[i-1], p), 0);
          let targetD = train.progress * lenTotal, curD = 0, tx = fromS.x, ty = fromS.y, angle = 0;
          for (let i = 1; i < pts.length; i++) {
            const segL = getDistance(pts[i-1], pts[i]);
            if (curD + segL >= targetD) { const pr = (targetD - curD) / segL; tx = pts[i-1].x + (pts[i].x - pts[i-1].x) * pr; ty = pts[i-1].y + (pts[i].y - pts[i-1].y) * pr; angle = Math.atan2(pts[i].y - pts[i-1].y, pts[i].x - pts[i-1].x); break; }
            curD += segL;
          }
          ctx.save(); ctx.translate(tx, ty); ctx.rotate(angle);
          // Train body
          ctx.fillStyle = THEME.text; 
          ctx.fillRect(-THEME.trainWidth/2, -THEME.trainHeight/2, THEME.trainWidth, THEME.trainHeight);
          
          // Passenger symbols inside train
          const pSize = THEME.passengerSize * 0.8;
          train.passengers.forEach((p, i) => {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const px = -THEME.trainWidth/2 + 8 + col * (pSize + 4);
            const py = -THEME.trainHeight/2 + 8 + row * (pSize + 4);
            drawShape(ctx, px, py, pSize / 2, p.targetType, true, 1);
          });
          ctx.restore();
        }
      });
    });

    // Drag Preview
    if (isDragging && dragStart && dragCurrent) {
      ctx.strokeStyle = THEME.lineColors[activeLineIdx]; ctx.lineWidth = THEME.lineWidth; ctx.setLineDash([15, 10]);
      ctx.beginPath(); ctx.moveTo(dragStart.x, dragStart.y);
      getBentPath(dragStart, dragCurrent).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke(); ctx.setLineDash([]);
    }

    // Stations & Passengers
    stations.forEach(s => {
      drawShape(ctx, s.x, s.y, THEME.stationSize, s.type);
      ctx.fillStyle = THEME.text; ctx.font = '900 12px Inter'; ctx.textAlign = 'center';
      ctx.fillText(s.name.toUpperCase(), s.x, s.y + THEME.stationSize + 20);
      
      const pSize = THEME.passengerSize;
      s.waitingPassengers.forEach((p, i) => {
        const px = s.x + THEME.stationSize + 10 + (i % 3) * (pSize + 4);
        const py = s.y - THEME.stationSize + Math.floor(i / 3) * (pSize + 4);
        drawShape(ctx, px, py, pSize / 2, p.targetType, true, 1.5);
      });

      // Failure timer
      if (s.timer > 0) {
        ctx.beginPath();
        ctx.strokeStyle = '#EB2827';
        ctx.lineWidth = 4;
        ctx.arc(s.x, s.y, THEME.stationSize + 6, -Math.PI/2, -Math.PI/2 + s.timer * Math.PI * 2);
        ctx.stroke();
      }
    });

    ctx.restore();
  }, [dimensions, camera, currentCity, drawShape, isDragging, dragStart, dragCurrent, activeLineIdx]);

  const handleLineDelete = () => {
    if (engineRef.current) {
      engineRef.current.removeLine(activeLineIdx);
      setGameState({ ...engineRef.current.state });
    }
  };

  const handleAddTrain = () => {
    if (engineRef.current) {
      engineRef.current.addTrainToLine(activeLineIdx);
      setGameState({ ...engineRef.current.state });
    }
  };

  if (view === 'MAIN_MENU') {
    return (
      <div className="fixed inset-0 bg-[#1A1A1A] flex flex-col items-start justify-center p-24 select-none">
        <h1 className="text-[120px] font-black tracking-tighter text-white mb-20 leading-none">MINI METRO ▲</h1>
        <div className="flex flex-col gap-4">
          <MenuBtn icon="→" onClick={() => setView('CITY_SELECT')}>Play</MenuBtn>
          <MenuBtn icon="↗" onClick={() => {}}>Resume</MenuBtn>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
          {CITIES.map(city => (
            <div key={city.id} onClick={() => initGame(city)} className="cursor-pointer group">
              <h3 className="text-5xl font-black uppercase tracking-tighter mb-6 group-hover:text-[#3E86C6] transition-colors">{city.name}</h3>
              <div className="aspect-square bg-white/5 border border-white/10 relative overflow-hidden p-8 transition-all group-hover:border-white/30">
                <div className="flex gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">Efficiency Required: {Math.floor(city.difficulty * 10)}/10.</p>
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                   <div className="w-full h-px bg-white rotate-[30deg]" />
                   <div className="absolute top-1/2 left-1/2 w-48 h-px bg-white -rotate-[15deg] origin-center" />
                </div>
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
          <span className="text-xl font-black uppercase tracking-[0.4em] group-hover:text-[#2ECC71]">Confirm Connection</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#EBEBEB]">
      <div className="absolute top-8 left-8 z-50 pointer-events-auto flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-black uppercase tracking-tighter">{currentCity?.name}</h1>
          <div className="bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase rounded-sm">Week {gameState.level}</div>
        </div>
        <p className="text-[10px] font-bold uppercase opacity-40 tracking-[0.3em]">{DAYS[Math.floor(gameState.daysElapsed % 7)]}</p>
        <button onClick={() => setView('CITY_SELECT')} className="text-[9px] font-black uppercase tracking-widest opacity-30 hover:opacity-100 mt-4">← System Select</button>
      </div>

      <Stats score={gameState.score} timeScale={gameState.timeScale} onSpeedChange={(s) => { if(engineRef.current) engineRef.current.state.timeScale = s; setGameState({...gameState, timeScale: s}); }} />

      <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} onWheel={handleWheel}
        onMouseDown={e => {
          const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
          const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
          const hit = gameState.stations.find(s => getDistance(s, world) < 40 / camera.scale);
          if (hit) { setDragStart(hit); setIsDragging(true); setDragCurrent(world); } else { setIsPanning(true); setDragCurrent({ x: e.clientX, y: e.clientY }); }
        }}
        onMouseMove={e => {
          const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
          if (isPanning && dragCurrent) { setCamera(prev => ({ ...prev, x: prev.x + (e.clientX - dragCurrent.x), y: prev.y + (e.clientY - dragCurrent.y) })); setDragCurrent({ x: e.clientX, y: e.clientY }); } 
          else if (isDragging) { setDragCurrent(screenToWorld(e.clientX - rect.left, e.clientY - rect.top)); }
        }}
        onMouseUp={e => {
          if (isDragging && dragStart && engineRef.current) {
            const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
            const worldMouse = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
            const hit = gameState.stations.find(s => getDistance(s, worldMouse) < 40 / camera.scale);
            
            if (hit && hit.id !== dragStart.id && currentCity) {
              engineRef.current.tryConnectStations(activeLineIdx, dragStart, hit, currentCity);
              setGameState({ ...engineRef.current.state });
            }
          }
          setIsPanning(false); setIsDragging(false); setDragStart(null); setDragCurrent(null);
        }}
      />

      <ResourcePanel resources={gameState.resources} activeLineIdx={activeLineIdx} onLineIdxChange={setActiveLineIdx} lines={gameState.lines} onAddTrain={handleAddTrain} onDeleteLine={handleLineDelete} onAudit={() => setShowAudit(!showAudit)} />

      {showAudit && (
        <div className="fixed bottom-32 left-8 z-[100] bg-white p-8 border-2 border-black/5 shadow-2xl min-w-[300px]">
           <h4 className="text-xs font-black uppercase mb-4">System Audit</h4>
           {Object.entries(gameState.totalResources).map(([k, v]) => (
             <div key={k} className="flex justify-between py-1 text-[10px] font-bold uppercase">
               <span className="opacity-40">{k}</span>
               <span>{gameState.resources[k as keyof typeof gameState.resources]} / {v}</span>
             </div>
           ))}
        </div>
      )}

      {gameState.isPausedForReward && gameState.pendingRewardOptions && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white p-12 max-w-2xl w-full border-4 border-black">
            <h2 className="text-4xl font-black uppercase tracking-tighter mb-12">System Upgrade</h2>
            <div className="grid grid-cols-2 gap-6">
              {gameState.pendingRewardOptions.map(choice => (
                <button key={choice.id} onClick={() => { engineRef.current?.selectReward(choice); setGameState({...engineRef.current!.state}); }} className="flex flex-col items-center p-8 bg-black text-white hover:bg-[#2ECC71]">
                  <span className="text-[10px] font-black uppercase opacity-60 mb-2">{choice.label}</span>
                  <span className="text-xl font-black uppercase">{choice.description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MenuBtn = ({ children, icon, onClick }: any) => (
  <div onClick={onClick} className="flex items-center gap-6 group cursor-pointer">
    <span className="text-white/40 text-3xl font-black group-hover:text-[#3E86C6]">{icon}</span>
    <div className="bg-[#3E86C6] px-8 py-3 group-hover:bg-white group-hover:text-black transition-all">
      <span className="text-4xl font-black text-white group-hover:text-black uppercase tracking-tighter">{children}</span>
    </div>
  </div>
);

const ModeItem = ({ label, active, onClick }: any) => (
  <div onClick={onClick} className={`cursor-pointer transition-all ${active ? 'bg-[#2ECC71] px-16 py-4' : 'opacity-40 hover:opacity-100'}`}>
    <span className={`text-6xl font-black uppercase tracking-tighter ${active ? 'text-white' : 'text-white/40'}`}>{label}</span>
  </div>
);

export default App;