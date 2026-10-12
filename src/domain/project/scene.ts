/**
 * Zet een verdieping om naar een eenvoudige 3D-beschrijving (blokken en vlakken), los van Three.js.
 * Zo is te testen dat de 3D-weergave exact overeenkomt met de projectdata.
 *
 * Assen in 3D (meters): x = plan-x, y = hoogte, z = plan-y. Bovenaanzicht in 3D = de plattegrond.
 * Rotatie rond y: plan-rotatie θ (met de klok mee op het scherm) wordt -θ in 3D.
 */
import { getCatalogItem } from "./catalog";
import { furnitureParts, type PartFinish, type PartShape } from "./furniture-parts";
import { polygonArea, wallLength } from "./geometry";
import type { Floor, Material, Point } from "./schema";

export const MM = 0.001;

const SKIRTING_H = 90;
const CROWN_H = 60;
const TRIM_COLOR = "#f1ede6";
const WINDOW_FRAME = "#f4f1eb";
const DOOR_COLOR = "#ece6dc";

export interface Box3 {
  /** Middelpunt in meters. */
  center: [number, number, number];
  /** Afmetingen in meters (lengte langs lokale x, hoogte, diepte langs lokale z). */
  size: [number, number, number];
  /** Rotatie rond de verticale as, in radialen. */
  rotationY: number;
  color: string;
  kind: "wall" | "furniture" | "door" | "window-glass" | "window-frame" | "trim";
  sourceId: string;
  opacity?: number;
  /** Vorm (standaard blok). */
  shape?: PartShape;
  /** Afrondingsstraal in meters (voor "rounded"). */
  radius?: number;
  /** Verhouding boven/onder voor cilinders. */
  taper?: number;
  /** Materiaalsoort voor glans en ruwheid. */
  finish?: PartFinish | "plaster";
}

export interface FloorSurface {
  id: string;
  /** Hoekpunten in meters, als [x, z]. */
  polygon: [number, number][];
  color: string;
}

export interface Scene3D {
  boxes: Box3[];
  floors: FloorSurface[];
  bounds: { min: [number, number, number]; max: [number, number, number] } | null;
  /** Realistische 3D-modellen voor meubels (de blokken met dezelfde sourceId zijn de terugvalvorm). */
  models: { url: string; sourceId: string; position: [number, number, number]; rotationY: number; size: [number, number, number] }[];
  /** Ramen (m): middelpunt, normaal naar binnen, breedte en hoogte — voor daglicht in renders. */
  windows: { center: [number, number, number]; inward: [number, number]; width: number; height: number }[];
  /** Plafondhoogte (m): hoogste muur. Alleen gebruikt bij weergaven van binnenuit. */
  ceilingHeight: number;
  /** Posities (m) van lichtbronnen, zoals de kap van een staande lamp. */
  lights: [number, number, number][];
  warnings: string[];
}

export function shadeHex(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return `#${[c(16), c(8), c(0)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function buildScene(floor: Floor, materials: readonly Material[]): Scene3D {
  const warnings: string[] = [];
  const boxes: Box3[] = [];
  const windows: Scene3D["windows"] = [];
  const models: Scene3D["models"] = [];
  const color = (id: string | undefined, fallback: string) => materials.find((m) => m.id === id)?.color ?? fallback;
  const toWorld = (p: Point): [number, number] => [p.x * MM, p.y * MM];
  const ends = floor.walls.flatMap((w) => [w.start, w.end]);
  const roomCenter = ends.length ? { x: ends.reduce((a, p) => a + p.x, 0) / ends.length, y: ends.reduce((a, p) => a + p.y, 0) / ends.length } : { x: 0, y: 0 };

  for (const wall of floor.walls) {
    const len = wallLength(wall);
    if (!(len >= 1) || !(wall.height > 0) || !(wall.thickness > 0)) {
      warnings.push("Een muur zonder geldige afmetingen is overgeslagen.");
      continue;
    }
    const ux = (wall.end.x - wall.start.x) / len;
    const uy = (wall.end.y - wall.start.y) / len;
    const rotationY = Math.atan2(-uy, ux);
    const wallColor = color(wall.materialId, "#f3efe7");
    const at = (along: number): Point => ({ x: wall.start.x + ux * along, y: wall.start.y + uy * along });
    // Muren lopen een halve dikte door voorbij hun eindpunten, zodat hoeken dicht zijn.
    const from = -wall.thickness / 2;
    const to = len + wall.thickness / 2;

    const holes = floor.openings
      .filter((o) => o.wallId === wall.id)
      .map((o) => ({ o, a: Math.max(0, o.offset - o.width / 2), b: Math.min(len, o.offset + o.width / 2) }))
      .filter((h) => h.b > h.a)
      .sort((p, q) => p.a - q.a);

    // Binnenkant van de muur: de kant van het midden van de plattegrond.
    const nx0 = -uy;
    const ny0 = ux;
    const midWall = at(len / 2);
    const inward = (roomCenter.x - midWall.x) * nx0 + (roomCenter.y - midWall.y) * ny0 >= 0 ? 1 : -1;
    const nx = nx0 * inward;
    const ny = ny0 * inward;
    const T = wall.thickness;

    /** Blok langs de muur van a tot b (mm langs de muur), hoogte y0..y1, diepte `depth`, verschoven `offset` naar binnen. */
    const pushSegment = (a: number, b: number, y0: number, y1: number, kind: Box3["kind"] = "wall", c = wallColor, depth = T, opacity?: number, offset = 0, finish?: Box3["finish"]) => {
      if (b - a < 0.5 || y1 - y0 < 0.5) return;
      const mid = at((a + b) / 2);
      const [x, z] = toWorld({ x: mid.x + nx * offset, y: mid.y + ny * offset });
      boxes.push({
        center: [x, ((y0 + y1) / 2) * MM, z],
        size: [(b - a) * MM, (y1 - y0) * MM, depth * MM],
        rotationY,
        color: c,
        kind,
        sourceId: wall.id,
        finish: finish ?? (kind === "wall" ? "plaster" : kind === "door" ? "lacquer" : kind === "window-glass" ? "glass" : "lacquer"),
        ...(opacity !== undefined ? { opacity } : {}),
      });
    };
    /** Muurdeel met plint (onderaan) en sierlijst (bovenaan) aan de binnenkant. */
    const solid = (a: number, b: number, y0: number, y1: number) => {
      pushSegment(a, b, y0, y1);
      const ta = Math.max(a, 0);
      const tb = Math.min(b, len);
      if (y0 === 0) pushSegment(ta, tb, 0, SKIRTING_H, "trim", TRIM_COLOR, 14, undefined, T / 2 + 7);
      if (y1 >= wall.height - 1) {
        pushSegment(ta, tb, wall.height - CROWN_H, wall.height, "trim", TRIM_COLOR, 34, undefined, T / 2 + 17);
        pushSegment(ta, tb, wall.height - CROWN_H - 30, wall.height - CROWN_H, "trim", TRIM_COLOR, 14, undefined, T / 2 + 7);
      }
    };

    let cursor = from;
    for (const { o, a, b } of holes) {
      if (a > cursor) solid(cursor, a, 0, wall.height);
      const top = Math.min(wall.height, o.sillHeight + o.height);
      solid(a, b, 0, o.sillHeight); // borstwering
      solid(a, b, top, wall.height); // latei
      const F = 45; // kozijnbreedte
      if (o.type === "window") {
        const wc = at((a + b) / 2);
        windows.push({ center: [wc.x * MM, ((o.sillHeight + top) / 2) * MM, wc.y * MM], inward: [nx, ny], width: (b - a) * MM, height: (top - o.sillHeight) * MM });
        pushSegment(a + F, b - F, o.sillHeight + F, top - F, "window-glass", "#cfe0e6", 12, 0.25);
        // Kozijn: stijlen, dorpel, bovendorpel en een middenstijl
        pushSegment(a, a + F, o.sillHeight, top, "window-frame", WINDOW_FRAME, T * 0.55);
        pushSegment(b - F, b, o.sillHeight, top, "window-frame", WINDOW_FRAME, T * 0.55);
        pushSegment(a, b, o.sillHeight, o.sillHeight + F, "window-frame", WINDOW_FRAME, T * 0.55);
        pushSegment(a, b, top - F, top, "window-frame", WINDOW_FRAME, T * 0.55);
        if (b - a > 900) pushSegment((a + b) / 2 - 20, (a + b) / 2 + 20, o.sillHeight + F, top - F, "window-frame", WINDOW_FRAME, T * 0.45);
        if (o.height > 1300) pushSegment(a + F, b - F, top - F - (o.height - 2 * F) * 0.28 - 15, top - F - (o.height - 2 * F) * 0.28 + 15, "window-frame", WINDOW_FRAME, T * 0.45);
        // Vensterbank aan de binnenkant
        if (o.sillHeight > 50) pushSegment(a - 40, b + 40, o.sillHeight - 25, o.sillHeight, "trim", TRIM_COLOR, 70, undefined, T / 2 + 20, "stone");
      } else {
        pushSegment(a, b, 0, top, "door", DOOR_COLOR, 40);
        // Kozijn (architraaf) aan de binnenkant en een messing klink
        pushSegment(a - 70, a, 0, top + 70, "trim", TRIM_COLOR, 18, undefined, T / 2 + 9);
        pushSegment(b, b + 70, 0, top + 70, "trim", TRIM_COLOR, 18, undefined, T / 2 + 9);
        pushSegment(a, b, top, top + 70, "trim", TRIM_COLOR, 18, undefined, T / 2 + 9);
        const handleAt = o.swing === "left" ? b - 90 : a + 90;
        pushSegment(handleAt - 60, handleAt + 60, 1030, 1050, "trim", "#c9a24a", 20, undefined, 30, "brass");
      }
      cursor = Math.max(cursor, b);
    }
    solid(cursor, to, 0, wall.height);
  }

  for (const f of floor.furniture) {
    if (!(f.width > 0 && f.depth > 0 && f.height > 0)) {
      warnings.push(`"${f.name}" heeft ongeldige afmetingen en is overgeslagen.`);
      continue;
    }
    const base = color(f.materialId, getCatalogItem(f.catalogId)?.color ?? "#b9a88f");
    const theta = (f.rotation * Math.PI) / 180;
    const model = getCatalogItem(f.catalogId)?.model;
    if (model) {
      models.push({ url: model.url, sourceId: f.id, position: [f.position.x * MM, f.elevation * MM, f.position.y * MM], rotationY: -theta, size: [f.width * MM, f.height * MM, f.depth * MM] });
    }
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    for (const part of furnitureParts(f.kind, f.width, f.depth, f.height)) {
      // Lokaal (x, z) draaien zoals in de plattegrond en verschuiven naar de positie.
      const px = f.position.x + part.x * cos - part.z * sin;
      const pz = f.position.y + part.x * sin + part.z * cos;
      boxes.push({
        center: [px * MM, (f.elevation + part.y) * MM, pz * MM],
        size: [part.sx * MM, part.sy * MM, part.sz * MM],
        rotationY: -theta,
        color: part.shade ? shadeHex(part.color ?? base, part.shade) : (part.color ?? base),
        kind: "furniture",
        sourceId: f.id,
        ...(part.shape && part.shape !== "box" ? { shape: part.shape } : {}),
        ...(part.radius ? { radius: part.radius * MM } : {}),
        ...(part.taper ? { taper: part.taper } : {}),
        ...(part.finish ? { finish: part.finish } : {}),
      });
    }
  }

  const floors: FloorSurface[] = [];
  for (const r of floor.rooms) {
    if (r.polygon.length < 3 || polygonArea(r.polygon) < 1) {
      warnings.push(`De vloer van "${r.name}" is ongeldig en is overgeslagen.`);
      continue;
    }
    floors.push({ id: r.id, polygon: r.polygon.map(toWorld), color: color(r.floorMaterialId, "#d9c7a7") });
  }

  let bounds: Scene3D["bounds"] = null;
  for (const b of boxes) {
    const r = Math.hypot(b.size[0], b.size[2]) / 2;
    const min: [number, number, number] = [b.center[0] - r, b.center[1] - b.size[1] / 2, b.center[2] - r];
    const max: [number, number, number] = [b.center[0] + r, b.center[1] + b.size[1] / 2, b.center[2] + r];
    bounds = bounds
      ? { min: [Math.min(bounds.min[0], min[0]), Math.min(bounds.min[1], min[1]), Math.min(bounds.min[2], min[2])], max: [Math.max(bounds.max[0], max[0]), Math.max(bounds.max[1], max[1]), Math.max(bounds.max[2], max[2])] }
      : { min, max };
  }
  const lights: [number, number, number][] = floor.furniture
    .filter((f) => f.kind === "floor-lamp" && f.height > 0)
    .map((f) => [f.position.x * MM, (f.elevation + f.height - Math.min(300, f.height * 0.2) - 40) * MM, f.position.y * MM]);
  const ceilingHeight = Math.max(0, ...floor.walls.map((w) => w.height)) * MM;
  return { boxes, floors, bounds, models, windows, ceilingHeight, lights, warnings };
}
