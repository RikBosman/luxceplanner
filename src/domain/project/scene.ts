/**
 * Zet een verdieping om naar een eenvoudige 3D-beschrijving (blokken en vlakken), los van Three.js.
 * Zo is te testen dat de 3D-weergave exact overeenkomt met de projectdata.
 *
 * Assen in 3D (meters): x = plan-x, y = hoogte, z = plan-y. Bovenaanzicht in 3D = de plattegrond.
 * Rotatie rond y: plan-rotatie θ (met de klok mee op het scherm) wordt -θ in 3D.
 */
import { getCatalogItem } from "./catalog";
import { furnitureParts } from "./furniture-parts";
import { polygonArea, wallLength } from "./geometry";
import type { Floor, Material, Point } from "./schema";

export const MM = 0.001;

export interface Box3 {
  /** Middelpunt in meters. */
  center: [number, number, number];
  /** Afmetingen in meters (lengte langs lokale x, hoogte, diepte langs lokale z). */
  size: [number, number, number];
  /** Rotatie rond de verticale as, in radialen. */
  rotationY: number;
  color: string;
  kind: "wall" | "furniture" | "door" | "window-glass" | "window-frame";
  sourceId: string;
  opacity?: number;
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
  const color = (id: string | undefined, fallback: string) => materials.find((m) => m.id === id)?.color ?? fallback;
  const toWorld = (p: Point): [number, number] => [p.x * MM, p.y * MM];

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

    const pushSegment = (a: number, b: number, y0: number, y1: number, kind: Box3["kind"] = "wall", c = wallColor, depth = wall.thickness, opacity?: number) => {
      if (b - a < 0.5 || y1 - y0 < 0.5) return;
      const mid = at((a + b) / 2);
      const [x, z] = toWorld(mid);
      boxes.push({
        center: [x, ((y0 + y1) / 2) * MM, z],
        size: [(b - a) * MM, (y1 - y0) * MM, depth * MM],
        rotationY,
        color: c,
        kind,
        sourceId: wall.id,
        ...(opacity !== undefined ? { opacity } : {}),
      });
    };

    let cursor = from;
    for (const { o, a, b } of holes) {
      if (a > cursor) pushSegment(cursor, a, 0, wall.height);
      const top = Math.min(wall.height, o.sillHeight + o.height);
      pushSegment(a, b, 0, o.sillHeight); // borstwering
      pushSegment(a, b, top, wall.height); // latei
      if (o.type === "window") {
        pushSegment(a, b, o.sillHeight, top, "window-glass", "#bcd3dc", 24, 0.35);
        pushSegment(a, b, o.sillHeight, o.sillHeight + 50, "window-frame", "#ffffff", wall.thickness * 0.6);
        pushSegment(a, b, top - 50, top, "window-frame", "#ffffff", wall.thickness * 0.6);
      } else {
        pushSegment(a, b, 0, top, "door", "#b89b72", 40);
      }
      cursor = Math.max(cursor, b);
    }
    pushSegment(cursor, to, 0, wall.height);
  }

  for (const f of floor.furniture) {
    if (!(f.width > 0 && f.depth > 0 && f.height > 0)) {
      warnings.push(`"${f.name}" heeft ongeldige afmetingen en is overgeslagen.`);
      continue;
    }
    const base = color(f.materialId, getCatalogItem(f.catalogId)?.color ?? "#b9a88f");
    const theta = (f.rotation * Math.PI) / 180;
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
  return { boxes, floors, bounds, warnings };
}
