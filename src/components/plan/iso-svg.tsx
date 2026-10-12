/**
 * Eenvoudige isometrische voorvertoning (SVG) op basis van dezelfde projectdata als de plattegrond.
 * Dit is een lichtgewicht illustratie voor de website en het dashboard; de interactieve 3D-weergave
 * in de ontwerpstudio wordt met WebGL gebouwd.
 */
import { getCatalogItem, rectangleCorners, wallAngle, wallLength, type Floor, type Material, type Point } from "@/domain/project";

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

function project(p: Point, z: number) {
  return { x: (p.x - p.y) * COS30, y: (p.x + p.y) * SIN30 - z };
}

function shade(hex: string, factor: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * factor)));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

interface Face { points: string; fill: string; depth: number }

function boxFaces(corners: Point[], z0: number, z1: number, color: string, depthBias = 0): Face[] {
  const faces: Face[] = [];
  const center = corners.reduce((a, c) => ({ x: a.x + c.x / corners.length, y: a.y + c.y / corners.length }), { x: 0, y: 0 });
  const pts = (ps: { x: number; y: number }[]) => ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i]!;
    const b = corners[(i + 1) % corners.length]!;
    // Buitenwaartse normaal van de zijde; zichtbaar als die naar de kijker (+x, +y) wijst.
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const nx = mid.x - center.x;
    const ny = mid.y - center.y;
    if (nx + ny <= 0) continue;
    const light = nx > ny ? 0.82 : 0.68;
    faces.push({
      points: pts([project(a, z0), project(b, z0), project(b, z1), project(a, z1)]),
      fill: shade(color, light),
      depth: center.x + center.y + depthBias,
    });
  }
  faces.push({ points: pts(corners.map((c) => project(c, z1))), fill: shade(color, 1), depth: center.x + center.y + depthBias + 0.1 });
  return faces;
}

export function IsoSvg({
  floor,
  materials,
  className,
  title,
  cutawayHeight = 350,
}: {
  floor: Floor;
  materials: readonly Material[];
  className?: string;
  title?: string;
  cutawayHeight?: number;
}) {
  const color = (id: string | undefined, fallback: string) => materials.find((m) => m.id === id)?.color ?? fallback;
  const all = floor.walls.flatMap((w) => [w.start, w.end]);
  if (all.length === 0) return null;
  const cx = all.reduce((s, p) => s + p.x, 0) / all.length;
  const cy = all.reduce((s, p) => s + p.y, 0) / all.length;

  const faces: Face[] = [];
  for (const w of floor.walls) {
    const mid = { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 };
    // Muren aan de kijkerskant worden laag afgesneden, zodat je in de kamer kijkt.
    const front = mid.x - cx + (mid.y - cy) > 1;
    const h = front ? Math.min(cutawayHeight, w.height) : w.height;
    const corners = rectangleCorners(mid, wallLength(w) + w.thickness, w.thickness, wallAngle(w));
    faces.push(...boxFaces(corners, 0, h, color(w.materialId, "#f3efe7"), front ? 1e6 : -1e6));
  }
  for (const f of floor.furniture) {
    const corners = rectangleCorners(f.position, f.width, f.depth, f.rotation);
    faces.push(...boxFaces(corners, f.elevation, f.elevation + f.height, getCatalogItem(f.catalogId)?.color ?? "#b9a88f"));
  }
  faces.sort((a, b) => a.depth - b.depth);

  const floorPolys = floor.rooms.map((r) => ({
    id: r.id,
    points: r.polygon.map((p) => project(p, 0)),
    fill: color(r.floorMaterialId, "#d9c7a7"),
  }));

  const windows = floor.openings.flatMap((o) => {
    const wall = floor.walls.find((w) => w.id === o.wallId);
    if (!wall || o.type !== "window") return [];
    const mid = { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 };
    if (mid.x - cx + (mid.y - cy) > 1) return [];
    const len = wallLength(wall);
    const ux = (wall.end.x - wall.start.x) / len;
    const uy = (wall.end.y - wall.start.y) / len;
    // Venster op het binnenoppervlak van de muur.
    const inward = { x: cx - mid.x, y: cy - mid.y };
    const nlen = Math.hypot(inward.x, inward.y) || 1;
    const off = wall.thickness / 2 + 2;
    const base = { x: wall.start.x + ux * o.offset + (inward.x / nlen) * off, y: wall.start.y + uy * o.offset + (inward.y / nlen) * off };
    const a = { x: base.x - (ux * o.width) / 2, y: base.y - (uy * o.width) / 2 };
    const b = { x: base.x + (ux * o.width) / 2, y: base.y + (uy * o.width) / 2 };
    const ps = [project(a, o.sillHeight), project(b, o.sillHeight), project(b, o.sillHeight + o.height), project(a, o.sillHeight + o.height)];
    return [{ id: o.id, points: ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") }];
  });

  const projected = [...all.map((p) => project(p, 0)), ...all.map((p) => project(p, 2600))];
  const minX = Math.min(...projected.map((p) => p.x)) - 300;
  const maxX = Math.max(...projected.map((p) => p.x)) + 300;
  const minY = Math.min(...projected.map((p) => p.y)) - 300;
  const maxY = Math.max(...projected.map((p) => p.y)) + 300;

  const backFaces = faces.filter((f) => f.depth < -1e5);
  const otherFaces = faces.filter((f) => f.depth >= -1e5);

  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className={className} role="img" aria-label={title ?? "3D-voorvertoning"}>
      {title && <title>{title}</title>}
      {floorPolys.map((p) => (
        <polygon key={p.id} points={p.points.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ")} fill={p.fill} />
      ))}
      {backFaces.map((f, i) => <polygon key={`b${i}`} points={f.points} fill={f.fill} stroke="rgba(63,55,46,.25)" strokeWidth={6} strokeLinejoin="round" />)}
      {windows.map((w) => <polygon key={w.id} points={w.points} fill="#dfe9ef" stroke="#9fb3bd" strokeWidth={10} />)}
      {otherFaces.map((f, i) => <polygon key={`f${i}`} points={f.points} fill={f.fill} stroke="rgba(63,55,46,.25)" strokeWidth={6} strokeLinejoin="round" />)}
    </svg>
  );
}
