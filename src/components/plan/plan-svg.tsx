/**
 * Statische 2D-weergave van een verdieping als SVG, rechtstreeks berekend uit de projectdata.
 * Gebruikt voor miniaturen en voorbeelden; de interactieve editor gebruikt dezelfde data.
 */
import { floorBounds, pointAlongWall, wallAngle, type Floor, type Material } from "@/domain/project";
import { furnitureSymbol } from "./furniture-symbol";

export function PlanSvg({
  floor,
  materials,
  className,
  title,
  padding = 400,
}: {
  floor: Floor;
  materials: readonly Material[];
  className?: string;
  title?: string;
  padding?: number;
}) {
  const b = floorBounds(floor);
  if (!b) {
    return (
      <svg viewBox="0 0 100 60" className={className} role="img" aria-label={title ?? "Lege plattegrond"}>
        <text x="50" y="32" textAnchor="middle" fontSize="6" className="fill-sand-500">
          Nog leeg
        </text>
      </svg>
    );
  }
  const color = (id?: string, fallback = "#e8e1d6") => materials.find((m) => m.id === id)?.color ?? fallback;
  const vb = [b.minX - padding, b.minY - padding, b.maxX - b.minX + 2 * padding, b.maxY - b.minY + 2 * padding];

  return (
    <svg viewBox={vb.join(" ")} className={className} role="img" aria-label={title ?? "Plattegrond"}>
      {title && <title>{title}</title>}
      {floor.rooms.map((r) => (
        <polygon key={r.id} points={r.polygon.map((p) => `${p.x},${p.y}`).join(" ")} fill={color(r.floorMaterialId)} opacity={0.55} />
      ))}
      {floor.walls.map((w) => (
        <line
          key={w.id}
          x1={w.start.x} y1={w.start.y} x2={w.end.x} y2={w.end.y}
          stroke="#3f372e" strokeWidth={w.thickness} strokeLinecap="square"
        />
      ))}
      {floor.openings.map((o) => {
        const wall = floor.walls.find((w) => w.id === o.wallId);
        if (!wall) return null;
        const c = pointAlongWall(wall, o.offset);
        const angle = wallAngle(wall);
        const t = wall.thickness;
        const half = o.width / 2;
        const side = o.flipped ? -1 : 1;
        const hinge = o.swing === "left" ? -half : half;
        return (
          <g key={o.id} transform={`translate(${c.x} ${c.y}) rotate(${angle})`}>
            <rect x={-half} y={-t / 2 - 5} width={o.width} height={t + 10} fill="#fbf9f6" />
            {o.type === "window" ? (
              <g stroke="#5f7f4b" strokeWidth={18} fill="none">
                <rect x={-half} y={-t / 2} width={o.width} height={t} />
                <line x1={-half} y1={0} x2={half} y2={0} />
              </g>
            ) : (
              <g stroke="#5e5143" strokeWidth={16} fill="none">
                <line x1={hinge} y1={(side * t) / 2} x2={hinge} y2={side * (t / 2 + o.width)} />
                <path
                  d={`M ${hinge} ${side * (t / 2 + o.width)} A ${o.width} ${o.width} 0 0 ${(hinge < 0) === (side > 0) ? 0 : 1} ${-hinge} ${(side * t) / 2}`}
                  strokeDasharray="40 30"
                  strokeWidth={10}
                />
              </g>
            )}
          </g>
        );
      })}
      {floor.furniture.map((f) => (
        <g key={f.id} transform={`translate(${f.position.x} ${f.position.y}) rotate(${f.rotation})`}>
          {furnitureSymbol(f.kind, f.width, f.depth)}
        </g>
      ))}
    </svg>
  );
}
