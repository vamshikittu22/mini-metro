import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameState, Station, TransitLine, CITIES, City, Point, StationType, GameMode } from './types';
import { THEME, GAME_CONFIG } from './constants';
import { project, snapToAngle, getDistance, isSegmentCrossingWater, WORLD_SIZE, distToSegment, getBentPath } from './services/geometry';
import { GameEngine } from './services/gameEngine';
import { lerpColor } from './services/utils';

// Components
import { Stats } from './components/HUD/Stats';
import { ResourcePanel } from './components/HUD/ResourcePanel';
import { BaseButton } from './components/UI/BaseButton';

type AppView = 'MAIN_MENU' | 'CITY_SELECT' | 'MODE_SELECT' | 'GAME';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

// Refined Day/Night Cycle Colors
const DAY_CYCLE_COLORS = {
  DAY: '#FFFFFF',      // Pure White (Swiss Style)
  NIGHT: '#1A1A1A',    // Deep Charcoal
  SUNRISE: '#E0E4E8',  // Cool Grey Dawn
  SUNSET: '#E8E0D8',   // Warm Dusk
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<AppView>('MAIN_MENU');
  const [currentCity, setCurrentCity] = useState<City | null>(null);
  const [selectedMode, setSelectedMode] = useState<GameMode>('NORMAL');
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 0.8 });
  
  const [gameState, setGameState] = useState<GameState>({
    cityId: '',
    mode: 'NORMAL',
    stations: [],
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
    resources: { lines: 5, trains: 3, tunnels: 3, wagons: 5 }
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

  // Background color memoized to prevent jitter during UI updates
  const currentBg = useMemo(() => {
    const { daysElapsed, dayNightAuto, isNightManual } = gameState;
    if (!dayNightAuto) {
      return isNightManual ? DAY_CYCLE_COLORS.NIGHT : DAY_CYCLE_COLORS.DAY;
    }
    const t = (daysElapsed * 0.5) % 1.0; 
    if (t < 0.25) return lerpColor(DAY_CYCLE_COLORS.SUNRISE, DAY_CYCLE_COLORS.DAY, t * 4);
    if (t < 0.5) return lerpColor(DAY_CYCLE_COLORS.DAY, DAY_CYCLE_COLORS.SUNSET, (t - 0.25) * 4);
    if (t < 0.75) return lerpColor(DAY_CYCLE_COLORS.SUNSET, DAY_CYCLE_COLORS.NIGHT, (t - 0.5) * 4);
    return lerpColor(DAY_CYCLE_COLORS.NIGHT, DAY_CYCLE_COLORS.SUNRISE, (t - 0.75) * 4);
  }, [gameState.daysElapsed, gameState.dayNightAuto, gameState.isNightManual]);

  // Dynamic text color for high contrast against background
  const currentText = useMemo(() => {
    const isDark = currentBg.toLowerCase() === DAY_CYCLE_COLORS.NIGHT.toLowerCase() || 
                   currentBg.toLowerCase().startsWith('#1') || 
                   currentBg.toLowerCase().startsWith('#0');
    return isDark ? '#FFFFFF' : '#1A1A1A';
  }, [currentBg]);

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
    const engine = new GameEngine({
      cityId: currentCity.id, mode: selectedMode, stations: initialStations, lines: [], score: 0, level: 1, gameActive: true, autoSpawn: true, dayNightAuto: true, isNightManual: false, timeScale: 1, daysElapsed: 0, nextRewardIn: 60000 * 7,
      resources: { lines: 5, trains: 3, tunnels: 3, wagons: 5 }
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
    const loop = () => {
      if (engineRef.current && engineRef.current.state.gameActive && engineRef.current.state.autoSpawn) { 
        engineRef.current.spawnPassenger(); 
        const nextSpawn = engineRef.current.getDynamicSpawnRate() / currentCity.difficulty;
        pTimeout = setTimeout(loop, nextSpawn); 
      } else {
        pTimeout = setTimeout(loop, 2000); 
      }
    };
    pTimeout = setTimeout(loop, GAME_CONFIG.spawnRate);
    const sInt = setInterval(() => {
      if (engineRef.current && engineRef.current.state.gameActive && engineRef.current.state.autoSpawn) {
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
  }, [dimensions, camera, isDragging, isPanning, dragStart, dragCurrent, activeLineIdx, currentCity, view, currentBg]);

  const drawShape = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, size: number, type: StationType, fill: boolean = true) => {
    ctx.beginPath();
    if (type === 'circle') ctx.arc(x, y, size, 0, Math.PI * 2);
    else if (type === 'square') ctx.rect(x - size, y - size, size * 2, size * 2);
    else if (type === 'triangle') {
      ctx.moveTo(x, y - size);
      ctx.lineTo(x - size, y + size);
      ctx.lineTo(x + size, y + size);
      ctx.closePath();
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
    if (fill) {
      ctx.fillStyle = currentBg;
      ctx.fill();
    }
    ctx.strokeStyle = currentText;
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [currentBg, currentText]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !engineRef.current || !currentCity) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { stations, lines } = engineRef.current.state;
    const uiScale = Math.pow(1 / camera.scale, 0.85); 

    ctx.fillStyle = currentBg;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    ctx.strokeStyle = lerpColor(currentBg, currentText, 0.08);
    ctx.lineWidth = 1;
    const gridStep = 200;
    const startX = Math.floor((-camera.x / camera.scale) / gridStep) * gridStep;
    const endX = Math.ceil((dimensions.width - camera.x / camera.scale) / gridStep) * gridStep;
    const startY = Math.floor((-camera.y / camera.scale) / gridStep) * gridStep;
    const endY = Math.ceil((dimensions.height - camera.y / camera.scale) / gridStep) * gridStep;

    for (let x = startX; x <= endX; x += gridStep) {
      ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke();
    }
    for (let y = startY; y <= endY; y += gridStep) {
      ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke();
    }

    ctx.fillStyle = lerpColor(currentBg, '#1a2b38', 0.2);
    currentCity.water.forEach(poly => {
      ctx.beginPath();
      poly.forEach((p, i) => { 
        const pos = project(p.lat, p.lon, currentCity); 
        if (i === 0) ctx.moveTo(pos.x, pos.y); else ctx.lineTo(pos.x, pos.y); 
      });
      ctx.closePath(); ctx.fill();
    });

    lines.forEach(line => {
      if (line.stations.length < 2) return;
      line.stations.forEach((sid, idx) => {
        if (idx === 0) return;
        const s1 = stations.find(s => s.id === line.stations[idx-1]), s2 = stations.find(s => s.id === sid);
        if (s1 && s2) {
          const path = [s1, ...getBentPath(s1, s2)];
          ctx.beginPath(); 
          ctx.strokeStyle = line.color; 
          ctx.lineWidth = THEME.lineWidth; 
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.moveTo(s1.x, s1.y); 
          path.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); 
          ctx.stroke();

          if (isSegmentCrossingWater(s1, s2, currentCity)) {
            ctx.save(); ctx.lineCap = 'butt'; ctx.strokeStyle = currentBg; ctx.lineWidth = THEME.lineWidth / 2; ctx.setLineDash([12, 12]);
            ctx.beginPath(); ctx.moveTo(s1.x, s1.y); path.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
            ctx.restore();
          }
        }
      });

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
          ctx.fillStyle = currentText; 
          ctx.fillRect(-THEME.trainWidth/2, -THEME.trainHeight/2, THEME.trainWidth, THEME.trainHeight);
          
          const enginePassengers = train.passengers.slice(0, GAME_CONFIG.trainCapacity);
          enginePassengers.forEach((p, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const pX = -THEME.trainWidth/2 + 12 + col * 24;
            const pY = -THEME.trainHeight/2 + 10 + row * 18;
            ctx.fillStyle = currentBg; ctx.strokeStyle = 'transparent';
            drawShape(ctx, pX, pY, 6, p.targetType, true);
          });
          
          for (let w = 0; w < train.wagons; w++) {
            const offset = -(THEME.trainWidth / 2 + (w + 1) * (THEME.wagonWidth + THEME.wagonGap));
            ctx.fillStyle = currentText;
            ctx.fillRect(offset, -THEME.trainHeight / 2, THEME.wagonWidth, THEME.trainHeight);
            
            const startIdx = (w + 1) * GAME_CONFIG.trainCapacity;
            const wagonPassengers = train.passengers.slice(startIdx, startIdx + GAME_CONFIG.trainCapacity);
            wagonPassengers.forEach((p, i) => {
              const col = i % 3;
              const row = Math.floor(i / 3);
              const pX = offset + 12 + col * 18;
              const pY = -THEME.trainHeight/2 + 10 + row * 18;
              ctx.fillStyle = currentBg; ctx.strokeStyle = 'transparent';
              drawShape(ctx, pX, pY, 5, p.targetType, true);
            });
          }
          ctx.restore();
        }
      });
    });

    if (isDragging && dragStart && dragCurrent) {
       ctx.strokeStyle = THEME.lineColors[activeLineIdx];
       ctx.lineWidth = THEME.lineWidth;
       ctx.beginPath(); ctx.setLineDash([10, 5]);
       const hitStation = stations.find(s => getDistance(s, dragCurrent) < 50 / camera.scale);
       const targetPoint = hitStation ? { x: hitStation.x, y: hitStation.y } : snapToAngle(dragStart, dragCurrent);
       const path = getBentPath(dragStart, targetPoint);
       ctx.moveTo(dragStart.x, dragStart.y);
       path.forEach(p => ctx.lineTo(p.x, p.y));
       ctx.stroke(); ctx.setLineDash([]);
    }

    stations.forEach(s => {
      const size = THEME.stationSize * uiScale;
      drawShape(ctx, s.x, s.y, size, s.type, true);

      ctx.fillStyle = currentText; ctx.font = `900 ${18 * uiScale}px Inter`; ctx.textAlign = 'center'; 
      ctx.fillText(s.name.toUpperCase(), s.x, s.y + size + (28 * uiScale));

      s.waitingPassengers.forEach((p, i) => {
        const pS = THEME.passengerSize * uiScale;
        const spacing = pS * 2.8;
        const cols = 3;
        const ox = (size + 15 * uiScale) + (Math.floor(i / cols) * spacing);
        const px = s.x + ox;
        const py = s.y - (size - 8 * uiScale) + (i % cols) * spacing;
        
        ctx.fillStyle = currentText; ctx.strokeStyle = 'transparent';
        drawShape(ctx, px, py, pS, p.targetType, true);
      });

      if (s.timer > 0) { ctx.strokeStyle='#FF4444'; ctx.lineWidth=7*uiScale; ctx.beginPath(); ctx.arc(s.x,s.y,size+14*uiScale, -Math.PI/2, -Math.PI/2+Math.PI*2*s.timer); ctx.stroke(); }
    });
    ctx.restore();
  }, [dimensions, gameState, camera, currentCity, isDragging, dragStart, dragCurrent, activeLineIdx, view, currentBg, currentText, drawShape]);

  const MenuButton = ({ label, icon, onClick }: { label: string, icon?: string, onClick?: () => void }) => (
    <div className="flex items-center gap-4 group cursor-pointer" onClick={onClick}>
      <span className="text-white text-4xl group-hover:translate-x-2 transition-transform">{icon || '→'}</span>
      <div className="bg-[#3E86C6] px-6 py-2">
        <span className="text-white text-5xl font-black uppercase tracking-tight">{label}</span>
      </div>
    </div>
  );

  if (view === 'MAIN_MENU') {
    return (
      <div className="fixed inset-0 bg-[#222222] z-[300] flex flex-col items-start justify-center p-24 overflow-hidden select-none">
        <h1 className="text-9xl font-black tracking-tighter text-white mb-20 uppercase flex items-center gap-4">
          Mini Metro <span className="text-4xl">▲</span>
        </h1>
        <div className="flex flex-col gap-8">
          <MenuButton label="Play" onClick={() => setView('CITY_SELECT')} />
          <MenuButton label="Resume" icon="↗" />
          <MenuButton label="Daily Challenge" icon="→" />
          <MenuButton label="Options" icon="↓" />
          <MenuButton label="Exit" icon="↙" />
        </div>
      </div>
    );
  }

  if (view === 'CITY_SELECT') {
    return (
      <div className="fixed inset-0 bg-[#222222] z-[300] flex flex-col items-center p-24 overflow-y-auto no-scrollbar select-none">
        <div className="w-full flex justify-between items-center mb-16">
          <h2 className="text-7xl font-black text-white/10 uppercase tracking-tighter">Cities</h2>
          <button onClick={() => setView('MAIN_MENU')} className="text-white text-xl font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">Back</button>
        </div>
        
        <div className="flex gap-12 overflow-x-auto w-full pb-12 snap-x no-scrollbar">
          {CITIES.map(city => (
            <div 
              key={city.id} 
              onClick={() => initGame(city)}
              className="flex-shrink-0 w-[450px] snap-center cursor-pointer group"
            >
              <h3 className="text-6xl font-black text-white mb-8 group-hover:translate-x-2 transition-transform">{city.name}</h3>
              <div className="aspect-[4/5] bg-[#1a1a1a] border border-white/5 relative p-12 flex flex-col justify-between">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-[#51A03E]" />
                  <div className="absolute top-0 bottom-0 left-1/3 w-1 bg-[#EB2827]" />
                  <div className="absolute top-1/4 bottom-1/4 left-1/2 w-1 bg-[#FBAE17] -rotate-45" />
                </div>
                
                <div className="relative z-10">
                  <div className="flex gap-2 mb-4">
                    {THEME.lineColors.slice(0, 6).map((c, i) => (
                      <div key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <p className="text-white/40 text-lg font-bold uppercase tracking-wider leading-relaxed">
                    Redesign the original underground railway, the {city.name} transit network.
                  </p>
                </div>
                
                <div className="absolute top-0 right-0 p-4">
                  <div className="w-8 h-8 bg-white/10 group-hover:bg-white transition-colors flex items-center justify-center">
                    <span className="text-black text-xl">↗</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-12 right-24 flex gap-12">
           <div className="flex items-center gap-4 cursor-pointer group" onClick={() => { if(currentCity) setView('MODE_SELECT') }}>
              <span className="text-white text-3xl">→</span>
              <div className="bg-[#51A03E] px-4 py-2">
                <span className="text-white text-5xl font-black uppercase tracking-tight">Play</span>
              </div>
            </div>
            <div className="flex items-center gap-4 cursor-pointer group opacity-40">
              <span className="text-white text-3xl">↓</span>
              <div className="bg-[#51A03E] px-4 py-2">
                <span className="text-white text-5xl font-black uppercase tracking-tight">Mode</span>
              </div>
            </div>
        </div>
      </div>
    );
  }

  if (view === 'MODE_SELECT') {
    const modes: { id: GameMode, label: string, desc: string }[] = [
      { id: 'NORMAL', label: 'Normal', desc: 'Standard metro operations. Stations overcrowd normally.' },
      { id: 'EXTREME', label: 'Extreme', desc: 'Accelerated passenger growth. Overcrowding happens fast.' },
      { id: 'ENDLESS', label: 'Endless', desc: 'No system failure. Build your dream network forever.' },
      { id: 'CREATIVE', label: 'Creative', desc: 'Stations do not overcrowd. Place and edit stations freely.' },
    ];

    return (
      <div className="fixed inset-0 bg-[#222222] z-[300] flex flex-col items-center justify-center p-24 select-none">
        <div className="flex flex-col gap-6 text-center">
          {modes.map(mode => (
            <div 
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              className={`px-12 py-4 cursor-pointer transition-all ${selectedMode === mode.id ? 'bg-[#51A03E] scale-110' : 'opacity-40 hover:opacity-100'}`}
            >
              <span className={`text-white font-black uppercase tracking-tighter ${selectedMode === mode.id ? 'text-8xl' : 'text-6xl'}`}>
                {mode.label}
              </span>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center max-w-lg min-h-[100px]">
          <p className="text-white/60 text-xl font-bold uppercase tracking-widest leading-relaxed">
            {modes.find(m => m.id === selectedMode)?.desc}
          </p>
          <div className="mt-12 flex flex-col items-center gap-2">
            <div className="w-2 h-16 bg-[#51A03E]" />
            <div className="w-8 h-8 rounded-full border-4 border-white" />
            <div className="w-2 h-16 bg-[#51A03E]" />
          </div>
        </div>

        <button 
          onClick={startGame}
          className="mt-12 text-white text-2xl font-black uppercase tracking-[0.5em] hover:text-[#51A03E] transition-colors"
        >
          Confirm Connection
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen select-none overflow-hidden font-sans" style={{ backgroundColor: currentBg }}>
      <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex flex-col gap-4 pointer-events-auto">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black tracking-tighter uppercase" style={{ color: currentText }}>{currentCity?.name}</h1>
              <div className="px-3 py-1 rounded-sm text-[10px] font-black uppercase shadow-lg" style={{ backgroundColor: currentText, color: currentBg }}>WEEK {gameState.level}</div>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] mt-1" style={{ color: lerpColor(currentBg, currentText, 0.4) }}>{DAYS[Math.floor(gameState.daysElapsed % 7)]}</p>
          </div>
          <button onClick={() => setView('CITY_SELECT')} className="text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2" style={{ color: lerpColor(currentBg, currentText, 0.4) }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            System Select
          </button>
        </div>
        <Stats 
          score={gameState.score} 
          timeScale={gameState.timeScale} 
          autoSpawn={gameState.autoSpawn}
          dayNightAuto={gameState.dayNightAuto}
          isNightManual={gameState.isNightManual}
          currentText={currentText}
          currentBg={currentBg}
          onSpeedChange={(s) => { if(engineRef.current) engineRef.current.state.timeScale = s; setGameState({...gameState, timeScale: s}); }} 
          onToggleAutoSpawn={() => { if(engineRef.current) engineRef.current.state.autoSpawn = !engineRef.current.state.autoSpawn; setGameState({...gameState, autoSpawn: !gameState.autoSpawn}); }}
          onToggleDayNightAuto={() => { if(engineRef.current) engineRef.current.state.dayNightAuto = !engineRef.current.state.dayNightAuto; setGameState({...gameState, dayNightAuto: !gameState.dayNightAuto}); }}
          onToggleManualDayNight={() => { if(engineRef.current) engineRef.current.state.isNightManual = !engineRef.current.state.isNightManual; setGameState({...gameState, isNightManual: !gameState.isNightManual}); }}
        />
      </div>

      <canvas 
        ref={canvasRef} 
        width={dimensions.width} 
        height={dimensions.height} 
        onMouseDown={e => {
          if (!gameState.gameActive) return;
          const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
          const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
          const hit = gameState.stations.find(s => getDistance(s, world) < 30 / camera.scale);
          if (hit) { setDragStart(hit); setIsDragging(true); } else { setIsPanning(true); setDragCurrent({ x: e.clientX, y: e.clientY }); }
        }} 
        onMouseMove={e => {
          const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
          if (isPanning && dragCurrent) { setCamera(prev => ({ ...prev, x: prev.x + (e.clientX - dragCurrent.x), y: prev.y + (e.clientY - dragCurrent.y) })); setDragCurrent({ x: e.clientX, y: e.clientY }); }
          else if (isDragging) setDragCurrent(screenToWorld(e.clientX - rect.left, e.clientY - rect.top));
        }} 
        onMouseUp={e => {
          if (isPanning) { setIsPanning(false); setDragCurrent(null); }
          else if (isDragging && dragStart && engineRef.current) {
            const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
            const worldMouse = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
            const hit = gameState.stations.find(s => getDistance(s, worldMouse) < 30 / camera.scale);
            if (hit && hit.id !== dragStart.id) {
              const water = isSegmentCrossingWater(dragStart, hit, currentCity!);
              if (!water || engineRef.current.state.resources.tunnels > 0) {
                let line = engineRef.current.state.lines.find(l => l.id === activeLineIdx);
                if (!line && engineRef.current.state.resources.lines > 0) {
                  line = { id: activeLineIdx, color: THEME.lineColors[activeLineIdx], stations: [dragStart.id, hit.id], trains: [{ id: Date.now(), lineId: activeLineIdx, nextStationIndex: 1, progress: 0, direction: 1, passengers: [], capacity: GAME_CONFIG.trainCapacity, wagons: 0 }] };
                  engineRef.current.state.lines.push(line); engineRef.current.state.resources.lines--; if (water) engineRef.current.state.resources.tunnels--;
                  engineRef.current.refreshAllPassengerRoutes();
                } else if (line) {
                  if (line.stations[0] === dragStart.id) { line.stations.unshift(hit.id); line.trains.forEach(t => t.nextStationIndex++); }
                  else if (line.stations[line.stations.length-1] === dragStart.id) line.stations.push(hit.id);
                  if (water) engineRef.current.state.resources.tunnels--;
                  engineRef.current.refreshAllPassengerRoutes();
                }
              }
            }
            setIsDragging(false); setDragStart(null); setDragCurrent(null);
          }
        }} 
        onWheel={e => {
          const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
          const mX = e.clientX - rect.left, mY = e.clientY - rect.top, d = -e.deltaY * 0.001, nS = Math.min(2.0, Math.max(0.3, camera.scale + d));
          const wX = (mX - camera.x) / camera.scale, wY = (mY - camera.y) / camera.scale;
          setCamera({ x: mX - wX * nS, y: mY - wY * nS, scale: nS });
        }} 
        onContextMenu={e => {
          e.preventDefault();
          if (!gameState.gameActive || !engineRef.current) return;
          const rect = canvasRef.current?.getBoundingClientRect();
          const world = screenToWorld(e.clientX - rect!.left, e.clientY - rect!.top);
          const hitStation = gameState.stations.find(s => getDistance(s, world) < 40 / camera.scale);
          if (hitStation) {
            const line = gameState.lines.find(l => l.id === activeLineIdx);
            if (line) {
              const idx = line.stations.indexOf(hitStation.id);
              if (idx === 0) engineRef.current.removeSegment(line.id, 0, 0);
              else if (idx === line.stations.length - 1) engineRef.current.removeSegment(line.id, idx - 1, idx);
            }
          }
        }}
      />
      
      <ResourcePanel 
        resources={gameState.resources} 
        activeLineIdx={activeLineIdx} 
        onLineIdxChange={setActiveLineIdx} 
        lines={gameState.lines}
        onAddTrain={() => engineRef.current?.addTrainToLine(activeLineIdx)}
        onRemoveTrain={(tId) => engineRef.current?.removeTrainFromLine(activeLineIdx, tId)}
        onAddWagon={(tId) => engineRef.current?.addWagonToTrain(activeLineIdx, tId)}
        onRemoveWagon={(tId) => engineRef.current?.removeWagonFromTrain(activeLineIdx, tId)}
        onDeleteLine={() => { engineRef.current?.removeLine(activeLineIdx); }}
      />

      {!gameState.gameActive && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur pointer-events-auto">
          <div className="text-center">
            <h2 className="text-8xl font-black uppercase tracking-tighter text-white mb-4">Service Terminated</h2>
            <p className="text-2xl font-medium text-white/40 mb-12">System overload. Total score: {gameState.score}</p>
            <BaseButton size="lg" onClick={() => window.location.reload()}>Reboot System</BaseButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;