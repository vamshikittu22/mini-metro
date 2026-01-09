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

  staticCanvas: HTMLCanvasElement;
  staticCtx: CanvasRenderingContext2D;

  prevCamera: { x: number, y: number, scale: number } | null = null;
  prevHash: string = '';
  prevDimensions: { w: number, h: number } = { w: 0, h: 0 };
  
  // Track regions from the previous frame that need restoring
  // FIFO Cap: 50 items max to prevent memory bloat
  prevDirtyRects: Rect[] = [];
  
  debugMode: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false }); 
    if (!context) throw new Error('Could not get canvas context');
    this.ctx = context;

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
    if (this.canvas.width !== this.prevDimensions.w || this.canvas.height !== this.prevDimensions.h) {
      this.staticCanvas.width = this.canvas.width;
      this.staticCanvas.height = this.canvas.height;
      this.prevDimensions = { w: this.canvas.width, h: this.canvas.height };
      this.prevHash = '';
    }

    const lineHash = JSON.stringify(state.lines.map(l => ({ id: l.id, s: l.stations })));
    const currentHash = `${camera.x},${camera.y},${camera.scale},${currentCity.id},${state.stations.length},${lineHash}`;
    const isStaticDirty = currentHash !== this.prevHash;

    const currentBounds = this.calculateCurrentDynamicBounds(state, camera, dragging, overlay);

    if (isStaticDirty) {
      this.renderStatic(state, camera, currentCity);
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(this.staticCanvas, 0, 0);
      this.renderDynamic(this.ctx, state, camera, dragging, null);
      
      this.prevHash = currentHash;
      this.prevDirtyRects = currentBounds.slice(-50);
    } else {
      const MAX_DIRTY_REGIONS = 150;
      if (currentBounds.length > MAX_DIRTY_REGIONS) {
        this.ctx.drawImage(this.staticCanvas, 0, 0);
        this.renderDynamic(this.ctx, state, camera, dragging, null);
        this.prevDirtyRects = currentBounds.slice(-50);
        return;
      }

      const dirtyRegions = [...this.prevDirtyRects, ...currentBounds];
      
      this.ctx.save();
      this.ctx.beginPath();
      dirtyRegions.forEach(r => {
        const pad = 2; 
        this.ctx.rect(Math.floor(r.x - pad), Math.floor(r.y - pad), Math.ceil(r.w + pad * 2), Math.ceil(r.h + pad * 2));
      });
      this.ctx.clip();

      this.ctx.drawImage(this.staticCanvas, 0, 0);
      this.renderDynamic(this.ctx, state, camera, dragging, null);
      this.ctx.restore();

      if (this.debugMode) {
        this.ctx.save();
        this.ctx.strokeStyle = 'red';
        this.ctx.lineWidth = 1;
        dirtyRegions.forEach(r => this.ctx.strokeRect(r.x, r.y, r.w, r.h));
        this.ctx.restore();
      }

      // Maintain a max cap of 50 rects
      this.prevDirtyRects = currentBounds.slice(-50);
    }

    if (overlay && overlay.hoveredStation && !dragging.active) {
       this.drawTooltip(this.ctx, overlay.hoveredStation, overlay.mousePos, state);
    }
  }

  private renderStatic(state: GameState, camera: { x: number, y: number, scale: number }, currentCity: City) {
    const ctx = this.staticCtx;
    const { stations, lines } = state;

    ctx.fillStyle = THEME.background;
    ctx.fillRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    ctx.strokeStyle = THEME.grid;
    ctx.lineWidth = 1 / camera.scale; 
    const gridSize = 100;
    const gridBound = 6000;
    ctx.beginPath();
    for (let x = -gridBound/2; x < gridBound; x += gridSize) { ctx.moveTo(x, -gridBound/2); ctx.lineTo(x, gridBound); }
    for (let y = -gridBound/2; y < gridBound; y += gridSize) { ctx.moveTo(-gridBound/2, y); ctx.lineTo(gridBound, y); }
    ctx.stroke();

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

    lines.forEach(line => {
      for (let i = 1; i < line.stations.length; i++) {
        const sAId = line.stations[i-1];
        const sBId = line.stations[i];
        const sA = stations.find(s => s.id === sAId);
        const sB = stations.find(s => s.id === sBId);
        
        if (sA && sB) {
          const path = [sA, ...getBentPath(sA, sB)];
          
          // Use stored segments for deterministic crossing visualization
          const segment = line.segments?.find(seg => 
            (seg.from === sAId && seg.to === sBId) || (seg.from === sBId && seg.to === sAId)
          );
          
          if (segment?.crossing) {
            ctx.save();
            ctx.strokeStyle = segment.crossing === 'tunnel' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = dynamicLineWidth + (8 * zoomComp);
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let j = 1; j < path.length; j++) ctx.lineTo(path[j].x, path[j].y);
            ctx.stroke();
            ctx.restore();
          }
          
          ctx.strokeStyle = line.color;
          ctx.lineWidth = dynamicLineWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(path[0].x, path[0].y);
          for (let j = 1; j < path.length; j++) ctx.lineTo(path[j].x, path[j].y);
          ctx.stroke();
        }
      }
    });

    stations.forEach(s => {
      this.drawStationShape(ctx, s.x, s.y, dynamicStationSize, s.type, true, 2.5 * zoomComp, THEME.stationStroke);
      ctx.fillStyle = THEME.text; 
      ctx.font = `900 ${dynamicTextSize}px Inter`; 
      ctx.textAlign = 'center';
      ctx.fillText(s.name.toUpperCase(), s.x, s.y + dynamicStationSize + (30 * zoomComp));
    });

    ctx.restore();
  }

  private renderDynamic(ctx: CanvasRenderingContext2D, state: GameState, camera: { x: number, y: number, scale: number }, dragging: any, clipRegion: Rect[] | null) {
    const { stations, lines, scoreAnimations } = state;
    
    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    const zoomComp = 1 / Math.pow(camera.scale, 0.8);
    const dynamicStationSize = THEME.stationSize * zoomComp;

    lines.forEach(line => {
      line.trains.forEach(train => {
        const sIdx = train.nextStationIndex;
        const fIdx = train.direction === 1 ? sIdx - 1 : sIdx + 1;
        const fromS = stations.find(s => s.id === line.stations[fIdx]);
        const toS = stations.find(s => s.id === line.stations[sIdx]);
        if (fromS && toS) {
          const tx = fromS.x + (toS.x - fromS.x) * train.progress;
          const ty = fromS.y + (toS.y - fromS.y) * train.progress;
          const tW = THEME.trainWidth * zoomComp;
          const tH = THEME.trainHeight * zoomComp;
          ctx.fillStyle = THEME.text;
          ctx.fillRect(tx - tW/2, ty - tH/2, tW, tH);
        }
      });
    });

    stations.forEach(s => {
      const pSize = (THEME.stationSize * 0.4) * zoomComp;
      const spacing = pSize + (3 * zoomComp);
      const gridX = s.x + dynamicStationSize + (8 * zoomComp);
      const gridY = s.y - dynamicStationSize;
      const visibleCount = Math.min(s.waitingPassengers.length, 8);
      for (let i = 0; i < visibleCount; i++) {
        const p = s.waitingPassengers[i];
        const col = i % 4;
        const row = Math.floor(i / 4);
        const px = gridX + (col * spacing);
        const py = gridY + (row * spacing);
        this.drawStationShape(ctx, px, py, pSize / 2, p.destinationShape, true, 1.0 * zoomComp, '#000000', '#FFFFFF');
      }
      if (s.waitingPassengers.length >= GAME_CONFIG.maxPassengers - 1) {
        ctx.beginPath(); ctx.strokeStyle = '#EF3340'; ctx.lineWidth = 5 * zoomComp; ctx.lineCap = 'round';
        ctx.arc(s.x, s.y, dynamicStationSize + (8 * zoomComp), -Math.PI/2, -Math.PI/2 + s.timer * Math.PI * 2);
        ctx.stroke();
      }
    });

    scoreAnimations.forEach(anim => {
      const elapsed = Date.now() - anim.startTime;
      const t = Math.min(1, elapsed / 1200);
      const opacity = t > 0.7 ? 1 - ((t - 0.7) / 0.3) : 1;
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.fillStyle = '#2ECC71';
      ctx.font = `900 ${18 * zoomComp}px Inter`;
      ctx.fillText('+1', anim.x, anim.y - (t * 50));
      ctx.restore();
    });

    ctx.restore();
  }
  
  private drawTooltip(ctx: CanvasRenderingContext2D, station: Station, mousePos: Point, state: GameState) {
    const name = station.name.toUpperCase();
    ctx.font = '900 10px Inter';
    ctx.fillStyle = 'white';
    ctx.fillRect(mousePos.x + 10, mousePos.y + 10, 100, 25);
    ctx.strokeStyle = 'black';
    ctx.strokeRect(mousePos.x + 10, mousePos.y + 10, 100, 25);
    ctx.fillStyle = 'black';
    ctx.fillText(name, mousePos.x + 15, mousePos.y + 25);
  }

  private calculateCurrentDynamicBounds(state: GameState, camera: { x: number, y: number, scale: number }, dragging: any, overlay?: any): Rect[] {
    const rects: Rect[] = [];
    const zoomComp = 1 / Math.pow(camera.scale, 0.8);
    const stationSize = (THEME.stationSize * zoomComp) * 5; 
    const trainSize = (THEME.trainWidth * zoomComp) * 4; 
    const worldToScreen = (wx: number, wy: number) => ({
      x: (wx * camera.scale) + camera.x,
      y: (wy * camera.scale) + camera.y
    });

    state.stations.forEach(s => {
      const pos = worldToScreen(s.x, s.y);
      rects.push({ x: pos.x - stationSize, y: pos.y - stationSize, w: stationSize * 2, h: stationSize * 2 });
    });

    state.lines.forEach(line => {
      line.trains.forEach(train => {
        const sIdx = train.nextStationIndex;
        const fIdx = train.direction === 1 ? sIdx - 1 : sIdx + 1;
        const fromS = state.stations.find(s => s.id === line.stations[fIdx]);
        const toS = state.stations.find(s => s.id === line.stations[sIdx]);
        if (fromS && toS) {
           const wx = fromS.x + (toS.x - fromS.x) * train.progress;
           const wy = fromS.y + (toS.y - fromS.y) * train.progress;
           const pos = worldToScreen(wx, wy);
           rects.push({ x: pos.x - trainSize, y: pos.y - trainSize, w: trainSize * 2, h: trainSize * 2 });
        }
      });
    });

    state.scoreAnimations.forEach(anim => {
      const pos = worldToScreen(anim.x, anim.y);
      rects.push({ x: pos.x - 30, y: pos.y - 100, w: 60, h: 120 });
    });

    return rects;
  }

  private drawStationShape(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, type: StationType, isFilled: boolean = true, strokeWidth: number = 2, strokeColor: string = THEME.stationStroke, fillColor: string = '#FFFFFF') {
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;
    switch (type) {
      case 'circle': ctx.arc(x, y, size, 0, Math.PI * 2); break;
      case 'square': ctx.rect(x - size, y - size, size * 2, size * 2); break;
      case 'triangle': {
        const r = size * 1.3;
        ctx.moveTo(x, y - r); ctx.lineTo(x - r * 0.866, y + r * 0.5); ctx.lineTo(x + r * 0.866, y + r * 0.5);
        ctx.closePath(); break;
      }
      case 'pentagon': {
        const r = size * 1.3;
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
        }
        ctx.closePath(); break;
      }
      case 'star': {
        const outer = size * 1.5, inner = size * 0.7;
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const r = i % 2 === 0 ? outer : inner;
          ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
        }
        ctx.closePath(); break;
      }
    }
    if (isFilled) ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}