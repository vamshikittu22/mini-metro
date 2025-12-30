import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Station, TransitLine, CITIES, City, Point, StationType } from './types';
import { THEME, GAME_CONFIG } from './constants';
import { project, snapToAngle, getDistance, isSegmentCrossingWater, WORLD_SIZE, distToSegment, getBentPath } from './services/geometry';
import { GameEngine } from './services/gameEngine';

// Components
import { Stats } from './components/HUD/Stats';
import { ResourcePanel } from './components/HUD/ResourcePanel';
import { BaseButton } from './components/UI/BaseButton';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentCity, setCurrentCity] = useState<City | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 0.8 });
  
  const [gameState, setGameState] = useState<GameState>({
    cityId: '',
    stations: [],
    lines: [],
    score: 0,
    level: 1,
    gameActive: true,
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

  const initGame = (city: City) => {
    const initialStations: Station[] = city.initialStations.map(s => {
      const pos = project(s.lat, s.lon, city);
      return { ...pos, id: s.id, type: s.type, name: s.name, waitingPassengers: [], timer: 0 };
    });
    const engine = new GameEngine({
      cityId: city.id, stations: initialStations, lines: [], score: 0, level: 1, gameActive: true, timeScale: 1, daysElapsed: 0, nextRewardIn: 60000 * 7,
      resources: { lines: 5, trains: 3, tunnels: 3, wagons: 5 }
    });
    engineRef.current = engine;
    setGameState({ ...engine.state });
    
    // Auto-frame camera
    const minX = Math.min(...initialStations.map(s => s.x));
    const maxX = Math.max(...initialStations.map(s => s.x));
    const minY = Math.min(...initialStations.map(s => s.y));
    const maxY = Math.max(...initialStations.map(s => s.y));
    const initialScale = Math.min(1.0, (window.innerWidth * 0.4) / (maxX - minX || 1));
    setCamera({ x: window.innerWidth / 2 - ((minX + maxX) / 2) * initialScale, y: window.innerHeight / 2 - ((minY + maxY) / 2) * initialScale, scale: initialScale });
    setCurrentCity(city);
  };

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!currentCity) return;
    let pTimeout: any;
    const loop = () => {
      if (engineRef.current && engineRef.current.state.gameActive) { 
        engineRef.current.spawnPassenger(); 
        const nextSpawn = engineRef.current.getDynamicSpawnRate() / currentCity.difficulty;
        pTimeout = setTimeout(loop, nextSpawn); 
      }
    };
    pTimeout = setTimeout(loop, GAME_CONFIG.spawnRate);
    const sInt = setInterval(() => {
      if (engineRef.current && engineRef.current.state.gameActive) {
        engineRef.current.spawnStation(window.innerWidth, window.innerHeight, project);
      }
    }, GAME_CONFIG.stationSpawnRate);
    return () => { clearTimeout(pTimeout); clearInterval(sInt); };
  }, [currentCity]);

  useEffect(() => {
    if (!currentCity) return;
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
  }, [dimensions, camera, isDragging, isPanning, dragStart, dragCurrent, activeLineIdx, currentCity]);

  const drawShape = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, type: StationType, fill: boolean = true) => {
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
    if (fill) ctx.fill();
    ctx.stroke();
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !engineRef.current || !currentCity) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { stations, lines } = engineRef.current.state;
    const uiScale = Math.pow(1 / camera.scale, 0.85); 

    ctx.fillStyle = THEME.background;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    // Water
    ctx.fillStyle = '#E3E9F0';
    currentCity.water.forEach(poly => {
      ctx.beginPath();
      poly.forEach((p, i) => { 
        const pos = project(p.lat, p.lon, currentCity); 
        if (i === 0) ctx.moveTo(pos.x, pos.y); else ctx.lineTo(pos.x, pos.y); 
      });
      ctx.closePath(); ctx.fill();
    });

    // Lines
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
            ctx.save(); ctx.lineCap = 'butt'; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = THEME.lineWidth / 3; ctx.setLineDash([8, 12]);
            ctx.beginPath(); ctx.moveTo(s1.x, s1.y); path.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
            ctx.restore();
          }
        }
      });

      // Trains & Wagons
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
          ctx.fillStyle = THEME.text; 
          ctx.fillRect(-THEME.trainWidth/2, -THEME.trainHeight/2, THEME.trainWidth, THEME.trainHeight);
          
          // Draw engine passengers - grid based for maximum visibility
          const enginePassengers = train.passengers.slice(0, GAME_CONFIG.trainCapacity);
          enginePassengers.forEach((p, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            const pX = -THEME.trainWidth/2 + 15 + col * 27;
            const pY = -THEME.trainHeight/2 + 12 + row * 22;
            ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = 'transparent';
            drawShape(ctx, pX, pY, 7.5, p.targetType, true);
          });
          
          for (let w = 0; w < train.wagons; w++) {
            const offset = -(THEME.trainWidth / 2 + (w + 1) * (THEME.wagonWidth + THEME.wagonGap));
            ctx.fillStyle = THEME.text;
            ctx.fillRect(offset, -THEME.trainHeight / 2, THEME.wagonWidth, THEME.trainHeight);
            
            const startIdx = (w + 1) * GAME_CONFIG.trainCapacity;
            const wagonPassengers = train.passengers.slice(startIdx, startIdx + GAME_CONFIG.trainCapacity);
            wagonPassengers.forEach((p, i) => {
              const col = i % 3;
              const row = Math.floor(i / 3);
              const pX = offset + 13 + col * 22;
              const pY = -THEME.trainHeight/2 + 12 + row * 22;
              ctx.fillStyle = '#FFFFFF'; ctx.strokeStyle = 'transparent';
              drawShape(ctx, pX, pY, 6.5, p.targetType, true);
            });
          }
          ctx.restore();
        }
      });
    });

    // Ghost line
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

    // Stations
    stations.forEach(s => {
      const size = THEME.stationSize * uiScale;
      ctx.strokeStyle = THEME.stationStroke; ctx.fillStyle = THEME.stationFill; ctx.lineWidth = 4 * uiScale;
      drawShape(ctx, s.x, s.y, size, s.type, true);

      ctx.fillStyle = THEME.text; ctx.font = `900 ${18 * uiScale}px Inter`; ctx.textAlign = 'center'; 
      ctx.fillText(s.name.toUpperCase(), s.x, s.y + size + (28 * uiScale));

      // Station passengers
      s.waitingPassengers.forEach((p, i) => {
        const pS = THEME.passengerSize * uiScale;
        const spacing = pS * 2.8;
        const cols = 3;
        const ox = (size + 15 * uiScale) + (Math.floor(i / cols) * spacing);
        const px = s.x + ox;
        const py = s.y - (size - 8 * uiScale) + (i % cols) * spacing;
        
        ctx.fillStyle = THEME.text; ctx.strokeStyle = 'transparent';
        drawShape(ctx, px, py, pS, p.targetType, true);
      });

      if (s.timer > 0) { ctx.strokeStyle='#FF4444'; ctx.lineWidth=7*uiScale; ctx.beginPath(); ctx.arc(s.x,s.y,size+14*uiScale, -Math.PI/2, -Math.PI/2+Math.PI*2*s.timer); ctx.stroke(); }
    });
    ctx.restore();
  }, [dimensions, gameState, camera, currentCity, isDragging, dragStart, dragCurrent, activeLineIdx]);

  if (!currentCity) {
    return (
      <div id="city-menu" className="fixed inset-0 bg-[#F8F4EE] z-[300] flex flex-col items-center justify-center p-12 overflow-y-auto no-scrollbar">
        <div className="max-w-4xl w-full text-center">
          <h1 className="text-8xl font-black tracking-tighter text-[#2F3436] mb-4 uppercase">System Select</h1>
          <p className="text-[#2F3436]/40 font-bold tracking-[0.6em] mb-20 uppercase">Global Transit Architect</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CITIES.map(city => (
              <div 
                key={city.id} 
                onClick={() => initGame(city)}
                className="group relative bg-white border border-black/5 p-8 rounded-[2rem] text-left cursor-pointer transition-all hover:scale-105 hover:shadow-2xl hover:border-black/20"
              >
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-2xl font-black text-[#2F3436] uppercase tracking-tight">{city.name}</h3>
                  <div className="w-10 h-1 rounded-full transition-all group-hover:w-full" style={{ backgroundColor: city.color }} />
                </div>
                <div className="flex gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-black/20 uppercase">Difficulty</span>
                    <div className="flex gap-0.5 mt-1">
                      {[...Array(Math.ceil(city.difficulty * 2))].map((_, i) => (
                        <div key={i} className="w-2 h-2 bg-[#2F3436] rounded-full" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-[#F8F4EE] select-none overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex flex-col gap-4 pointer-events-auto">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black tracking-tighter text-[#2F3436] uppercase">{currentCity.name}</h1>
              <div className="bg-[#2F3436] text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-lg">WEEK {gameState.level}</div>
            </div>
            <p className="text-[10px] font-bold text-[#2F3436]/40 uppercase tracking-[0.4em] mt-1">{DAYS[Math.floor(gameState.daysElapsed % 7)]}</p>
          </div>
          <button onClick={() => setCurrentCity(null)} className="text-[10px] font-black text-black/40 hover:text-black uppercase tracking-widest transition-colors flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Change Region
          </button>
        </div>
        <Stats score={gameState.score} timeScale={gameState.timeScale} onSpeedChange={(s) => { if(engineRef.current) engineRef.current.state.timeScale = s; setGameState({...gameState, timeScale: s}); }} />
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
              const water = isSegmentCrossingWater(dragStart, hit, currentCity);
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
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-white/90 backdrop-blur pointer-events-auto">
          <div className="text-center">
            <h2 className="text-6xl font-black uppercase tracking-tighter text-[#2F3436] mb-4">Service Terminated</h2>
            <p className="text-xl font-medium text-[#2F3436]/60 mb-12">System overload. Total score: {gameState.score}</p>
            <BaseButton size="lg" onClick={() => window.location.reload()}>Reboot System</BaseButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;