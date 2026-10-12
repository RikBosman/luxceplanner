import type { Floor } from "./schema";
import { rectangleCorners } from "./geometry";

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Omhullend kader van alle muren, kamers en meubels op een verdieping (inclusief muurdikte). */
export function floorBounds(floor: Floor): Bounds | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const add = (x: number, y: number, pad = 0) => {
    minX = Math.min(minX, x - pad); minY = Math.min(minY, y - pad);
    maxX = Math.max(maxX, x + pad); maxY = Math.max(maxY, y + pad);
  };
  for (const w of floor.walls) {
    add(w.start.x, w.start.y, w.thickness / 2);
    add(w.end.x, w.end.y, w.thickness / 2);
  }
  for (const r of floor.rooms) r.polygon.forEach((p) => add(p.x, p.y));
  for (const f of floor.furniture) rectangleCorners(f.position, f.width, f.depth, f.rotation).forEach((p) => add(p.x, p.y));
  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
}
