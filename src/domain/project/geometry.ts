/** Pure geometrische hulpfuncties in wereldeenheden (mm). Geen afronding: dat gebeurt alleen bij weergave. */
import type { Point } from "./schema";

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function wallLength(wall: { start: Point; end: Point }): number {
  return distance(wall.start, wall.end);
}

/** Hoek van de muur in graden (0 = naar rechts, met de klok mee, want y wijst naar beneden). */
export function wallAngle(wall: { start: Point; end: Point }): number {
  return normalizeDegrees((Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x) * 180) / Math.PI);
}

/** Geeft het eindpunt zodanig dat de muur de gevraagde lengte krijgt, met behoud van richting en beginpunt. */
export function withWallLength<T extends { start: Point; end: Point }>(wall: T, newLength: number): T {
  if (!(newLength > 0)) throw new RangeError("Een muur moet langer zijn dan 0 mm.");
  const current = wallLength(wall);
  if (current === 0) throw new RangeError("Een muur zonder lengte heeft geen richting.");
  const f = newLength / current;
  return {
    ...wall,
    end: { x: wall.start.x + (wall.end.x - wall.start.x) * f, y: wall.start.y + (wall.end.y - wall.start.y) * f },
  };
}

/** Punt op de muur op afstand `offset` vanaf het begin. */
export function pointAlongWall(wall: { start: Point; end: Point }, offset: number): Point {
  const len = wallLength(wall);
  if (len === 0) return { ...wall.start };
  const t = offset / len;
  return { x: wall.start.x + (wall.end.x - wall.start.x) * t, y: wall.start.y + (wall.end.y - wall.start.y) * t };
}

/** Projecteert een punt op het lijnstuk van de muur; geeft de afstand langs de muur (geklemd) en het punt. */
export function projectOntoWall(wall: { start: Point; end: Point }, p: Point): { offset: number; point: Point; distance: number } {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - wall.start.x) * dx + (p.y - wall.start.y) * dy) / lenSq));
  const point = { x: wall.start.x + dx * t, y: wall.start.y + dy * t };
  return { offset: t * Math.sqrt(lenSq), point, distance: distance(point, p) };
}

/** Oppervlakte van een polygoon in mm² (altijd positief). */
export function polygonArea(points: readonly Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

export function snapValue(value: number, step: number): number {
  if (!(step > 0)) return value;
  return Math.round(value / step) * step;
}

export function snapPoint(p: Point, step: number): Point {
  return { x: snapValue(p.x, step), y: snapValue(p.y, step) };
}

export function normalizeDegrees(deg: number): number {
  const r = deg % 360;
  const n = r < 0 ? r + 360 : r;
  // Voorkom -0 en afrondingsresten als 359.9999999 → 360.
  return n >= 360 - 1e-9 || Object.is(n, -0) ? 0 : n;
}

/** Hoekpunten van een gedraaide rechthoek (middelpunt, breedte langs x, diepte langs y, rotatie in graden). */
export function rectangleCorners(center: Point, width: number, depth: number, rotationDeg: number): Point[] {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = width / 2;
  const hd = depth / 2;
  return [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ].map(([lx, ly]) => ({ x: center.x + lx! * cos - ly! * sin, y: center.y + lx! * sin + ly! * cos }));
}
