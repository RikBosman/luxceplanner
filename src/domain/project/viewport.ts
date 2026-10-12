/**
 * Omrekening tussen wereldcoördinaten (mm) en schermcoördinaten (pixels).
 *
 * screen = (world - origin) * scale   →   world = screen / scale + origin
 * `origin` is het wereldpunt dat linksboven in beeld staat; `scale` is pixels per millimeter.
 */
import type { Point } from "./schema";

export interface Viewport {
  /** Wereldpunt (mm) linksboven in beeld. */
  origin: Point;
  /** Pixels per millimeter. */
  scale: number;
}

export const MIN_SCALE = 0.005; // 1 px = 200 mm
export const MAX_SCALE = 2; // 2 px = 1 mm

export function worldToScreen(vp: Viewport, p: Point): Point {
  return { x: (p.x - vp.origin.x) * vp.scale, y: (p.y - vp.origin.y) * vp.scale };
}

export function screenToWorld(vp: Viewport, p: Point): Point {
  return { x: p.x / vp.scale + vp.origin.x, y: p.y / vp.scale + vp.origin.y };
}

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** Zoomt rond een vast schermpunt (bijv. de muiscursor): dat punt blijft op dezelfde plek in beeld. */
export function zoomAt(vp: Viewport, screenPoint: Point, factor: number): Viewport {
  const scale = clampScale(vp.scale * factor);
  const anchor = screenToWorld(vp, screenPoint);
  return { scale, origin: { x: anchor.x - screenPoint.x / scale, y: anchor.y - screenPoint.y / scale } };
}

/** Verschuift het beeld met een aantal pixels. */
export function panBy(vp: Viewport, dxPx: number, dyPx: number): Viewport {
  return { ...vp, origin: { x: vp.origin.x - dxPx / vp.scale, y: vp.origin.y - dyPx / vp.scale } };
}

/** Kiest een viewport zodat het gegeven wereldkader met marge in een scherm van width×height past. */
export function fitBounds(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  width: number,
  height: number,
  paddingPx = 40,
): Viewport {
  const w = Math.max(bounds.maxX - bounds.minX, 1);
  const h = Math.max(bounds.maxY - bounds.minY, 1);
  const scale = clampScale(Math.min((width - 2 * paddingPx) / w, (height - 2 * paddingPx) / h));
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  return { scale, origin: { x: cx - width / 2 / scale, y: cy - height / 2 / scale } };
}
