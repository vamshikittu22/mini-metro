
import { GameState, Station, TransitLine, City, Point, StationType } from '../types';
import { THEME, GAME_CONFIG } from '../constants';
import { getBentPath, getDistance, isSegmentCrossingWater, project } from './geometry';

export class Renderer {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    this.ctx = context;
  }

  draw(state: GameState, camera: { x: number, y: number, scale: number }, currentCity: City, dragging: { active: boolean, start: Station | null, current: Point | null, activeLineIdx: number }) {
    const { ctx } = this;
    const { stations, lines, scoreAnimations } = state;

    ctx.fillStyle = THEME.background;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.scale, camera.scale);

    // Grid
    ctx.strokeStyle = THEME.grid;
    ctx.lineWidth = 1;
    for (let x = -3000; x < 6000; x += 100) { ctx.beginPath(); ctx.moveTo(x, -3000); ctx.lineTo(x, 6000); ctx.stroke(); }
    for (let y = -3000; y < 6000; y += 100) { ctx.beginPath(); ctx.moveTo(-3000, y); ctx.lineTo(6000, y); ctx.stroke(); }

    // Water
    const time = Date.now() / 1000;
    ctx.fillStyle = THEME.water;
    currentCity.water.forEach(poly => {
      ctx.beginPath();
      const p0 = project(poly[0].lat, poly[0].lon, currentCity);
      ctx.moveTo(p0.x, p0.y);
      poly.forEach(pt => {
        const p = project(pt.lat, pt.lon, currentCity);
        ctx.lineTo(p.x, p.y);
      });
      ctx.fill();

      // Ripples
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      poly.forEach((pt, i) => {
        const p = project(pt.lat, pt.lon, currentCity);
        const shift = Math.sin(time + i) * 5;
        if (i === 0) ctx.moveTo(p.x + shift, p.y + shift);
        else ctx.lineTo(p.x + shift, p.y + shift);
      });
      ctx.stroke();
    });

    const zoomComp = 1 / Math.pow(camera.scale, 0.8);
    const dynamicStationSize = THEME.stationSize * zoomComp;
    const dynamicPassengerSize = THEME.passengerSize * zoomComp;
    const dynamicTextSize = 13 * zoomComp;
    const dynamicLineWidth = THEME.lineWidth * Math.pow(camera.scale, 0.2);

    // Infrastructure: Tunnels and Bridges
    lines.forEach(line => {
      for (let i = 1; i < line.stations.length; i++) {
        const sA = stations.find(s => s.id === line.stations[i-1]);
        const sB = stations.find(s => s.id === line.stations[i]);
        if (sA && sB && isSegmentCrossingWater(sA, sB, currentCity)) {
          const path = [sA, ...getBentPath(sA, sB)];
          const isTunnel = line.id % 2 === 0;

          if (isTunnel) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = dynamicLineWidth + (6 * zoomComp);
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let j = 1; j < path.length; j++) ctx.lineTo(path[j].x, path[j].y);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 1.5 * zoomComp;
            const step = 15 * zoomComp;
            for (let j = 0; j < path.length - 1; j++) {
                const p1 = path[j], p2 = path[j+1];
                const dx = p2.x - p1.x, dy = p2.y - p1.y;
                const len = Math.sqrt(dx*dx + dy*dy);
                const perpX = -dy/len, perpY = dx/len;
                for (let d = 0; d < len; d += step) {
                    const cx = p1.x + dx * (d/len);
                    const cy = p1.y + dy * (d/len);
                    const hw = (dynamicLineWidth + (10 * zoomComp)) / 2;
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

    // Transit Lines
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
              this.drawStationShape(ctx, px, py, pSize / 2, p.targetType, true, 1.5);
            });
            ctx.restore();
          }
          ctx.restore();
        }
      });
    });

    // Dragging Line Preview
    if (dragging.active && dragging.start && dragging.current) {
      ctx.strokeStyle = THEME.lineColors[dragging.activeLineIdx]; ctx.lineWidth = dynamicLineWidth; ctx.setLineDash([15, 10]);
      ctx.beginPath(); ctx.moveTo(dragging.start.x, dragging.start.y);
      getBentPath(dragging.start, dragging.current).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke(); ctx.setLineDash([]);
    }

    // Stations
    stations.forEach(s => {
      if (s.waitingPassengers.length > 4) {
        ctx.beginPath(); ctx.strokeStyle = '#999999'; ctx.lineWidth = 1.5 * zoomComp;
        ctx.arc(s.x, s.y, dynamicStationSize + (6 * zoomComp), 0, Math.PI * 2);
        ctx.stroke();
      }
      this.drawStationShape(ctx, s.x, s.y, dynamicStationSize, s.type, true, 2.5 * zoomComp);
      
      const dotCount = GAME_CONFIG.softCapacity;
      const dotSpacing = 8 * zoomComp;
      const dotRadius = 1.8 * zoomComp;
      const startX = s.x - ((dotCount - 1) * dotSpacing) / 2;
      for (let i = 0; i < dotCount; i++) {
        ctx.beginPath();
        ctx.fillStyle = s.waitingPassengers.length > i ? '#333333' : '#CCCCCC';
        ctx.arc(startX + i * dotSpacing, s.y + dynamicStationSize + (12 * zoomComp), dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = THEME.text; ctx.font = `900 ${dynamicTextSize}px Inter`; ctx.textAlign = 'center';
      ctx.fillText(s.name.toUpperCase(), s.x, s.y + dynamicStationSize + (30 * zoomComp));
      
      const pSize = dynamicPassengerSize;
      s.waitingPassengers.forEach((p, i) => {
        const px = s.x + dynamicStationSize + (10 * zoomComp) + (i % 3) * (pSize + (4 * zoomComp));
        const py = s.y - dynamicStationSize + Math.floor(i / 3) * (pSize + (4 * zoomComp));
        this.drawStationShape(ctx, px, py, pSize / 2, p.targetType, true, 1.5 * zoomComp);
      });

      if (s.waitingPassengers.length >= GAME_CONFIG.maxPassengers - 1) {
        ctx.beginPath(); ctx.strokeStyle = '#EF3340'; ctx.lineWidth = 5 * zoomComp; ctx.lineCap = 'round';
        ctx.arc(s.x, s.y, dynamicStationSize + (8 * zoomComp), -Math.PI/2, -Math.PI/2 + s.timer * Math.PI * 2);
        ctx.stroke();
      }
    });

    // Score Animations
    scoreAnimations.forEach(anim => {
      const elapsed = Date.now() - anim.startTime;
      const opacity = 1 - elapsed / 1000;
      const floatY = anim.y - (elapsed / 1000) * 100 * zoomComp;
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
      ctx.font = `black ${dynamicTextSize * 1.8}px Inter`; ctx.textAlign = 'center';
      ctx.fillText('+1', anim.x, floatY);
    });

    ctx.restore();
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
