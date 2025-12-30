
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, CITY_DATA, Station, TransitLine, CITIES, City, Point } from './types';
import { THEME, GAME_CONFIG } from './constants';
import { project, snapToAngle, getDistance, isSegmentCrossingWater, WORLD_SIZE, distToSegment, getBentPath } from './services/geometry';
import { GameEngine } from './services/gameEngine';
import { GoogleGenAI } from '@google/genai';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentCity, setCurrentCity] = useState<City>(CITIES[0]);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 0.8 });
  
  const [gameState, setGameState] = useState<GameState>({
    cityId: CITIES[0].id,
    stations: [],
    lines: [],
    score: 0,
    gameActive: true,
    timeScale: 1,
    daysElapsed: 0,
    nextRewardIn: 60000,
    resources: { lines: 5, trains: 3, tunnels: 3 }
  });

  const engineRef = useRef<GameEngine | null>(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState<Station | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Point | null>(null);
  const [activeLineIdx, setActiveLineIdx] = useState(0);

  const [inspectMode, setInspectMode] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);

  const screenToWorld = (sx: number, sy: number) => ({
    x: (sx - camera.x) / camera.scale,
    y: (sy - camera.y) / camera.scale
  });

  const [showAI, setShowAI] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [aiMode, setAiMode] = useState<'strategy' | 'local'>('strategy');

  const requestDeepStrategy = async () => {
    if (!engineRef.current) return;
    setAiMode('strategy');
    try {
      if (typeof (window as any).aistudio !== 'undefined') {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) await (window as any).aistudio.openSelectKey();
      }
      setIsThinking(true);
      setShowAI(true);
      setAiResponse("Performing deep topological analysis...");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const currentMap = {
        city: currentCity.name,
        stations: engineRef.current.state.stations.map(s => ({ name: s.name, type: s.type, passengers: s.waitingPassengers.length })),
        lines: engineRef.current.state.lines.map(l => ({ color: l.color, stationCount: l.stations.length, trains: l.trains.length })),
        score: engineRef.current.state.score,
        resources: engineRef.current.state.resources
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Act as a world-class transit system architect. Analyze this Mini Metro game state and provide a highly detailed, strategic 2-sentence optimization plan. Be technical about bottleneck management and line topology: ${JSON.stringify(currentMap)}`,
        config: { thinkingConfig: { thinkingBudget: 32768 } }
      });
      setAiResponse(response.text || "Ensure your central transfer hubs have at least 3 distinct line connections to distribute load.");
    } catch (err) {
      setAiResponse("Strategy link interrupted. Focus on loop efficiency.");
    } finally {
      setIsThinking(false);
    }
  };

  const requestLocalAdvice = async () => {
    if (!engineRef.current) return;
    setAiMode('local');
    try {
      if (typeof (window as any).aistudio !== 'undefined') {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) await (window as any).aistudio.openSelectKey();
      }
      setIsThinking(true);
      setShowAI(true);
      setAiResponse("Consulting municipal records...");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on real-world geographical data for ${currentCity.name}, what are the major transit challenges or historical bottleneck areas commuters face in this city? Provide a helpful 2-sentence tip for a transit planner.`,
        config: { 
          tools: [{ googleMaps: {} }] 
        }
      });
      setAiResponse(response.text || "The central districts are prone to heavy congestion; prioritize relief lines bypassing the historic core.");
    } catch (err) {
      setAiResponse("Local records unavailable. Watch the river crossings.");
    } finally {
      setIsThinking(false);
    }
  };

  const initGame = (city: City) => {
    const initialStations: Station[] = city.initialStations.map(s => {
      const pos = project(s.lat, s.lon, city);
      return { ...pos, id: s.id, type: s.type, name: s.name, waitingPassengers: [], timer: 0 };
    });
    
    const engine = new GameEngine({
      cityId: city.id,
      stations: initialStations,
      lines: [],
      score: 0,
      gameActive: true,
      timeScale: 1,
      daysElapsed: 0,
      nextRewardIn: 60000,
      resources: { lines: 5, trains: 3, tunnels: 3 }
    });
    
    engineRef.current = engine;
    setGameState({ ...engine.state });

    const minX = Math.min(...initialStations.map(s => s.x));
    const maxX = Math.max(...initialStations.map(s => s.x));
    const minY = Math.min(...initialStations.map(s => s.y));
    const maxY = Math.max(...initialStations.map(s => s.y));
    
    const avgX = (minX + maxX) / 2;
    const avgY = (minY + maxY) / 2;
    const spanX = maxX - minX;
    const spanY = maxY - minY;
    
    const margin = 0.4;
    const scaleX = (window.innerWidth * margin) / (spanX || 1);
    const scaleY = (window.innerHeight * margin) / (spanY || 1);
    const initialScale = Math.min(1.2, Math.min(scaleX, scaleY));
    
    setCamera({ 
      x: window.innerWidth / 2 - avgX * initialScale, 
      y: window.innerHeight / 2 - avgY * initialScale,
      scale: initialScale
    });

    setSelectedStationId(null);
  };

  useEffect(() => {
    initGame(currentCity);
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentCity]);

  useEffect(() => {
    const pInt = setInterval(() => engineRef.current?.spawnPassenger(), GAME_CONFIG.spawnRate);
    const sInt = setInterval(() => engineRef.current?.spawnStation(window.innerWidth, window.innerHeight, project), GAME_CONFIG.stationSpawnRate);
    return () => { clearInterval(pInt); clearInterval(sInt); };
  }, [currentCity]);

  const onWheel = (e: React.WheelEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const zoomSpeed = 0.001;
    const delta = -e.deltaY * zoomSpeed;
    const newScale = Math.min(THEME.maxZoom, Math.max(THEME.minZoom, camera.scale + delta));
    const worldMouseX = (mouseX - camera.x) / camera.scale;
    const worldMouseY = (mouseY - camera.y) / camera.scale;

    setCamera({
      x: mouseX - worldMouseX * newScale,
      y: mouseY - worldMouseY * newScale,
      scale: newScale
    });
  };

  useEffect(() => {
    let frameId: number;
    const loop = (time: number) => {
      if (engineRef.current) {
        engineRef.current.update(time);
        setGameState({ ...engineRef.current.state });
        draw();
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [dimensions, camera, isDragging, isPanning, dragStart, dragCurrent, activeLineIdx, currentCity, inspectMode, selectedStationId]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !engineRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const { stations, lines } = engineRef.current.state;

    const uiScaleFactor = Math.pow(1 / camera.scale, 0.65); 
    const scaledStationSize = THEME.stationSize * uiScaleFactor;

    ctx.fillStyle = THEME.background;
    ctx.fillRect(0, 0, width, height);

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

    // Lines with Snapping
    lines.forEach(line => {
      if (line.stations.length < 2) return;
      line.stations.forEach((sid, idx) => {
        if (idx === 0) return;
        const sPrev = stations.find(st => st.id === line.stations[idx - 1]);
        const sCurr = stations.find(st => st.id === sid);
        if (sPrev && sCurr) {
          const path = getBentPath(sPrev, sCurr);
          ctx.beginPath();
          ctx.strokeStyle = line.color;
          ctx.lineWidth = THEME.lineWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.moveTo(sPrev.x, sPrev.y);
          path.forEach(p => ctx.lineTo(p.x, p.y));
          ctx.stroke();

          // Tunnels
          if (isSegmentCrossingWater(sPrev, sCurr, currentCity)) {
            ctx.save();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = THEME.lineWidth / 3;
            ctx.setLineDash([8, 12]);
            ctx.beginPath();
            ctx.moveTo(sPrev.x, sPrev.y);
            path.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
            ctx.restore();
          }
        }
      });

      // Trains on Snapped Paths
      line.trains.forEach(train => {
        const safeIdx = Math.max(0, Math.min(train.nextStationIndex, line.stations.length - 1));
        const fromIdx = train.direction === 1 ? safeIdx - 1 : safeIdx + 1;
        const safeFromIdx = Math.max(0, Math.min(fromIdx, line.stations.length - 1));
        const fromS = stations.find(s => s.id === line.stations[safeFromIdx]);
        const toS = stations.find(s => s.id === line.stations[safeIdx]);

        if (fromS && toS) {
          const pathPoints = [fromS, ...getBentPath(fromS, toS)];
          const totalLength = pathPoints.reduce((acc, p, i) => i === 0 ? 0 : acc + getDistance(pathPoints[i-1], p), 0);
          let targetDist = train.progress * totalLength;
          let currentDist = 0;
          let tx = fromS.x, ty = fromS.y, angle = 0;

          for (let i = 1; i < pathPoints.length; i++) {
            const p1 = pathPoints[i-1];
            const p2 = pathPoints[i];
            const segLen = getDistance(p1, p2);
            if (currentDist + segLen >= targetDist) {
              const segProgress = (targetDist - currentDist) / segLen;
              tx = p1.x + (p2.x - p1.x) * segProgress;
              ty = p1.y + (p2.y - p1.y) * segProgress;
              angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
              break;
            }
            currentDist += segLen;
          }

          ctx.save();
          ctx.translate(tx, ty);
          ctx.rotate(angle);
          ctx.fillStyle = THEME.text;
          ctx.fillRect(-THEME.trainWidth / 2, -THEME.trainHeight / 2, THEME.trainWidth, THEME.trainHeight);
          ctx.fillStyle = '#FFF';
          for (let i = 0; i < train.capacity; i++) {
            const px = -THEME.trainWidth/2 + 2.5 + (i * 2.8);
            ctx.globalAlpha = i < train.passengers.length ? 1 : 0.2;
            ctx.fillRect(px, -2, 2, 4);
          }
          ctx.restore();
        }
      });
    });

    // Ghost Line Snapping
    if (isDragging && dragStart && dragCurrent) {
      ctx.strokeStyle = THEME.lineColors[activeLineIdx];
      ctx.lineWidth = THEME.lineWidth;
      ctx.beginPath(); ctx.setLineDash([10, 5]);
      
      const path = getBentPath(dragStart, dragCurrent);
      ctx.moveTo(dragStart.x, dragStart.y);
      path.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke(); ctx.setLineDash([]);
    }

    // Stations
    stations.forEach(s => {
      const activeLines = lines.filter(l => l.stations.includes(s.id));
      const isTransfer = activeLines.length > 1;
      const isSelected = selectedStationId === s.id;

      ctx.strokeStyle = isSelected ? '#00A8FF' : THEME.stationStroke;
      ctx.fillStyle = THEME.stationFill;
      ctx.lineWidth = (isSelected ? 4 : 2.5) * uiScaleFactor;
      
      if (isTransfer) {
        ctx.beginPath();
        const rw = 36 * uiScaleFactor; const rh = 28 * uiScaleFactor;
        if (ctx.roundRect) ctx.roundRect(s.x - rw/2, s.y - rh/2, rw, rh, 8 * uiScaleFactor);
        else ctx.rect(s.x - rw/2, s.y - rh/2, rw, rh);
        ctx.fill(); ctx.stroke();
      }
      
      ctx.beginPath();
      const size = scaledStationSize;
      if (s.type === 'circle') ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
      else if (s.type === 'square') ctx.rect(s.x - size, s.y - size, size * 2, size * 2);
      else if (s.type === 'triangle') {
        ctx.moveTo(s.x, s.y - size); ctx.lineTo(s.x - size, s.y + size); ctx.lineTo(s.x + size, s.y + size); ctx.closePath();
      } else if (s.type === 'pentagon') {
        for (let i = 0; i < 5; i++) {
          const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          ctx.lineTo(s.x + Math.cos(a) * size, s.y + Math.sin(a) * size);
        }
        ctx.closePath();
      }
      ctx.fill(); ctx.stroke();
      
      ctx.fillStyle = THEME.text;
      const fontSize = 12 * uiScaleFactor;
      ctx.font = `600 ${fontSize}px Inter`;
      ctx.textAlign = 'center';
      ctx.fillText(s.name.toUpperCase(), s.x, s.y + size + fontSize + 6);
      
      s.waitingPassengers.forEach((p, idx) => {
        const pSize = 3.5 * uiScaleFactor;
        const ox = (size + 8 * uiScaleFactor) + (Math.floor(idx / 4) * (pSize * 2.5));
        const px = s.x + ox + (idx % 4) * (pSize * 1.8);
        const py = s.y - (size - 3 * uiScaleFactor);
        ctx.fillStyle = THEME.text;
        if (p.targetType === 'circle') { ctx.beginPath(); ctx.arc(px, py, pSize, 0, Math.PI*2); ctx.fill(); }
        else if (p.targetType === 'square') { ctx.fillRect(px-pSize, py-pSize, pSize*2, pSize*2); }
        else { ctx.beginPath(); ctx.moveTo(px, py-pSize); ctx.lineTo(px-pSize, py+pSize); ctx.lineTo(px+pSize, py+pSize); ctx.fill(); }
      });
      
      if (s.timer > 0) {
        ctx.strokeStyle = '#FF4444'; ctx.lineWidth = 4 * uiScaleFactor; ctx.beginPath();
        ctx.arc(s.x, s.y, size + (8 * uiScaleFactor), -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * s.timer)); ctx.stroke();
      }
    });

    ctx.restore();
  }, [dimensions, gameState, isDragging, isPanning, dragStart, dragCurrent, activeLineIdx, currentCity, camera, selectedStationId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!gameState.gameActive) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    if (e.button === 2) return;

    const hitStation = gameState.stations.find(s => getDistance(s, worldPos) < 30 / camera.scale);

    if (inspectMode) {
      if (hitStation) {
        setSelectedStationId(hitStation.id === selectedStationId ? null : hitStation.id);
      } else {
        setSelectedStationId(null);
      }
      return;
    }

    if (hitStation) { setDragStart(hitStation); setIsDragging(true); } 
    else { setIsPanning(true); setDragCurrent({ x: e.clientX, y: e.clientY }); }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!gameState.gameActive || !engineRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const hitStation = gameState.stations.find(s => getDistance(s, worldPos) < 30 / camera.scale);
    if (hitStation) { engineRef.current.removeStationFromLine(activeLineIdx, hitStation.id); return; }
    const line = engineRef.current.state.lines.find(l => l.id === activeLineIdx);
    if (line) {
      for (let i = 0; i < line.stations.length - 1; i++) {
        const s1 = engineRef.current.state.stations.find(s => s.id === line.stations[i]);
        const s2 = engineRef.current.state.stations.find(s => s.id === line.stations[i+1]);
        if (s1 && s2 && distToSegment(worldPos, s1, s2) < 20 / camera.scale) {
          engineRef.current.removeSegment(activeLineIdx, i, i + 1); return;
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (isPanning && dragCurrent) {
      const dx = e.clientX - dragCurrent.x; const dy = e.clientY - dragCurrent.y;
      setCamera(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setDragCurrent({ x: e.clientX, y: e.clientY });
    } else if (isDragging) {
      setDragCurrent(screenToWorld(e.clientX - rect.left, e.clientY - rect.top));
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) { setIsPanning(false); setDragCurrent(null); return; }
    if (!isDragging || !dragStart || !engineRef.current) { setIsDragging(false); return; }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const hitStation = gameState.stations.find(s => getDistance(s, worldPos) < 30 / camera.scale);
    
    if (hitStation) {
      const crossesWater = isSegmentCrossingWater(dragStart, hitStation, currentCity);
      if (crossesWater && engineRef.current.state.resources.tunnels <= 0) { setIsDragging(false); return; }
      
      let line = engineRef.current.state.lines.find(l => l.id === activeLineIdx);
      if (!line) {
        if (engineRef.current.state.resources.lines > 0) {
          line = { id: activeLineIdx, color: THEME.lineColors[activeLineIdx], stations: [dragStart.id, hitStation.id], trains: [{ id: Date.now(), lineId: activeLineIdx, nextStationIndex: 1, progress: 0, direction: 1, passengers: [], capacity: GAME_CONFIG.trainCapacity }] };
          engineRef.current.state.lines.push(line);
          engineRef.current.state.resources.lines--;
          if (crossesWater) engineRef.current.state.resources.tunnels--;
        }
      } else {
        const atStart = line.stations[0] === dragStart.id;
        const atEnd = line.stations[line.stations.length - 1] === dragStart.id;
        if (atStart || atEnd) {
          if (atStart) {
            line.stations.unshift(hitStation.id);
            line.trains.forEach(t => { t.nextStationIndex++; });
          } else {
            line.stations.push(hitStation.id);
          }
          if (crossesWater) engineRef.current.state.resources.tunnels--;
        }
      }
    }
    setIsDragging(false); setDragStart(null); setDragCurrent(null);
  };

  const selectedStation = selectedStationId ? gameState.stations.find(s => s.id === selectedStationId) : null;

  return (
    <div className="relative w-screen h-screen bg-[#F8F4EE] select-none overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex flex-col gap-4 pointer-events-auto">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-[#2F3436]">{currentCity.name.toUpperCase()}</h1>
            <p className="text-[10px] font-bold text-[#2F3436]/40 uppercase tracking-[0.4em]">Day {Math.floor(gameState.daysElapsed) + 1}</p>
          </div>
          <div className="flex gap-2 bg-white/60 backdrop-blur p-1 rounded-full border border-black/5 self-start shadow-sm">
            {CITIES.map(c => (
              <button key={c.id} onClick={() => setCurrentCity(c)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${currentCity.id === c.id ? 'bg-[#2F3436] text-white' : 'text-[#2F3436]/40 hover:text-[#2F3436]'}`}>
                {c.name}
              </button>
            ))}
          </div>
          <button 
            onClick={() => { setInspectMode(!inspectMode); setSelectedStationId(null); }}
            className={`mt-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all self-start shadow-sm pointer-events-auto ${inspectMode ? 'bg-blue-500 text-white' : 'bg-white/60 text-[#2F3436]/40 border border-black/5 hover:text-[#2F3436]'}`}
          >
            {inspectMode ? 'Inspection: ON' : 'Inspection: OFF'}
          </button>
        </div>
        
        <div className="flex gap-8 items-center pointer-events-auto">
          <div className="flex gap-2 bg-white/60 backdrop-blur p-2 rounded-full border border-black/5 shadow-sm">
            <button onClick={() => engineRef.current && (engineRef.current.state.timeScale = 1)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${gameState.timeScale === 1 ? 'bg-[#2F3436] text-white' : 'text-[#2F3436]/40'}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <button onClick={() => engineRef.current && (engineRef.current.state.timeScale = 3)} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${gameState.timeScale === 3 ? 'bg-[#2F3436] text-white' : 'text-[#2F3436]/40'}`}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4l9 8-9 8V4zm9 0l9 8-9 8V4z"/></svg>
            </button>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#2F3436]/40 font-black">Commuters</p>
            <p className="text-5xl font-light tabular-nums text-[#2F3436] tracking-tighter">{gameState.score}</p>
          </div>
          <div className="flex gap-2 bg-white/60 backdrop-blur p-2 rounded-full border border-black/5 shadow-sm">
            {THEME.lineColors.map((color, idx) => (
              <button key={idx} onClick={() => setActiveLineIdx(idx)} className={`w-8 h-8 rounded-full border-2 transition-all ${activeLineIdx === idx ? 'scale-110 shadow border-[#2F3436]' : 'opacity-20 border-transparent'}`} style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
      </div>

      <div className="absolute top-48 right-8 z-20 flex flex-col gap-3 pointer-events-auto">
        <button onClick={requestDeepStrategy} className="bg-[#2F3436] text-white p-3 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-3.5A4 4 0 0 1 12 5z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button onClick={requestLocalAdvice} className="bg-[#00A8FF] text-white p-3 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
        </button>
      </div>

      {showAI && (
        <div className={`absolute right-20 top-48 w-72 z-30 animate-in slide-in-from-right-4 duration-300`}>
          <div className={`bg-white/95 backdrop-blur-xl shadow-2xl p-6 rounded-[2rem] border relative ${aiMode === 'local' ? 'border-blue-100' : 'border-black/5'}`}>
             <button onClick={() => setShowAI(false)} className="absolute top-4 right-4 text-black/10 hover:text-black">×</button>
             <h4 className={`text-[9px] font-black uppercase tracking-[0.3em] mb-3 flex items-center gap-2 ${aiMode === 'local' ? 'text-blue-500' : 'text-black/30'}`}>
               <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${aiMode === 'local' ? 'bg-blue-500' : 'bg-green-500'}`}/>
               {aiMode === 'local' ? 'Local Advisor' : 'Strategic Analyst'}
             </h4>
             <p className={`text-sm leading-relaxed text-[#2F3436] font-medium ${isThinking ? 'animate-pulse' : ''}`}>{aiResponse}</p>
          </div>
        </div>
      )}

      {inspectMode && selectedStation && (
        <div className="absolute left-1/2 bottom-32 -translate-x-1/2 w-80 z-30 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white/95 backdrop-blur-xl shadow-2xl p-6 rounded-[2.5rem] border border-black/5 text-center">
            <h3 className="text-xl font-black text-[#2F3436] mb-1">{selectedStation.name}</h3>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#2F3436]/30 mb-4">{selectedStation.type} hub</p>
            
            <div className="flex flex-wrap justify-center gap-3 mb-4">
              {(() => {
                const counts: Record<string, number> = {};
                selectedStation.waitingPassengers.forEach(p => counts[p.targetType] = (counts[p.targetType] || 0) + 1);
                return Object.entries(counts).map(([type, count]) => (
                  <div key={type} className="flex flex-col items-center gap-1 bg-black/5 p-2 rounded-2xl min-w-[50px]">
                    <span className="text-lg font-black text-[#2F3436]">{count}</span>
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-30">{type}</span>
                  </div>
                ));
              })()}
              {selectedStation.waitingPassengers.length === 0 && (
                <p className="text-xs text-[#2F3436]/40 font-medium italic">Station clear of passengers</p>
              )}
            </div>
            
            <p className="text-[10px] text-[#2F3436]/60 font-bold uppercase tracking-widest">
              Total Waiting: {selectedStation.waitingPassengers.length}
            </p>
          </div>
        </div>
      )}

      <canvas 
        ref={canvasRef} 
        width={dimensions.width} 
        height={dimensions.height} 
        onMouseDown={handleMouseDown} 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onWheel={onWheel}
      />

      <div className="absolute bottom-8 right-8 flex flex-col gap-4 z-10 pointer-events-none">
        <div className="bg-white/70 backdrop-blur-xl border border-black/5 p-6 rounded-[2.5rem] shadow-xl min-w-[240px] pointer-events-auto">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#2F3436]/30 mb-5">System Resources</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col"><span className="text-[9px] text-black/30 font-black uppercase tracking-widest">Lines</span><span className="text-2xl font-black text-[#2F3436]">{gameState.resources.lines}</span></div>
            <div className="flex flex-col"><span className="text-[9px] text-black/30 font-black uppercase tracking-widest">Tunnels</span><span className="text-2xl font-black text-[#2F3436]">{gameState.resources.tunnels}</span></div>
            <div className="flex flex-col"><span className="text-[9px] text-black/30 font-black uppercase tracking-widest">Trains</span><span className="text-2xl font-black text-[#2F3436]">{gameState.resources.trains}</span></div>
            <div className="flex flex-col">
              <span className="text-[9px] text-black/30 font-black uppercase tracking-widest">Delivery</span>
              <div className="w-full h-1.5 bg-black/5 rounded-full mt-2 overflow-hidden"><div className="h-full bg-black/20 transition-all duration-300" style={{ width: `${(1 - gameState.nextRewardIn/60000) * 100}%` }} /></div>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-2">
            <div className="flex gap-2">
              <button disabled={gameState.resources.trains <= 0 || !gameState.lines.find(l => l.id === activeLineIdx)} onClick={() => engineRef.current?.addTrainToLine(activeLineIdx)} className="flex-1 py-3 rounded-2xl bg-[#2F3436] text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-10 hover:bg-black transition-all">+ Train</button>
              <button disabled={!gameState.lines.find(l => l.id === activeLineIdx) || gameState.lines.find(l => l.id === activeLineIdx)?.trains.length === 0} onClick={() => engineRef.current?.removeTrainFromLine(activeLineIdx)} className="flex-1 py-3 rounded-2xl border border-black/10 text-[#2F3436] text-[9px] font-black uppercase tracking-widest disabled:opacity-10 hover:bg-black/5 transition-all">- Train</button>
            </div>
            <button disabled={!gameState.lines.find(l => l.id === activeLineIdx)} onClick={() => engineRef.current?.removeLine(activeLineIdx)} className="w-full py-3 rounded-2xl border border-red-100 text-red-400 text-[9px] font-black uppercase tracking-widest hover:bg-red-50 transition-all disabled:opacity-10">Retire Line {activeLineIdx + 1}</button>
          </div>
        </div>
      </div>

      {!gameState.gameActive && (
        <div className="absolute inset-0 bg-[#F8F4EE]/90 backdrop-blur-xl flex items-center justify-center z-50">
          <div className="text-center p-20 bg-white rounded-[5rem] shadow-2xl border border-black/5 animate-in zoom-in-95 duration-500">
            <h2 className="text-7xl font-black tracking-tighter text-[#2F3436] mb-6">LINE FAILURE</h2>
            <p className="text-xl text-[#2F3436]/40 mb-14 font-medium max-w-sm mx-auto">Congestion in {currentCity.name} led to system-wide gridlock.</p>
            <div className="mb-14">
              <p className="text-[10px] uppercase tracking-[0.5em] font-black text-black/20 mb-3">Total Efficiency</p>
              <p className="text-9xl font-thin text-[#2F3436] tracking-tighter">{gameState.score}</p>
            </div>
            <button onClick={() => window.location.reload()} className="bg-[#2F3436] text-white px-24 py-7 rounded-full font-black uppercase tracking-[0.3em] text-xs hover:bg-black transition-all shadow-xl active:scale-95">Restart Network</button>
          </div>
        </div>
      )}
      
      <div className="absolute bottom-8 left-8 text-[#2F3436]/20 text-[9px] font-black uppercase tracking-[0.3em] max-w-xs pointer-events-none">
        Scroll to Zoom • Right-Click Station to Detach • System Online
      </div>
    </div>
  );
};

export default App;
