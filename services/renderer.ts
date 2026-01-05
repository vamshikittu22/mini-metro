
import { GameState, Station, TransitLine, City, Point, StationType, Train } from '../types';
import { THEME, GAME_CONFIG } from '../constants';
import { getBentPath, getDistance, isSegmentCrossingWater, project } from './geometry';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class Renderer {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;

  // Offscreen buffer for static elements (Grid, Water, Lines)
  staticCanvas: HTMLCanvasElement;
  staticCtx: CanvasRenderingContext2D;

  // State tracking
  prevCamera: { x: number, y: number, scale: number } | null = null;
  prevHash: string = '';
  prevDimensions: { w: number, h: number } = { w: 0, h: 0 };
  
  // Dirty Rects
  prevDirtyRects: Rect[] = [];
  
  // Debug
  debugMode: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency on main canvas
    if (!context) throw new Error('Could not get canvas context');
    this.ctx = context;

    // Initialize offscreen canvas
    this.staticCanvas = document.createElement('canvas');
    const staticCtx = this.staticCanvas.getContext('2d', { alpha: true });
    if (!staticCtx) throw new Error('Could not get static canvas context');
    this.staticCtx = staticCtx;
  }

  toggleDebug() {
    this.debugMode = !this.debugMode;
    console.log(`[RENDERER] Debug Mode: ${this.debugMode ? 'ON' : 'OFF'}`);
  }

  draw(
    state: GameState, 
    camera: { x: number, y: number, scale: number }, 
    currentCity: City, 
    dragging: { active: boolean, start: Station | null, current: Point | null, activeLineIdx: number },
    overlay?: { hoveredStation: Station | null, mousePos: Point }
  ) {
    const start = performance.now();
    
    // 1. Handle Resize
    if (this.canvas.width !== this.prevDimensions.w || this.canvas.height !== this.prevDimensions.h) {
      this.staticCanvas.width = this.canvas.width;
      this.staticCanvas.height = this.canvas.height;
      this.prevDimensions = { w: this.canvas.width, h: this.canvas.height };
      this.prevHash = ''; // Force redraw
    }

    // 2. Generate Static Hash (Camera + Topology)
    const lineHash = JSON.stringify(state.lines.map(l => ({ id: l.id, s: l.stations })));
    const currentHash = `${camera.x},${camera.y},${camera.scale},${currentCity.id},${state.stations.length},${lineHash}`;
    
    const isStaticDirty = currentHash !== this.prevHash;

    if (isStaticDirty) {
      // Full Static Redraw
      this.renderStatic(state, camera, currentCity);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(this.staticCanvas, 0, 0);
      
      // Draw all dynamic content on top for the full frame
      this.renderDynamic(this.ctx, state, camera, dragging, null);
      
      this.prevHash = currentHash;
      // Reset dirty rects since we drew everything
      this.prevDirtyRects = []; 
      
      // For the next frame, we need to know where dynamic objects ARE right now
      this.prevDirtyRects = this.calculateCurrentDynamicBounds(state, camera, dragging, overlay);

    } else {
      // Dirty Rectangle Optimization
      const currentBounds = this.calculateCurrentDynamicBounds(state, camera, dragging, overlay);
      
      // Merge previous frame bounds (clear old pos) + current frame bounds (draw new pos)
      const dirtyRegions = [...this.prevDirtyRects, ...currentBounds];
      
      this.ctx.save();
      
      // Define clipping path for all dirty regions
      this.ctx.beginPath();
      dirtyRegions.forEach(r => {
        // Expand slightly to avoid anti-aliasing artifacts
        const pad = 2;
        this.ctx.rect(Math.floor(r.x - pad), Math.floor(r.y - pad), Math.ceil(r.w + pad * 2), Math.ceil(r.h + pad * 2));
      });
      this.ctx.clip();

      // 1. Clear dirty regions (technically restore background)
      // Since we clipped, this drawImage only touches the dirty pixels
      this.ctx.drawImage(this.staticCanvas, 0, 0);

      // 2. Draw Dynamic Elements (Clipped)
      this.renderDynamic(this.ctx, state, camera, dragging, null);

      this.ctx.restore();

      // Debug Visualization
      if (this.debugMode) {
        this.ctx.save();
        this.ctx.strokeStyle = 'red';
        this.ctx.lineWidth = 1;
        dirtyRegions.forEach(r => {
          this.ctx.strokeRect(r.x, r.y, r.w, r.h);
        });
        this.ctx.fillStyle = 'red';
        this.ctx.font = '10px monospace';
        this.ctx.fillText(`Dirty: ${dirtyRegions.length} | ${(performance.now() - start).toFixed(2)}ms`, 10, 20);
        this.ctx.restore();
      }

      this.prevDirtyRects = currentBounds;
    }

    // 3. Draw Tooltip (Always on top, no clipping)
    if (overlay && overlay.hoveredStation && !dragging.active) {
       this.drawTooltip(this.ctx, overlay.hoveredStation, overlay.mousePos, state);
    }
  }

  // --- Static Rendering (Cached) ---
  private renderStatic(state: GameState, camera: { x: number, y: number, scale: number }, currentCity: City) {
    const ctx = this.staticCtx;
    const { stations, lines } = state;

    ctx.fillStyle = THEME.background;
    ctx.fillRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    // 1. Grid
    ctx.strokeStyle = THEME.grid;
    ctx.lineWidth = 1 / camera.scale; // Keep 1px regardless of zoom
    const gridSize = 100;
    const gridBound = 6000;
    ctx.beginPath();
    for (let x = -gridBound/2; x < gridBound; x += gridSize) { ctx.moveTo(x, -gridBound/2); ctx.lineTo(x, gridBound); }
    for (let y = -gridBound/2; y < gridBound; y += gridSize) { ctx.moveTo(-gridBound/2, y); ctx.lineTo(gridBound, y); }
    ctx.stroke();

    // 2. Water
    const time = Date.now() / 1000; // Static layer doesn't animate water shimmer perfectly, but base shape is here
    ctx.fillStyle = THEME.water;
    ctx.strokeStyle = '#BDD1E0';
    ctx.lineWidth = 2 / camera.scale;
    
    currentCity.water.forEach(poly => {
      if (poly.length < 2) return;
      ctx.beginPath();
      const p0 = project(poly[0].lat, poly[0].lon, currentCity);
      ctx.moveTo(p0.x, p0.y);
      poly.forEach(pt => {
        const p = project(pt.lat, pt.lon, currentCity);
        ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    const zoomComp = 1 / Math.pow(camera.scale, 0.8);
    const dynamicStationSize = THEME.stationSize * zoomComp;
    const dynamicTextSize = 13 * zoomComp;
    const dynamicLineWidth = THEME.lineWidth * Math.pow(camera.scale, 0.2);

    // 3. Lines (Infrastructure + Paths)
    lines.forEach(line => {
      // Connectors
      for (let i = 1; i < line.stations.length; i++) {
        const sA = stations.find(s => s.id === line.stations[i-1]);
        const sB = stations.find(s => s.id === line.stations[i]);
        if (sA && sB && isSegmentCrossingWater(sA, sB, currentCity)) {
          const path = [sA, ...getBentPath(sA, sB)];
          const isTunnel = (line.id + sA.id + sB.id) % 2 === 0;

          if (isTunnel) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.lineWidth = dynamicLineWidth + (8 * zoomComp);
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let j = 1; j < path.length; j++) ctx.lineTo(path[j].x, path[j].y);
            ctx.stroke();

            ctx.strokeStyle = '#666666'; 
            ctx.lineWidth = 2 * zoomComp;
            const step = 12 * zoomComp;
            for (let j = 0; j < path.length - 1; j++) {
                const p1 = path[j], p2 = path[j+1];
                const dx = p2.x - p1.x, dy = p2.y - p1.y;
                const len = Math.sqrt(dx*dx + dy*dy);
                const perpX = -dy/len, perpY = dx/len;
                for (let d = 0; d < len; d += step) {
                    const cx = p1.x + dx * (d/len);
                    const cy = p1.y + dy * (d/len);
                    const hw = (dynamicLineWidth + (6 * zoomComp)) / 2;
                    ctx.beginPath();
                    ctx.moveTo(cx - perpX * hw, cy - perpY * hw);
                    ctx.lineTo(cx + perpX * hw, cy + perpY * hw);
                    ctx.stroke();
                }
            }
            ctx.restore();
          } else {
            ctx.save();
            ctx.strokeStyle = '#222';
            ctx.lineWidth = dynamicLineWidth + (14 * zoomComp);
            ctx.lineCap = 'butt';
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let j = 1; j < path.length; j++) ctx.lineTo(path[j].x, path[j].y);
            ctx.stroke();
            
            ctx.strokeStyle = '#F8F4EE';
            ctx.lineWidth = dynamicLineWidth + (6 * zoomComp);
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let j = 1; j < path.length; j++) ctx.lineTo(path[j].x, path[j].y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    });

    lines.forEach(line => {
      if (line.stations.length < 2) return;
      ctx.strokeStyle = line.color; ctx.lineWidth = dynamicLineWidth; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      const s0 = stations.find(s => s.id === line.stations[0]);
      if (s0) {
        ctx.moveTo(s0.x, s0.y);
        for (let i = 1; i < line.stations.length; i++) {
          const sA = stations.find(s => s.id === line.stations[i-1]);
          const sB = stations.find(s => s.id === line.stations[i]);
          if (sA && sB) {
            getBentPath(sA, sB).forEach(pt => ctx.lineTo(pt.x, pt.y));
          }
        }
        ctx.stroke();
      }
    });

    // 4. Stations (Static components: Shape base, Name)
    // Note: We intentionally draw stations on static layer so lines appear under them.
    // Dynamic overlay (passengers, timer) will be drawn in renderDynamic.
    stations.forEach(s => {
      this.drawStationShape(ctx, s.x, s.y, dynamicStationSize, s.type, true, 2.5 * zoomComp, THEME.stationStroke);
      
      ctx.fillStyle = THEME.text; 
      ctx.font = `900 ${dynamicTextSize}px Inter`; 
      ctx.textAlign = 'center';
      ctx.fillText(s.name.toUpperCase(), s.x, s.y + dynamicStationSize + (30 * zoomComp));
    });

    ctx.restore();
  }

  // --- Dynamic Rendering (Per Frame) ---
  private renderDynamic(ctx: CanvasRenderingContext2D, state: GameState, camera: { x: number, y: number, scale: number }, dragging: any, clipRegion: Rect[] | null) {
    const { stations, lines, scoreAnimations } = state;
    
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    const zoomComp = 1 / Math.pow(camera.scale, 0.8);
    const dynamicStationSize = THEME.stationSize * zoomComp;
    const dynamicPassengerSize = THEME.passengerSize * zoomComp;
    const dynamicTextSize = 13 * zoomComp;
    const dynamicLineWidth = THEME.lineWidth * Math.pow(camera.scale, 0.2);

    // 1. Trains
    lines.forEach(line => {
      line.trains.forEach(train => {
        // Calculate Position
        const sIdx = Math.max(0, Math.min(train.nextStationIndex, line.stations.length - 1));
        const fIdx = Math.max(0, Math.min(train.direction === 1 ? sIdx - 1 : sIdx + 1, line.stations.length - 1));
        const fromS = stations.find(s => s.id === line.stations[fIdx]);
        const toS = stations.find(s => s.id === line.stations[sIdx]);
        
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
          
          // Draw Train
          ctx.save();
          ctx.translate(tx, ty);
          ctx.rotate(angle);
          
          const numSegs = 1 + train.wagons;
          const tW = THEME.trainWidth * zoomComp;
          const tH = THEME.trainHeight * zoomComp;
          const gap = 6 * zoomComp;

          for (let s = 0; s < numSegs; s++) {
            ctx.save();
            ctx.translate(-s * (tW + gap), 0);
            if (s > 0) {
              ctx.strokeStyle = '#333'; ctx.lineWidth = 3 * zoomComp;
              ctx.beginPath(); ctx.moveTo(tW/2, 0); ctx.lineTo(tW/2 + gap, 0); ctx.stroke();
            }
            ctx.fillStyle = THEME.text; ctx.fillRect(-tW/2, -tH/2, tW, tH);
            const capacity = GAME_CONFIG.trainCapacity;
            const segPass = train.passengers.slice(s * capacity, (s + 1) * capacity);
            const loadRatio = segPass.length / capacity;
            const barW = tW - (8 * zoomComp);
            const barH = 4 * zoomComp;
            ctx.fillStyle = loadRatio > 0.8 ? '#EF3340' : loadRatio > 0.5 ? '#FFD100' : '#2ECC71';
            ctx.fillRect(-barW/2, -tH/2 - (8 * zoomComp), barW * loadRatio, barH);
            
            const pSize = dynamicPassengerSize * 0.7;
            segPass.forEach((p, i) => {
              const row = Math.floor(i / 3), col = i % 3;
              const px = -tW/2 + (10 * zoomComp) + col * (pSize + (4 * zoomComp));
              const py = -tH/2 + (10 * zoomComp) + row * (pSize + (4 * zoomComp));
              this.drawStationShape(ctx, px, py, pSize / 2, p.destinationShape, true, 1.5);
            });
            ctx.restore();
          }
          ctx.restore();
        }
      });
    });

    // 2. Dragging Line
    if (dragging.active && dragging.start && dragging.current) {
      ctx.strokeStyle = THEME.lineColors[dragging.activeLineIdx]; ctx.lineWidth = dynamicLineWidth; ctx.setLineDash([15, 10]);
      ctx.beginPath(); ctx.moveTo(dragging.start.x, dragging.start.y);
      getBentPath(dragging.start, dragging.current).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke(); ctx.setLineDash([]);
    }

    // 3. Station Dynamic Parts (Timer, Passengers, Overcrowding)
    // We redraw stations in the dirty area to ensure they are on top of trains
    stations.forEach(s => {
      // Re-draw station shape (cheap) to ensure clean edges over trains if train passes under
      this.drawStationShape(ctx, s.x, s.y, dynamicStationSize, s.type, true, 2.5 * zoomComp, THEME.stationStroke);

      // Overcrowding Warning
      if (s.waitingPassengers.length > 4) {
        ctx.beginPath(); ctx.strokeStyle = '#999999'; ctx.lineWidth = 1.5 * zoomComp;
        ctx.arc(s.x, s.y, dynamicStationSize + (6 * zoomComp), 0, Math.PI * 2);
        ctx.stroke();
      }

      // Waiting Passengers
      const pSize = dynamicPassengerSize;
      const dotCount = GAME_CONFIG.softCapacity;
      const dotSpacing = 8 * zoomComp;
      const dotRadius = 1.8 * zoomComp;
      const startX = s.x - ((dotCount - 1) * dotSpacing) / 2;
      
      // Capacity Dots
      for (let i = 0; i < dotCount; i++) {
        ctx.beginPath();
        ctx.fillStyle = s.waitingPassengers.length > i ? '#333333' : '#CCCCCC';
        ctx.arc(startX + i * dotSpacing, s.y + dynamicStationSize + (12 * zoomComp), dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Passenger Shapes
      s.waitingPassengers.forEach((p, i) => {
        const px = s.x + dynamicStationSize + (10 * zoomComp) + (i % 3) * (pSize + (4 * zoomComp));
        const py = s.y - dynamicStationSize + Math.floor(i / 3) * (pSize + (4 * zoomComp));
        this.drawStationShape(ctx, px, py, pSize / 2, p.destinationShape, true, 1.5 * zoomComp);
      });

      // Critical Timer
      if (s.waitingPassengers.length >= GAME_CONFIG.maxPassengers - 1) {
        ctx.beginPath(); ctx.strokeStyle = '#EF3340'; ctx.lineWidth = 5 * zoomComp; ctx.lineCap = 'round';
        ctx.arc(s.x, s.y, dynamicStationSize + (8 * zoomComp), -Math.PI/2, -Math.PI/2 + s.timer * Math.PI * 2);
        ctx.stroke();
      }
    });

    // 4. Animations
    scoreAnimations.forEach(anim => {
      const elapsed = Date.now() - anim.startTime;
      const duration = 1200; // 1.2s total duration
      const t = Math.min(1, elapsed / duration);
      
      if (t >= 1) return;

      // Easing (Cubic Ease Out for float)
      const ease = 1 - Math.pow(1 - t, 3);
      
      // Determine Color
      let color = '#2ECC71'; // Default Green (0 transfers)
      if (anim.transferCount === 1) color = '#FFD100'; // Yellow
      if (anim.transferCount >= 2) color = '#FF8200'; // Orange

      // Physics
      const floatDist = 60 * zoomComp;
      const curY = anim.y - (ease * floatDist);
      
      // Fade out logic (last 30% of lifecycle)
      const opacity = t > 0.7 ? 1 - ((t - 0.7) / 0.3) : 1;
      
      // Scale Pulse (0.0 -> 1.2 -> 1.0)
      let scale = 1;
      if (t < 0.2) {
          scale = (t / 0.2) * 1.2; // Ramp up to 1.2
      } else {
          scale = 1.2 - ((t - 0.2) * 0.25); // Settle to 1.0 (approx)
      }

      ctx.save();
      ctx.translate(anim.x, curY);
      ctx.scale(scale, scale);
      ctx.globalAlpha = opacity;
      
      ctx.fillStyle = color;
      ctx.font = `900 ${dynamicTextSize * 1.5}px Inter`; 
      ctx.textAlign = 'center';
      
      // Draw "+1"
      ctx.fillText('+1', 0, 0);
      
      ctx.restore();
    });

    ctx.restore();
  }
  
  private drawTooltip(ctx: CanvasRenderingContext2D, station: Station, mousePos: Point, state: GameState) {
    const name = station.name.toUpperCase();
    const waiting = `${station.waitingPassengers.length} Waiting`;
    
    // Connected lines logic
    const connectedLines = state.lines
      .filter(l => l.stations.includes(station.id))
      .map(l => l.color);

    // Measure Content
    ctx.font = '900 10px Inter';
    const nameMetrics = ctx.measureText(name);
    
    ctx.font = '500 10px Inter';
    const waitMetrics = ctx.measureText(waiting);
    
    const linesWidth = connectedLines.length > 0 ? (connectedLines.length * 12) + 12 : 0;
    
    const w = Math.max(nameMetrics.width, waitMetrics.width, linesWidth, 80) + 24;
    const h = connectedLines.length > 0 ? 56 : 42;
    
    // Position offset 10px from cursor
    let x = mousePos.x + 10;
    let y = mousePos.y + 10;
    
    // Boundary checks
    if (x + w > this.canvas.width) x = mousePos.x - w - 10;
    if (y + h > this.canvas.height) y = mousePos.y - h - 10;

    ctx.save();
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillRect(x + 4, y + 4, w, h);
    
    // Bg
    ctx.fillStyle = 'white';
    ctx.fillRect(x, y, w, h);
    
    // Border
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    
    // Text
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    ctx.font = '900 10px Inter';
    ctx.fillText(name, x + 12, y + 10);
    
    ctx.font = '600 9px Inter';
    ctx.fillStyle = '#666';
    ctx.fillText(waiting.toUpperCase(), x + 12, y + 24);
    
    // Line indicators
    if (connectedLines.length > 0) {
       connectedLines.forEach((color, i) => {
         ctx.fillStyle = color;
         ctx.beginPath();
         ctx.arc(x + 16 + (i * 12), y + 42, 3, 0, Math.PI * 2);
         ctx.fill();
       });
    }

    ctx.restore();
  }

  // --- Helpers ---

  private calculateCurrentDynamicBounds(
    state: GameState, 
    camera: { x: number, y: number, scale: number }, 
    dragging: any, 
    overlay?: { hoveredStation: Station | null, mousePos: Point }
  ): Rect[] {
    const rects: Rect[] = [];
    const zoomComp = 1 / Math.pow(camera.scale, 0.8);
    const stationSize = (THEME.stationSize * zoomComp) * 3.5; // Include passengers area
    const trainSize = (THEME.trainWidth * zoomComp) * 3; // Include rotation + wagons

    // Convert world to screen coords for rects
    const worldToScreen = (wx: number, wy: number) => ({
      x: (wx * camera.scale) + camera.x,
      y: (wy * camera.scale) + camera.y
    });

    // 1. Stations (Always consider dirty if they have passengers, to handle rendering updates)
    // Optimization: Check if passenger count changed? 
    // For now, assume any station with passengers is 'active' visual area.
    state.stations.forEach(s => {
      if (s.waitingPassengers.length > 0 || s.timer > 0) {
        const pos = worldToScreen(s.x, s.y);
        rects.push({ 
          x: pos.x - stationSize, y: pos.y - stationSize, 
          w: stationSize * 2.5, h: stationSize * 2 
        });
      }
    });

    // 2. Trains
    state.lines.forEach(line => {
      line.trains.forEach(train => {
        // Approximate position logic again (simplified for bounds)
        // We need the world coordinates. 
        // To save CPU, we could assume trains are near their last station + progress?
        // Let's re-calculate precise position to be safe.
        const sIdx = Math.max(0, Math.min(train.nextStationIndex, line.stations.length - 1));
        const fIdx = Math.max(0, Math.min(train.direction === 1 ? sIdx - 1 : sIdx + 1, line.stations.length - 1));
        const fromS = state.stations.find(s => s.id === line.stations[fIdx]);
        const toS = state.stations.find(s => s.id === line.stations[sIdx]);
        if (fromS && toS) {
           const dx = toS.x - fromS.x;
           const dy = toS.y - fromS.y;
           // Roughly
           const wx = fromS.x + dx * train.progress;
           const wy = fromS.y + dy * train.progress;
           const pos = worldToScreen(wx, wy);
           const sizeWithWagons = trainSize * (1 + train.wagons);
           rects.push({
             x: pos.x - sizeWithWagons/2,
             y: pos.y - sizeWithWagons/2,
             w: sizeWithWagons,
             h: sizeWithWagons
           });
        }
      });
    });

    // 3. Dragging
    if (dragging.active && dragging.start && dragging.current) {
      const p1 = worldToScreen(dragging.start.x, dragging.start.y);
      const p2 = worldToScreen(dragging.current.x, dragging.current.y);
      const minX = Math.min(p1.x, p2.x) - 20;
      const minY = Math.min(p1.y, p2.y) - 20;
      const w = Math.abs(p2.x - p1.x) + 40;
      const h = Math.abs(p2.y - p1.y) + 40;
      rects.push({ x: minX, y: minY, w, h });
    }

    // 4. Animations
    state.scoreAnimations.forEach(anim => {
      const pos = worldToScreen(anim.x, anim.y);
      rects.push({ x: pos.x - 20, y: pos.y - 100, w: 40, h: 100 });
    });

    // 5. Tooltip
    if (overlay && overlay.hoveredStation && !dragging.active) {
       const station = overlay.hoveredStation;
       const mousePos = overlay.mousePos;
       
       const name = station.name.toUpperCase();
       const waiting = `${station.waitingPassengers.length} Waiting`;
       const connectedLines = state.lines.filter(l => l.stations.includes(station.id));
       
       this.ctx.font = '900 10px Inter';
       const nameW = this.ctx.measureText(name).width;
       this.ctx.font = '500 10px Inter';
       const waitW = this.ctx.measureText(waiting).width;
       
       const linesWidth = connectedLines.length > 0 ? (connectedLines.length * 12) + 12 : 0;
       const w = Math.max(nameW, waitW, linesWidth, 80) + 24;
       const h = connectedLines.length > 0 ? 56 : 42;
       
       let x = mousePos.x + 10;
       let y = mousePos.y + 10;
       
       if (x + w > this.canvas.width) x = mousePos.x - w - 10;
       if (y + h > this.canvas.height) y = mousePos.y - h - 10;
       
       // Add rect covering the tooltip + shadow (offset 4,4) + margin
       rects.push({ x: x - 4, y: y - 4, w: w + 12, h: h + 12 });
    }

    return rects;
  }

  drawStationShape(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, type: StationType, fill: boolean = true, strokeWidth: number = 2.5, strokeColor?: string) {
    ctx.beginPath();
    if (type === 'circle') ctx.arc(x, y, size, 0, Math.PI * 2);
    else if (type === 'square') ctx.rect(x - size, y - size, size * 2, size * 2);
    else if (type === 'triangle') { ctx.moveTo(x, y - size); ctx.lineTo(x - size, y + size); ctx.lineTo(x + size, y + size); ctx.closePath(); }
    else if (type === 'pentagon') {
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
    ctx.strokeStyle = strokeColor || THEME.text; ctx.lineWidth = strokeWidth; ctx.stroke();
  }
}
