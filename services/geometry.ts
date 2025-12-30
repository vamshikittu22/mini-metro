
import { Point, City } from '../types';

/**
 * Projects Lat/Lon to World coordinates.
 */
export const WORLD_SIZE = 3000;

export function project(lat: number, lon: number, city: City): Point {
  const { minLat, maxLat, minLon, maxLon } = city.bounds;
  
  const x = ((lon - minLon) / (maxLon - minLon)) * WORLD_SIZE;
  // Invert Y because game world 0 is top
  const y = WORLD_SIZE - ((lat - minLat) / (maxLat - minLat)) * WORLD_SIZE;
  
  return { x, y };
}

/**
 * Enforces 45 and 90 degree snapping for line segments
 */
export function snapToAngle(start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  
  const angle = Math.atan2(dy, dx);
  const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  return {
    x: start.x + Math.cos(snapAngle) * dist,
    y: start.y + Math.sin(snapAngle) * dist
  };
}

/**
 * Calculates an "elbow" path between two points following 45/90 degree rules.
 * Standard Mini Metro logic: One axis-aligned segment and one 45-degree diagonal segment.
 */
export function getBentPath(start: Point, end: Point): Point[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // If already axis-aligned or 45 degrees, return end
  if (absDx < 0.1 || absDy < 0.1 || Math.abs(absDx - absDy) < 0.1) {
    return [end];
  }

  let elbow: Point;
  // If moving more horizontally than vertically, go horizontal then diagonal
  if (absDx > absDy) {
    elbow = {
      x: start.x + (dx - Math.sign(dx) * absDy),
      y: start.y
    };
  } else {
    // Go vertical then diagonal
    elbow = {
      x: start.x,
      y: start.y + (dy - Math.sign(dy) * absDx)
    };
  }
  return [elbow, end];
}

export function getDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

export function distToSegment(p: Point, v: Point, w: Point): number {
  const l2 = Math.pow(getDistance(v, w), 2);
  if (l2 === 0) return getDistance(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return getDistance(p, {
    x: v.x + t * (w.x - v.x),
    y: v.y + t * (w.y - v.y)
  });
}

export function lineIntersectsLine(a: Point, b: Point, c: Point, d: Point): boolean {
  const det = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (det === 0) return false;
  const lambda = ((d.y - c.y) * (d.x - a.x) + (c.x - d.x) * (d.y - a.y)) / det;
  const gamma = ((a.y - b.y) * (d.x - a.x) + (b.x - a.x) * (d.y - a.y)) / det;
  return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
}

export function isSegmentCrossingWater(p1: Point, p2: Point, city: City): boolean {
  // Use bent path for more accurate water crossing detection
  const path = [p1, ...getBentPath(p1, p2)];
  
  for (let j = 0; j < path.length - 1; j++) {
    const start = path[j];
    const end = path[j+1];
    
    for (const poly of city.water) {
      for (let i = 0; i < poly.length; i++) {
        const pA = project(poly[i].lat, poly[i].lon, city);
        const pB = project(poly[(i + 1) % poly.length].lat, poly[(i + 1) % poly.length].lon, city);
        if (lineIntersectsLine(start, end, pA, pB)) return true;
      }
    }
  }
  return false;
}
