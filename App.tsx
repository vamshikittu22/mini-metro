import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Station, TransitLine, CITIES, City, Point } from './types';
import { THEME, GAME_CONFIG } from './constants';
import { project, snapToAngle, getDistance, isSegmentCrossingWater, WORLD_SIZE, distToSegment, getBentPath } from './services/geometry';
import { GameEngine } from './services/gameEngine';
import { GoogleGenAI } from '@google/genai';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentCity, setCurrentCity] = useState<City>(CITIES[0]);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 0.8 });
  const [highScore, setHighScore] = useState(0);
  
  const [gameState, setGameState] = useState<GameState>({
    cityId: CITIES[0].id,
    stations: [],
    lines: [],
    score: 0,
    level: 1,
    gameActive: true,
    timeScale: 1,
    daysElapsed: 0,
    nextRewardIn: 60000 * 7,
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
  const [groundingLinks, setGroundingLinks] = useState<{title?: string, uri: string}[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [aiMode, setAiMode] = useState<'strategy' | 'local'>('strategy');

  const requestDeepStrategy = async () => {
    if (!engineRef.current) return;
    setAiMode('strategy');
    setGroundingLinks([]);
    setShowAI(true);
    setIsThinking(true);
    setAiResponse("");

    try {
      if (typeof (window as any).aistudio !== 'undefined') {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) await (window as any).aistudio.openSelectKey();
      }
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentMap = {
        city: currentCity.name,
        stations: engineRef.current.state.stations.map(s => ({ name: s.name, type: s.type, passengers: s.waitingPassengers.length })),
        lines: engineRef.current.state.lines.map(l => ({ color: l.color, stationCount: l.stations.length, trains: l.trains.length })),
        score: engineRef.current.state.score,
        resources: engineRef.current.state.resources,
        week: engineRef.current.state.level
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Act as a world-class transit system architect. Analyze this Mini Metro game state (Week ${currentMap.week}) and provide a technical strategic recommendation to optimize passenger flow and reduce overcrowding. Focus on topological efficiency. Data: ${JSON.stringify(currentMap)}`,
        config: { 
          thinkingConfig: { thinkingBudget: 32768 } 
        }
      });
      setAiResponse(response.text || "Optimize transfer hubs to reduce passenger congestion.");
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        setAiResponse("API Key required. Please select a valid paid project API key.");
        if (typeof (window as any).aistudio !== 'undefined') await (window as any).aistudio.openSelectKey();
      } else {
        setAiResponse("Strategy analysis interrupted. Please check network connection.");
      }
    } finally {
      setIsThinking(false);
    }
  };

  const requestLocalAdvice = async () => {
    if (!engineRef.current) return;
    setAiMode('local');
    setGroundingLinks([]);
    setShowAI(true);
    setIsThinking(true);
    setAiResponse("");

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on geography for ${currentCity.name}, what are common real-world commuting challenges or interesting transit history facts? Provide a brief tip in 2 sentences.`,
        config: { tools: [{ googleMaps: {} }] }
      });
      setAiResponse(response.text || "Historical districts require careful tunneling planning.");
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const links = chunks.map((chunk: any) => {
        if (chunk.maps) return { title: chunk.maps.title, uri: chunk.maps.uri };
        if (chunk.web) return { title: chunk.web.title, uri: chunk.web.uri };
        return null;
      }).filter(Boolean) as {title?: string, uri: string}[];
      setGroundingLinks(links);
    } catch (err) {
      setAiResponse("Local data unavailable at this moment.");
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
      cityId: city.id, stations: initialStations, lines: [], score: 0, level: 1, gameActive: true, timeScale: 1, daysElapsed: 0, nextRewardIn: 60000 * 7,
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
    const initialScale = Math.min(1.2, (window.innerWidth * 0.4) / (maxX - minX || 1));
    setCamera({ x: window.innerWidth / 2 - avgX * initialScale, y: window.innerHeight / 2 - avgY * initialScale, scale: initialScale });
    setSelectedStationId(null);
  };

  useEffect(() => {
    initGame(currentCity);
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentCity]);

  useEffect(() => {
    let pTimeout: any;
    const loop = () => {
      if (engineRef.current && engineRef.current.state.gameActive) { 
        engineRef.current.spawnPassenger(); 
        pTimeout = setTimeout(loop, engineRef.current.getDynamicSpawnRate()); 
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
  }, [dimensions, camera, isDragging, isPanning, dragStart, dragCurrent, activeLineIdx, currentCity, inspectMode, selectedStationId]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !engineRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { stations, lines } = engineRef.current.state;
    const uiScale = Math.pow(1 / camera.scale, 0.65); 

    ctx.fillStyle = THEME.background;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    // Water
    ctx.fillStyle = '#E3E9F0';
    currentCity.water.forEach(poly => {
      ctx.beginPath();
      poly.forEach((p, i) => { const pos = project(p.lat, p.lon, currentCity); if (i === 0) ctx.moveTo(pos.x, pos.y); else ctx.lineTo(pos.x, pos.y); });
      ctx.closePath(); ctx.fill();
    });

    // Lines
    lines.forEach(line => {
      if (line.stations.length < 2) return;
      line.stations.forEach((sid, idx) => {
        if (idx === 0) return;
        const s1 = stations.find(s => s.id === line.stations[idx-1]), s2 = stations.find(s => s.id === sid);
        if (s1 && s2) {
          const path = getBentPath(s1, s2);
          ctx.beginPath(); ctx.strokeStyle = line.color; ctx.lineWidth = THEME.lineWidth; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.moveTo(s1.x, s1.y); path.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
          if (isSegmentCrossingWater(s1, s2, currentCity)) {
            ctx.save(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = THEME.lineWidth / 3; ctx.setLineDash([8, 12]);
            ctx.beginPath(); ctx.moveTo(s1.x, s1.y); path.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke(); ctx.restore();
          }
        }
      });

      // Trains
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
          ctx.fillStyle = THEME.text; ctx.fillRect(-THEME.trainWidth/2, -THEME.trainHeight/2, THEME.trainWidth, THEME.trainHeight);
          const pSize = 5, spacing = 7.5, startX = -((GAME_CONFIG.trainCapacity - 1) * spacing) / 2;
          for (let i = 0; i < GAME_CONFIG.trainCapacity; i++) {
            const px = startX + (i * spacing), py = 0;
            if (i < train.passengers.length) {
              const p = train.passengers[i]; ctx.fillStyle = '#FFF'; ctx.globalAlpha = 1;
              if (p.targetType === 'circle') { ctx.beginPath(); ctx.arc(px, py, pSize, 0, Math.PI*2); ctx.fill(); }
              else if (p.targetType === 'square') ctx.fillRect(px-pSize, py-pSize, pSize*2, pSize*2);
              else if (p.targetType === 'triangle') { ctx.beginPath(); ctx.moveTo(px, py-pSize); ctx.lineTo(px-pSize, py+pSize); ctx.lineTo(px+pSize, py+pSize); ctx.fill(); }
              else if (p.targetType === 'pentagon') { ctx.beginPath(); for(let j=0; j<5; j++) { const a = (j*2*Math.PI/5) - Math.PI/2; ctx.lineTo(px+Math.cos(a)*pSize, py+Math.sin(a)*pSize); } ctx.fill(); }
              else if (p.targetType === 'star') { ctx.beginPath(); for(let j=0; j<10; j++) { const a = (j*Math.PI/5) - Math.PI/2, r = j%2===0?pSize:pSize/2; ctx.lineTo(px+Math.cos(a)*r, py+Math.sin(a)*r); } ctx.fill(); }
            } else { ctx.fillStyle='#FFF'; ctx.globalAlpha=0.15; ctx.beginPath(); ctx.arc(px, py, 1.2, 0, Math.PI*2); ctx.fill(); }
          }
          ctx.globalAlpha=1; ctx.restore();
        }
      });
    });

    // Ghost line during drag
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
      const isInter = lines.filter(l => l.stations.includes(s.id)).length > 1, isSel = selectedStationId === s.id;
      ctx.strokeStyle = isSel ? '#00A8FF' : THEME.stationStroke; ctx.fillStyle = THEME.stationFill; ctx.lineWidth = (isSel ? 4 : 2.5) * uiScale;
      if (isInter) { ctx.beginPath(); const rw=36*uiScale, rh=28*uiScale; if(ctx.roundRect) ctx.roundRect(s.x-rw/2, s.y-rh/2, rw, rh, 8*uiScale); else ctx.rect(s.x-rw/2, s.y-rh/2, rw, rh); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); const size = THEME.stationSize * uiScale;
      if (s.type === 'circle') ctx.arc(s.x, s.y, size, 0, Math.PI*2);
      else if (s.type === 'square') ctx.rect(s.x-size, s.y-size, size*2, size*2);
      else if (s.type === 'triangle') { ctx.moveTo(s.x, s.y-size); ctx.lineTo(s.x-size, s.y+size); ctx.lineTo(s.x+size, s.y+size); ctx.closePath(); }
      else if (s.type === 'pentagon') { for(let i=0; i<5; i++) { const a = (i*2*Math.PI/5) - Math.PI/2; ctx.lineTo(s.x+Math.cos(a)*size, s.y+Math.sin(a)*size); } ctx.closePath(); }
      else if (s.type === 'star') { for(let i=0; i<10; i++) { const a = (i*Math.PI/5) - Math.PI/2, r = i%2===0?size:size/2; ctx.lineTo(s.x+Math.cos(a)*r, s.y+Math.sin(a)*r); } ctx.closePath(); }
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = THEME.text; ctx.font = `600 ${12*uiScale}px Inter`; ctx.textAlign='center'; ctx.fillText(s.name.toUpperCase(), s.x, s.y+size+12*uiScale+6);
      s.waitingPassengers.forEach((p, i) => {
        const pS = 4*uiScale, ox = (size+8*uiScale)+(Math.floor(i/4)*pS*2.5), px=s.x+ox+(i%4)*pS*1.8, py=s.y-(size-3*uiScale);
        ctx.fillStyle = THEME.text;
        if (p.targetType==='circle'){ ctx.beginPath(); ctx.arc(px,py,pS,0,Math.PI*2); ctx.fill(); }
        else if (p.targetType==='square') ctx.fillRect(px-pS, py-pS, pS*2, pS*2);
        else if (p.targetType==='triangle'){ ctx.beginPath(); ctx.moveTo(px,py-pS); ctx.lineTo(px-pS,py+pS); ctx.lineTo(px+pS,py+pS); ctx.fill(); }
        else if (p.targetType==='pentagon'){ ctx.beginPath(); for(let j=0;j<5;j++){ const a=(j*2*Math.PI/5)-Math.PI/2; ctx.lineTo(px+Math.cos(a)*pS,py+Math.sin(a)*pS); } ctx.fill(); }
        else if (p.targetType==='star'){ ctx.beginPath(); for(let j=0;j<10;j++){ const a=(j*Math.PI/5)-Math.PI/2, r=j%2===0?pS:pS/2; ctx.lineTo(px+Math.cos(a)*r,py+Math.sin(a)*r); } ctx.fill(); }
      });
      if (s.timer > 0) { ctx.strokeStyle='#FF4444'; ctx.lineWidth=4*uiScale; ctx.beginPath(); ctx.arc(s.x,s.y,size+8*uiScale, -Math.PI/2, -Math.PI/2+Math.PI*2*s.timer); ctx.stroke(); }
    });
    ctx.restore();
  }, [dimensions, gameState, camera, currentCity, selectedStationId, isDragging, dragStart, dragCurrent, activeLineIdx]);

  const setSpeed = (speed: number) => {
    if (engineRef.current) {
      engineRef.current.state.timeScale = speed;
      setGameState({ ...engineRef.current.state });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!engineRef.current || !gameState.gameActive) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    
    // Find if user clicked on any line segment, checking the bent path segments
    let closestLineId: number | null = null;
    let closestSegIdx: number | null = null;
    let minDistance = 25 / camera.scale;

    gameState.lines.forEach(line => {
      for (let i = 0; i < line.stations.length - 1; i++) {
        const s1 = gameState.stations.find(s => s.id === line.stations[i]);
        const s2 = gameState.stations.find(s => s.id === line.stations[i+1]);
        if (s1 && s2) {
          const fullPath = [s1, ...getBentPath(s1, s2)];
          for (let j = 0; j < fullPath.length - 1; j++) {
            const d = distToSegment(world, fullPath[j], fullPath[j+1]);
            if (d < minDistance) {
              minDistance = d;
              closestLineId = line.id;
              closestSegIdx = i;
            }
          }
        }
      }
    });

    if (closestLineId !== null && closestSegIdx !== null) {
      // Correct behavior: remove segment/truncate rather than delete entire line
      engineRef.current.removeSegment(closestLineId, closestSegIdx, closestSegIdx + 1);
      setGameState({ ...engineRef.current.state });
    }
  };

  const handleRemoveActiveLine = () => {
    if (!engineRef.current || !gameState.gameActive) return;
    const line = gameState.lines.find(l => l.id === activeLineIdx);
    if (line) {
      engineRef.current.removeLine(activeLineIdx);
      setGameState({ ...engineRef.current.state });
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#F8F4EE] select-none overflow-hidden font-sans">
      {/* AI Intelligence Panel */}
      {showAI && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/5 backdrop-blur-sm pointer-events-auto">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl p-12 relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <button onClick={() => setShowAI(false)} className="absolute top-8 right-8 text-[#2F3436]/40 hover:text-[#2F3436] transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div className="flex items-center gap-4 mb-8">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${aiMode === 'strategy' ? 'bg-[#2F3436] text-white' : 'bg-[#00A8FF] text-white'}`}>
                {aiMode === 'strategy' ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-3.5A4 4 0 0 1 12 5z"/><circle cx="12" cy="12" r="3"/></svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                )}
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-[#2F3436]">
                  {aiMode === 'strategy' ? 'Topological Intelligence' : 'Geospatial Context'}
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#2F3436]/40">Powered by Gemini {aiMode === 'strategy' ? '3 Pro' : '2.5 Flash'}</p>
              </div>
            </div>

            <div className="min-h-[160px] flex flex-col justify-center">
              {isThinking ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full border-4 border-[#2F3436]/5 border-t-[#2F3436] animate-spin"></div>
                  <p className="text-sm font-bold text-[#2F3436]/60 animate-pulse">
                    {aiMode === 'strategy' ? 'Analyzing network topology...' : 'Retrieving regional metadata...'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-lg font-medium text-[#2F3436] leading-relaxed italic">"{aiResponse}"</p>
                  {groundingLinks.length > 0 && (
                    <div className="pt-4 border-t border-black/5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-[#2F3436]/30 mb-3">Grounding References</p>
                      <div className="flex flex-wrap gap-2">
                        {groundingLinks.map((link, i) => (
                          <a key={i} href={link.uri} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[#F8F4EE] rounded-full text-[10px] font-black uppercase hover:bg-black hover:text-white transition-all shadow-sm">
                            {link.title || 'View Source'}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main HUD */}
      <div className="absolute top-0 left-0 w-full p-8 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex flex-col gap-4 pointer-events-auto">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black tracking-tighter text-[#2F3436]">{currentCity.name.toUpperCase()}</h1>
              <div className="bg-[#2F3436] text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-lg">WEEK {gameState.level}</div>
            </div>
            <p className="text-[10px] font-bold text-[#2F3436]/40 uppercase tracking-[0.4em] mt-1">{DAYS[Math.floor(gameState.daysElapsed % 7)]}</p>
          </div>
          <div className="flex gap-2 bg-white/60 backdrop-blur p-1 rounded-full border border-black/5 self-start shadow-sm">
            {CITIES.map(c => <button key={c.id} onClick={() => setCurrentCity(c)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${currentCity.id===c.id?'bg-[#2F3436] text-white':'text-[#2F3436]/40 hover:text-[#2F3436]'}`}>{c.name}</button>)}
          </div>
          <button onClick={() => { setInspectMode(!inspectMode); setSelectedStationId(null); }} className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all self-start shadow-sm pointer-events-auto ${inspectMode?'bg-blue-500 text-white shadow-blue-200':'bg-white/60 text-[#2F3436]/40 border border-black/5'}`}>{inspectMode?'Inspection: ON':'Inspection: OFF'}</button>
        </div>
        
        <div className="flex flex-col items-end gap-4 pointer-events-auto">
          <div className="flex items-center gap-8">
            <div className="flex gap-1 bg-white/60 backdrop-blur p-1.5 rounded-full border border-black/5 shadow-sm">
              {[0, 1, 2, 4].map(s => (
                <button 
                  key={s}
                  onClick={() => setSpeed(s)} 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${gameState.timeScale === s ? 'bg-[#2F3436] text-white shadow-lg' : 'text-[#2F3436]/30 hover:text-[#2F3436]'}`}
                >
                  {s === 0 ? <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> : `${s}x`}
                </button>
              ))}
            </div>

            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.4em] text-[#2F3436]/40 font-black">Commuters</p>
              <p className="text-5xl font-light tabular-nums text-[#2F3436] tracking-tighter">{gameState.score}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 max-w-[200px] bg-white/60 backdrop-blur p-2 rounded-3xl border border-black/5 shadow-sm justify-end">
            {THEME.lineColors.map((color, idx) => <button key={idx} onClick={() => setActiveLineIdx(idx)} className={`w-6 h-6 rounded-full border-2 transition-all ${activeLineIdx===idx?'scale-110 shadow-md border-[#2F3436]':'opacity-30 border-transparent hover:opacity-60'}`} style={{ backgroundColor: color }} />)}
          </div>
        </div>
      </div>

      <div className="absolute top-48 right-8 z-20 flex flex-col gap-3 pointer-events-auto">
        <button onClick={requestDeepStrategy} title="Deep Strategic Thinking" className="bg-[#2F3436] text-white p-3 rounded-full shadow-xl hover:scale-110 transition-all border border-white/20"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-3.5A4 4 0 0 1 12 5z"/><circle cx="12" cy="12" r="3"/></svg></button>
        <button onClick={requestLocalAdvice} title="Local Contextual Intelligence" className="bg-[#00A8FF] text-white p-3 rounded-full shadow-xl hover:scale-110 transition-all border border-white/20"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></button>
      </div>

      <canvas 
        ref={canvasRef} 
        width={dimensions.width} 
        height={dimensions.height} 
        onContextMenu={handleContextMenu}
        onMouseDown={e => {
          if (!gameState.gameActive) return;
          const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
          const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
          const hit = gameState.stations.find(s => getDistance(s, world) < 30 / camera.scale);
          if (inspectMode) { setSelectedStationId(hit?.id || null); return; }
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
            const hit = gameState.stations.find(s => getDistance(s, screenToWorld(e.clientX - rect.left, e.clientY - rect.top)) < 30 / camera.scale);
            if (hit && hit.id !== dragStart.id) {
              const water = isSegmentCrossingWater(dragStart, hit, currentCity);
              if (!water || engineRef.current.state.resources.tunnels > 0) {
                let line = engineRef.current.state.lines.find(l => l.id === activeLineIdx);
                if (!line && engineRef.current.state.resources.lines > 0) {
                  line = { id: activeLineIdx, color: THEME.lineColors[activeLineIdx], stations: [dragStart.id, hit.id], trains: [{ id: Date.now(), lineId: activeLineIdx, nextStationIndex: 1, progress: 0, direction: 1, passengers: [], capacity: GAME_CONFIG.trainCapacity }] };
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
      />
      
      <div className="absolute bottom-8 right-8 z-10 bg-white/70 backdrop-blur-xl border border-black/5 p-6 rounded-[2.5rem] shadow-xl min-w-[240px] pointer-events-auto">
        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#2F3436]/30 mb-5">Resources</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col"><span className="text-[9px] text-black/30 font-black uppercase">Lines</span><span className="text-2xl font-black text-[#2F3436]">{gameState.resources.lines}</span></div>
          <div className="flex flex-col"><span className="text-[9px] text-black/30 font-black uppercase">Tunnels</span><span className="text-2xl font-black text-[#2F3436]">{gameState.resources.tunnels}</span></div>
          <div className="flex flex-col"><span className="text-[9px] text-black/30 font-black uppercase">Trains</span><span className="text-2xl font-black text-[#2F3436]">{gameState.resources.trains}</span></div>
          <div className="flex flex-col">
            <span className="text-[9px] text-black/30 font-black uppercase">Active Color</span>
            <div className="w-5 h-5 rounded-full mt-1 border border-black/10" style={{ backgroundColor: THEME.lineColors[activeLineIdx] }} />
          </div>
        </div>
        
        <div className="flex flex-col gap-2 mt-6">
          <button 
            onClick={() => engineRef.current?.addTrainToLine(activeLineIdx)} 
            className="w-full py-3 rounded-2xl bg-[#2F3436] text-white text-[9px] font-black uppercase tracking-widest disabled:opacity-10 transition-all hover:bg-black"
          >
            + Add Train
          </button>
          
          {gameState.lines.some(l => l.id === activeLineIdx) && (
            <button 
              onClick={handleRemoveActiveLine}
              className="w-full py-3 rounded-2xl bg-red-500/10 text-red-600 text-[9px] font-black uppercase tracking-widest transition-all hover:bg-red-500 hover:text-white border border-red-500/20"
            >
              Delete Active Line
            </button>
          )}
        </div>
      </div>

      {!gameState.gameActive && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-white/90 backdrop-blur pointer-events-auto">
          <div className="text-center">
            <h2 className="text-6xl font-black uppercase tracking-tighter text-[#2F3436] mb-4">Service Halted</h2>
            <p className="text-xl font-medium text-[#2F3436]/60 mb-12">System collapsed due to overcrowding.</p>
            <button onClick={() => window.location.reload()} className="px-12 py-4 bg-[#2F3436] text-white rounded-full text-sm font-black uppercase tracking-widest hover:scale-105 transition-transform">Restart System</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
