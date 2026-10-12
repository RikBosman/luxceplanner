/**
 * Isometrische 3D-voorvertoning (SVG) voor de website en het dashboard, berekend uit dezelfde 3D-scène als de
 * interactieve weergave (buildScene): muren met echte openingen, vloer met planken en gedetailleerde meubels.
 * Rendert op de server, zonder WebGL en zonder JavaScript in de browser.
 */
import { useId } from "react";
import { buildScene, rectangleCorners, shadeHex, type Box3, type Floor, type Material, type Point } from "@/domain/project";

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;
/** Hoogte (mm) waarop muren aan de kijkerskant worden afgesneden, zodat je in de kamer kijkt. */
const CUTAWAY = 380;

/** Plattegrondpunt (mm) + hoogte (mm) → schermpunt. De kijker staat aan de kant van +x/+y. */
function project(p: Point, z: number) {
  return { x: (p.x - p.y) * COS30, y: (p.x + p.y) * SIN30 - z };
}
const pts = (ps: { x: number; y: number }[]) => ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

interface Prism {
  corners: Point[]; // voetafdruk in mm (plattegrond)
  y0: number;
  y1: number;
  color: string;
  opacity?: number;
}

function toPrism(b: Box3, y0Override?: number, y1Override?: number): Prism {
  const center = { x: b.center[0] * 1000, y: b.center[2] * 1000 };
  const thetaDeg = (-b.rotationY * 180) / Math.PI;
  const y0 = y0Override ?? (b.center[1] - b.size[1] / 2) * 1000;
  const y1 = y1Override ?? (b.center[1] + b.size[1] / 2) * 1000;
  return {
    corners: rectangleCorners(center, b.size[0] * 1000, b.size[2] * 1000, thetaDeg),
    y0,
    y1,
    color: b.color,
    opacity: b.opacity,
  };
}

/** Licht van linksboven-achter: zijvlakken krijgen verschillende tinten, bovenvlakken zijn het lichtst. */
function faceShade(nx: number, ny: number) {
  const len = Math.hypot(nx, ny) || 1;
  const lx = 0.35;
  const ly = -0.94;
  const dot = (nx / len) * lx + (ny / len) * ly;
  return 0.84 + 0.13 * dot;
}

function prismPolygons(p: Prism, key: string) {
  const cx = p.corners.reduce((s, c) => s + c.x, 0) / p.corners.length;
  const cy = p.corners.reduce((s, c) => s + c.y, 0) / p.corners.length;
  const out: { key: string; points: string; fill: string; stroke: string; opacity?: number }[] = [];
  for (let i = 0; i < p.corners.length; i++) {
    const a = p.corners[i]!;
    const b = p.corners[(i + 1) % p.corners.length]!;
    const nx = (a.x + b.x) / 2 - cx;
    const ny = (a.y + b.y) / 2 - cy;
    if (nx + ny <= 1e-6) continue; // afgewend van de kijker
    const fill = shadeHex(p.color, faceShade(nx, ny));
    out.push({ key: `${key}-s${i}`, points: pts([project(a, p.y0), project(b, p.y0), project(b, p.y1), project(a, p.y1)]), fill, stroke: shadeHex(p.color, 0.62), opacity: p.opacity });
  }
  const topFill = shadeHex(p.color, 1.04);
  out.push({ key: `${key}-t`, points: pts(p.corners.map((c) => project(c, p.y1))), fill: topFill, stroke: shadeHex(p.color, 0.7), opacity: p.opacity });
  return out;
}

/**
 * Tekenvolgorde van de onderdelen van één meubel. Alle onderdelen hebben dezelfde draaiing, dus in het lokale
 * assenstelsel zijn ze uitgelijnde blokken: als ze langs een as gescheiden zijn, gaat het verste eerst.
 */
function sortParts(parts: Box3[], rotationY: number): Box3[] {
  const c = Math.cos(rotationY);
  const s = Math.sin(rotationY);
  // Kijkrichting (naar de kijker toe) in plan = (1, 1); in lokale coördinaten:
  const vx = c * 1 - s * 1;
  const vz = s * 1 + c * 1;
  const local = parts.map((b) => {
    // Wereld → lokaal (inverse rotatie rond y)
    const lx = b.center[0] * c - b.center[2] * s;
    const lz = b.center[0] * s + b.center[2] * c;
    return { b, x0: lx - b.size[0] / 2, x1: lx + b.size[0] / 2, z0: lz - b.size[2] / 2, z1: lz + b.size[2] / 2, y0: b.center[1] - b.size[1] / 2, y1: b.center[1] + b.size[1] / 2, depth: lx * vx + lz * vz };
  });
  const eps = 1e-6;
  const behind = (a: (typeof local)[number], b: (typeof local)[number]) =>
    a.y1 <= b.y0 + eps ||
    (vx > 0 ? a.x1 <= b.x0 + eps : a.x0 >= b.x1 - eps) ||
    (vz > 0 ? a.z1 <= b.z0 + eps : a.z0 >= b.z1 - eps);
  // Topologisch sorteren (Kahn); bij twijfel op diepte.
  const n = local.length;
  const indeg = new Array<number>(n).fill(0);
  const edges: number[][] = local.map(() => []);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      if (behind(local[i]!, local[j]!) && !behind(local[j]!, local[i]!)) {
        edges[i]!.push(j);
        indeg[j]! += 1;
      }
    }
  const order: number[] = [];
  const ready = local.map((_, i) => i).filter((i) => indeg[i] === 0);
  const done = new Set<number>();
  while (order.length < n) {
    if (ready.length === 0) {
      // Cyclus (overlappende blokken): kies het verste resterende blok.
      const rest = local.map((_, i) => i).filter((i) => !done.has(i)).sort((a, b) => local[a]!.depth - local[b]!.depth);
      ready.push(rest[0]!);
    }
    ready.sort((a, b) => local[a]!.y0 - local[b]!.y0 || local[a]!.depth - local[b]!.depth);
    const i = ready.shift()!;
    if (done.has(i)) continue;
    done.add(i);
    order.push(i);
    for (const j of edges[i]!) {
      indeg[j]! -= 1;
      if (indeg[j] === 0 && !done.has(j)) ready.push(j);
    }
  }
  return order.map((i) => local[i]!.b);
}

export function IsoSvg({ floor, materials, className, title }: { floor: Floor; materials: readonly Material[]; className?: string; title?: string }) {
  const uid = useId().replace(/:/g, "");
  const scene = buildScene(floor, materials);
  if (floor.walls.length === 0 || !scene.bounds) return null;

  const all = floor.walls.flatMap((w) => [w.start, w.end]);
  const cx = all.reduce((s, p) => s + p.x, 0) / all.length;
  const cy = all.reduce((s, p) => s + p.y, 0) / all.length;
  const isFront = (b: Box3) => b.center[0] * 1000 - cx + (b.center[2] * 1000 - cy) > 1;

  // Muren: achterste eerst, voorste (laag afgesneden) als laatste.
  const wallBoxes = scene.boxes.filter((b) => b.kind !== "furniture");
  const backWalls = wallBoxes.filter((b) => !isFront(b)).map((b) => toPrism(b));
  const frontWalls = wallBoxes
    .filter(isFront)
    .flatMap((b) => {
      const y0 = (b.center[1] - b.size[1] / 2) * 1000;
      if (y0 >= CUTAWAY) return [];
      return [toPrism(b, y0, Math.min(CUTAWAY, (b.center[1] + b.size[1] / 2) * 1000))];
    });
  const depthOf = (p: Prism) => p.corners.reduce((s, c) => s + c.x + c.y, 0) / p.corners.length;
  backWalls.sort((a, b) => depthOf(a) - depthOf(b) || a.y0 - b.y0);
  frontWalls.sort((a, b) => depthOf(a) - depthOf(b));

  // Meubels: per meubel op diepte, binnen een meubel op lokale ligging.
  const furniture = floor.furniture
    .map((f) => ({ f, parts: scene.boxes.filter((b) => b.sourceId === f.id) }))
    .filter((x) => x.parts.length > 0)
    .sort((a, b) => a.f.position.x + a.f.position.y - (b.f.position.x + b.f.position.y));

  // Vloeren met planken (lijnen langs x, om de 180 mm), geknipt op de kamer.
  const floors = floor.rooms.map((r) => {
    const color = materials.find((m) => m.id === r.floorMaterialId)?.color ?? "#c9a679";
    const ys = r.polygon.map((p) => p.y);
    const xs = r.polygon.map((p) => p.x);
    const lines: string[] = [];
    for (let y = Math.min(...ys) + 180; y < Math.max(...ys); y += 180) {
      const a = project({ x: Math.min(...xs), y }, 0);
      const b = project({ x: Math.max(...xs), y }, 0);
      lines.push(`M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`);
    }
    return { id: r.id, points: pts(r.polygon.map((p) => project(p, 0))), color, lines: lines.join("") };
  });

  // Zachte schaduwen onder meubels.
  const shadows = floor.furniture.map((f) => ({
    id: f.id,
    points: pts(rectangleCorners({ x: f.position.x + 40, y: f.position.y + 60 }, f.width + 60, f.depth + 60, f.rotation).map((c) => project(c, 0))),
  }));

  const projected = [...all.map((p) => project(p, 0)), ...all.map((p) => project(p, 2800))];
  const minX = Math.min(...projected.map((p) => p.x)) - 260;
  const maxX = Math.max(...projected.map((p) => p.x)) + 260;
  const minY = Math.min(...projected.map((p) => p.y)) - 200;
  const maxY = Math.max(...projected.map((p) => p.y)) + 320;

  const render = (p: Prism, key: string) =>
    prismPolygons(p, key).map((poly) => (
      <polygon key={poly.key} points={poly.points} fill={poly.fill} stroke={poly.stroke} strokeWidth={4} strokeLinejoin="round" strokeOpacity={0.55} fillOpacity={poly.opacity ?? 1} />
    ));

  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className={className} role="img" aria-label={title ?? "3D-voorvertoning"}>
      {title && <title>{title}</title>}
      <defs>
        <filter id={`zacht-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="55" />
        </filter>
        <radialGradient id={`licht-${uid}`} cx="35%" cy="25%" r="80%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.12" />
        </radialGradient>
        {floors.map((fl) => (
          <clipPath key={fl.id} id={`vloer-${uid}-${fl.id}`}>
            <polygon points={fl.points} />
          </clipPath>
        ))}
      </defs>

      {/* Grondschaduw onder de hele ruimte */}
      <ellipse cx={(minX + maxX) / 2} cy={maxY - 240} rx={(maxX - minX) * 0.42} ry={170} fill="#0d0b0a" opacity={0.12} filter={`url(#zacht-${uid})`} />

      {floors.map((fl) => (
        <g key={fl.id}>
          <polygon points={fl.points} fill={fl.color} />
          <path d={fl.lines} stroke={shadeHex(fl.color, 0.82)} strokeWidth={5} clipPath={`url(#vloer-${uid}-${fl.id})`} />
          <polygon points={fl.points} fill={`url(#licht-${uid})`} />
        </g>
      ))}

      <g filter={`url(#zacht-${uid})`} opacity={0.32}>
        {shadows.map((s) => <polygon key={s.id} points={s.points} fill="#2a2016" />)}
      </g>

      {backWalls.map((p, i) => render(p, `bw${i}`))}
      {furniture.map(({ f, parts }) => (
        <g key={f.id}>{sortParts(parts, parts[0]!.rotationY).map((b, i) => render(toPrism(b), `${f.id}-${i}`))}</g>
      ))}
      {frontWalls.map((p, i) => render(p, `fw${i}`))}
    </svg>
  );
}
