/** Magnetisch uitlijnen: eerst aan bestaande muurpunten, dan aan haakse richtingen, dan aan het raster. */
import { distance, projectOntoWall, snapPoint } from "./geometry";
import type { Floor, Point, Wall } from "./schema";

export interface SnapOptions {
  gridSize: number;
  snapToGrid: boolean;
  /** Afstand (mm) waarbinnen aan een bestaand muurpunt wordt gesnapt. Meestal ~12 px omgerekend naar mm. */
  tolerance: number;
  /** Beginpunt van de muur die getekend wordt; maakt uitlijnen op 0°/90° mogelijk. */
  anchor?: Point;
  /** Muren die genegeerd worden (bijv. de muur die je zelf versleept). */
  ignoreWallIds?: readonly string[];
}

export interface SnapResult {
  point: Point;
  kind: "endpoint" | "wall" | "axis" | "grid" | "none";
}

export function snapWallPoint(raw: Point, floor: Floor, opts: SnapOptions): SnapResult {
  const ignore = new Set(opts.ignoreWallIds ?? []);
  let best: { p: Point; d: number } | null = null;
  for (const w of floor.walls) {
    if (ignore.has(w.id)) continue;
    for (const p of [w.start, w.end]) {
      const d = distance(p, raw);
      if (d <= opts.tolerance && (!best || d < best.d)) best = { p, d };
    }
  }
  if (best) return { point: { ...best.p }, kind: "endpoint" };

  if (opts.anchor) {
    // Bijna horizontaal of verticaal → recht trekken.
    const dx = raw.x - opts.anchor.x;
    const dy = raw.y - opts.anchor.y;
    const g = opts.snapToGrid ? opts.gridSize : 1;
    if (Math.abs(dy) <= opts.tolerance && Math.abs(dx) > opts.tolerance) {
      return { point: { x: opts.anchor.x + Math.round(dx / g) * g, y: opts.anchor.y }, kind: "axis" };
    }
    if (Math.abs(dx) <= opts.tolerance && Math.abs(dy) > opts.tolerance) {
      return { point: { x: opts.anchor.x, y: opts.anchor.y + Math.round(dy / g) * g }, kind: "axis" };
    }
  }

  for (const w of floor.walls) {
    if (ignore.has(w.id)) continue;
    const proj = projectOntoWall(w, raw);
    if (proj.distance <= opts.tolerance) return { point: proj.point, kind: "wall" };
  }

  if (opts.snapToGrid) return { point: snapPoint(raw, opts.gridSize), kind: "grid" };
  return { point: { ...raw }, kind: "none" };
}

/** Dichtstbijzijnde muur binnen `tolerance` mm van het punt (rekening houdend met de muurdikte). */
export function findWallNear(floor: Floor, p: Point, tolerance: number): Wall | null {
  let best: { w: Wall; d: number } | null = null;
  for (const w of floor.walls) {
    const d = projectOntoWall(w, p).distance - w.thickness / 2;
    if (d <= tolerance && (!best || d < best.d)) best = { w, d };
  }
  return best?.w ?? null;
}

/**
 * Schuift een meubel tegen een muur als de achterkant er binnen `tolerance` mm vandaan staat en het meubel
 * (vrijwel) evenwijdig aan de muur staat. Geeft de aangepaste positie terug, of de originele.
 */
export function snapFurnitureToWalls(
  floor: Floor,
  item: { position: Point; rotation: number; width: number; depth: number },
  tolerance: number,
): Point {
  let best: { pos: Point; gap: number } | null = null;
  const rad = (item.rotation * Math.PI) / 180;
  for (const w of floor.walls) {
    const len = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
    if (len === 0) continue;
    const ux = (w.end.x - w.start.x) / len;
    const uy = (w.end.y - w.start.y) / len;
    // Evenwijdig? (lokale x-as van het meubel langs de muur)
    const parallel = Math.abs(Math.cos(rad) * uy - Math.sin(rad) * ux) < 0.02;
    const perpendicular = Math.abs(Math.cos(rad) * ux + Math.sin(rad) * uy) < 0.02;
    if (!parallel && !perpendicular) continue;
    const halfAcross = parallel ? item.depth / 2 : item.width / 2;
    const halfAlong = parallel ? item.width / 2 : item.depth / 2;
    const nx = -uy;
    const ny = ux;
    const rx = item.position.x - w.start.x;
    const ry = item.position.y - w.start.y;
    const along = rx * ux + ry * uy;
    if (along < -halfAlong || along > len + halfAlong) continue; // niet ter hoogte van deze muur
    const signed = rx * nx + ry * ny;
    const side = signed >= 0 ? 1 : -1;
    const target = side * (w.thickness / 2 + halfAcross);
    const gap = Math.abs(signed - target);
    if (gap <= tolerance && (!best || gap < best.gap)) {
      const shift = target - signed;
      best = { pos: { x: item.position.x + nx * shift, y: item.position.y + ny * shift }, gap };
    }
  }
  return best?.pos ?? item.position;
}
