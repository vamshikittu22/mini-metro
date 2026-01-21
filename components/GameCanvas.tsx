
import React from 'react';
import { GameEngine } from '../services/gameEngine';
import { City, Station, Point } from '../types';
import { getDistance, distToSegment } from '../services/geometry';

interface GameCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  width: number;
  height: number;
  camera: { x: number; y: number; scale: number };
  setCamera: React.Dispatch<React.SetStateAction<{ x: number; y: number; scale: number }>>;
  engineRef: React.MutableRefObject<GameEngine | null>;
  currentCity: City | null;
  activeLineIdx: number;
  setActiveLineIdx: (idx: number) => void;
  syncStateImmediate: () => void;
  
  isDragging: boolean;
  setIsDragging: (val: boolean) => void;
  isPanning: boolean;
  setIsPanning: (val: boolean) => void;
  dragStart: Station | null;
  setDragStart: (val: Station | null) => void;
  dragCurrent: Point | null;
  setDragCurrent: (val: Point | null) => void;

  hoveredStationRef: React.MutableRefObject<Station | null>;
  mousePosRef: React.MutableRefObject<Point>;

  onStationClick?: (id: number) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  canvasRef,
  width,
  height,
  camera,
  setCamera,
  engineRef,
  currentCity,
  activeLineIdx,
  setActiveLineIdx,
  syncStateImmediate,
  isDragging,
  setIsDragging,
  isPanning,
  setIsPanning,
  dragStart,
  setDragStart,
  dragCurrent,
  setDragCurrent,
  hoveredStationRef,
  mousePosRef,
  onStationClick
}) => {

  const screenToWorld = (sx: number, sy: number) => ({
    x: (sx - camera.x) / camera.scale,
    y: (sy - camera.y) / camera.scale
  });

  const handleWheel = (e: React.WheelEvent) => {
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    const newScale = Math.max(0.05, Math.min(10, camera.scale * factor));
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldMouse = screenToWorld(mx, my);
    setCamera({ scale: newScale, x: mx - worldMouse.x * newScale, y: my - worldMouse.y * newScale });
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!engineRef.current || !canvasRef.current) return;
    
    // Use engine state directly for interactions
    const state = engineRef.current.state;
    const rect = canvasRef.current.getBoundingClientRect();
    const worldMouse = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    let bestDist = 20 / camera.scale;
    let foundSegment: { lineId: number, stationA: number, stationB: number } | null = null;

    state.lines.forEach(line => {
      for (let i = 0; i < line.stations.length - 1; i++) {
        const sA = state.stations.find(s => s.id === line.stations[i]);
        const sB = state.stations.find(s => s.id === line.stations[i + 1]);
        if (sA && sB) {
          const d = distToSegment(worldMouse, sA, sB);
          if (d < bestDist) {
            bestDist = d;
            foundSegment = { lineId: line.id, stationA: sA.id, stationB: sB.id };
          }
        }
      }
    });

    if (foundSegment) {
      engineRef.current.removeSegmentBetween(foundSegment.lineId, foundSegment.stationA, foundSegment.stationB);
      syncStateImmediate();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) return; 
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const world = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const hit = engineRef.current?.state.stations.find(s => getDistance(s, world) < 80 / camera.scale);
    
    if (hit) {
      if (onStationClick) onStationClick(hit.id);
      const lineAtStart = engineRef.current?.state.lines.find(l => l.stations[0] === hit.id || l.stations[l.stations.length - 1] === hit.id);
      if (lineAtStart) setActiveLineIdx(lineAtStart.id);
      setDragStart(hit); 
      setIsDragging(true); 
      setDragCurrent(world);
    } else {
      setIsPanning(true); 
      setDragCurrent({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (mousePosRef) mousePosRef.current = { x: mx, y: my };

    if (isPanning && dragCurrent) { 
      setCamera(prev => ({ ...prev, x: prev.x + (e.clientX - dragCurrent.x), y: prev.y + (e.clientY - dragCurrent.y) })); 
      setDragCurrent({ x: e.clientX, y: e.clientY }); 
    } 
    else if (isDragging) { 
      setDragCurrent(screenToWorld(mx, my)); 
    } else {
       // Hover check
       const world = screenToWorld(mx, my);
       const hit = engineRef.current?.state.stations.find(s => getDistance(s, world) < 80 / camera.scale);
       if (hoveredStationRef) hoveredStationRef.current = hit || null;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging && dragStart && engineRef.current) {
      const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return;
      const worldMouse = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const hit = engineRef.current.state.stations.find(s => getDistance(s, worldMouse) < 80 / camera.scale);
      
      if (hit && hit.id !== dragStart.id && currentCity) {
        const newActiveId = engineRef.current.tryConnectStations(activeLineIdx, dragStart, hit, currentCity);
        setActiveLineIdx(newActiveId);
        syncStateImmediate();
      }
    }
    setIsPanning(false); 
    setIsDragging(false); 
    setDragStart(null); 
    setDragCurrent(null);
  };

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      onWheel={handleWheel}
      onContextMenu={handleRightClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    />
  );
};
