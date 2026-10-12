"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  addOpening,
  addWall,
  distance,
  findWallNear,
  formatArea,
  formatLength,
  MIN_WALL_LENGTH,
  moveFurniture,
  moveOpening,
  moveWallEndpoint,
  normalizeDegrees,
  pointAlongWall,
  polygonArea,
  screenToWorld,
  snapFurnitureToWalls,
  snapPoint,
  snapWallPoint,
  translateWall,
  updateFurniture,
  wallAngle,
  wallInnerLength,
  wallLength,
  zoomAt,
  type Floor,
  type Point,
  type Viewport,
  type Wall,
} from "@/domain/project";
import { furnitureSymbol } from "@/components/plan/furniture-symbol";
import type { EditorApi } from "./use-editor-state";

type Drag =
  | { kind: "pan"; startClient: Point; startOrigin: Point; moved: boolean }
  | { kind: "wall"; wallId: string; start: Point; moved: boolean }
  | { kind: "wall-end"; wallId: string; which: "start" | "end"; ignore: string[]; anchor: Point; moved: boolean }
  | { kind: "opening"; id: string; moved: boolean }
  | { kind: "furniture"; id: string; offset: Point; moved: boolean }
  | { kind: "rotate"; id: string; moved: boolean };

const SELECT = "#9a7428";

export function PlanCanvas({
  editor,
  viewport,
  onViewportChange,
  size,
}: {
  editor: EditorApi;
  viewport: Viewport;
  onViewportChange: (vp: Viewport) => void;
  size: { width: number; height: number };
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<Drag | null>(null);
  const [anchor, setAnchor] = useState<{ point: Point; first: Point } | null>(null);
  const [hover, setHover] = useState<Point | null>(null);
  const { doc, tool, selection } = editor;
  const floor = doc.floors[0]!;
  const floorId = floor.id;
  const px = 1 / viewport.scale; // 1 schermpixel in mm
  const settings = doc.settings;

  // Wiel = zoomen rond de cursor (niet-passieve listener om scrollen van de pagina te voorkomen).
  const vpRef = useRef(viewport);
  useEffect(() => {
    vpRef.current = viewport;
  }, [viewport]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
      onViewportChange(zoomAt(vpRef.current, { x: e.clientX - rect.left, y: e.clientY - rect.top }, factor));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [onViewportChange]);

  // Wisselen van gereedschap beëindigt een muurketen.
  const [anchorTool, setAnchorTool] = useState(tool);
  if (anchorTool !== tool) {
    setAnchorTool(tool);
    setAnchor(null);
  }
  const [panning, setPanning] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setAnchor(null);
      if (drag.current) {
        drag.current = null;
        editor.endPreview(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor]);

  const toWorld = (e: { clientX: number; clientY: number }): Point => {
    const rect = svgRef.current!.getBoundingClientRect();
    return screenToWorld(viewport, { x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const tolerance = 12 * px;

  const snapWall = (raw: Point, base: Floor, opts: { anchor?: Point; ignore?: string[]; noSnap: boolean }) =>
    opts.noSnap
      ? { point: raw, kind: "none" as const }
      : snapWallPoint(raw, base, { gridSize: settings.gridSize, snapToGrid: settings.snapToGrid, tolerance, anchor: opts.anchor, ignoreWallIds: opts.ignore });

  const startDrag = (e: ReactPointerEvent, d: Drag) => {
    e.stopPropagation();
    drag.current = d;
    if (d.kind === "pan") setPanning(true);
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerDownBackground = (e: ReactPointerEvent) => {
    if (e.button === 2) {
      setAnchor(null);
      return;
    }
    const world = toWorld(e);
    if (e.button === 1 || (tool === "select" && e.button === 0)) {
      if (tool === "select") editor.select(null);
      startDrag(e, { kind: "pan", startClient: { x: e.clientX, y: e.clientY }, startOrigin: viewport.origin, moved: false });
      return;
    }
    if (tool === "wall") {
      const p = snapWall(world, floor, { anchor: anchor?.point, noSnap: e.altKey }).point;
      if (!anchor) {
        setAnchor({ point: p, first: p });
        return;
      }
      if (distance(p, anchor.point) < MIN_WALL_LENGTH) return;
      const start = anchor.point;
      editor.apply((d) => {
        const r = addWall(d, floorId, start, p);
        return { doc: r.doc, selection: null };
      });
      const closed = distance(p, anchor.first) < 1;
      setAnchor(closed ? null : { point: p, first: anchor.first });
      return;
    }
    if (tool === "door" || tool === "window") {
      const wall = findWallNear(floor, world, tolerance);
      if (!wall) {
        editor.notify(`Klik op een muur om ${tool === "door" ? "een deur" : "een raam"} te plaatsen.`, "info");
        return;
      }
      editor.apply((d) => {
        const r = addOpening(d, floorId, wall.id, tool, world);
        return { doc: r.doc, selection: { kind: "opening", id: r.openingId } };
      });
      editor.setTool("select");
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const world = toWorld(e);
    const d = drag.current;
    if (!d) {
      if (tool === "wall") setHover(snapWall(world, floor, { anchor: anchor?.point, noSnap: e.altKey }).point);
      else if (hover) setHover(null);
      return;
    }
    d.moved = true;
    switch (d.kind) {
      case "pan":
        onViewportChange({
          ...viewport,
          origin: { x: d.startOrigin.x - (e.clientX - d.startClient.x) * px, y: d.startOrigin.y - (e.clientY - d.startClient.y) * px },
        });
        break;
      case "wall": {
        const step = settings.snapToGrid && !e.altKey ? settings.gridSize : 1;
        const dx = Math.round((world.x - d.start.x) / step) * step;
        const dy = Math.round((world.y - d.start.y) / step) * step;
        editor.preview((base) => translateWall(base, floorId, d.wallId, dx, dy));
        break;
      }
      case "wall-end":
        editor.preview((base) => {
          const p = snapWall(world, base.floors[0]!, { anchor: d.anchor, ignore: d.ignore, noSnap: e.altKey }).point;
          return moveWallEndpoint(base, floorId, d.wallId, d.which, p);
        });
        break;
      case "opening":
        editor.preview((base) => moveOpening(base, floorId, d.id, world));
        break;
      case "furniture":
        editor.preview((base) => {
          const item = base.floors[0]!.furniture.find((f) => f.id === d.id);
          if (!item) return base;
          let pos = { x: world.x - d.offset.x, y: world.y - d.offset.y };
          if (!e.altKey) {
            pos = snapPoint(pos, 10);
            pos = snapFurnitureToWalls(base.floors[0]!, { ...item, position: pos }, tolerance);
          }
          return moveFurniture(base, floorId, d.id, pos);
        });
        break;
      case "rotate":
        editor.preview((base) => {
          const item = base.floors[0]!.furniture.find((f) => f.id === d.id);
          if (!item) return base;
          let deg = (Math.atan2(world.y - item.position.y, world.x - item.position.x) * 180) / Math.PI + 90;
          if (!e.altKey) deg = Math.round(deg / 15) * 15;
          return updateFurniture(base, floorId, d.id, { rotation: normalizeDegrees(deg) });
        });
        break;
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const d = drag.current;
    drag.current = null;
    setPanning(false);
    if (svgRef.current?.hasPointerCapture(e.pointerId)) svgRef.current.releasePointerCapture(e.pointerId);
    if (!d || d.kind === "pan") return;
    editor.endPreview(d.moved);
  };

  const onDoubleClick = () => {
    if (tool === "wall") setAnchor(null);
  };

  const selectAnd = (e: ReactPointerEvent, sel: NonNullable<typeof selection>, d: Drag) => {
    if (tool !== "select" || e.button !== 0) return;
    editor.select(sel);
    startDrag(e, d);
  };

  const selectedWall = selection?.kind === "wall" && tool === "select" ? floor.walls.find((x) => x.id === selection.id) : undefined;
  const selectedFurniture = selection?.kind === "furniture" ? floor.furniture.find((x) => x.id === selection.id) : undefined;
  const onWallHandleDown = (e: ReactPointerEvent, which: "start" | "end") => {
    if (!selectedWall) return;
    startDrag(e, {
      kind: "wall-end",
      wallId: selectedWall.id,
      which,
      ignore: connectedAt(selectedWall[which]),
      anchor: which === "start" ? selectedWall.end : selectedWall.start,
      moved: false,
    });
  };

  const connectedAt = (p: Point) => floor.walls.filter((w) => distance(w.start, p) < 0.5 || distance(w.end, p) < 0.5).map((w) => w.id);

  const vbW = size.width * px;
  const vbH = size.height * px;
  const fontSize = 12 * px;
  const cursor = tool === "select" ? (panning ? "grabbing" : "default") : "crosshair";

  return (
    <svg
      ref={svgRef}
      role="application"
      aria-label="Plattegrond-editor. Gebruik het eigenschappenpaneel en de elementenlijst om met het toetsenbord te bewerken."
      data-testid="plan-canvas"
      className="block h-full w-full touch-none select-none bg-[#fbfaf7]"
      style={{ cursor }}
      viewBox={`${viewport.origin.x} ${viewport.origin.y} ${vbW} ${vbH}`}
      onPointerDown={onPointerDownBackground}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => setHover(null)}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Grid viewport={viewport} width={vbW} height={vbH} gridSize={settings.gridSize} />

      {floor.rooms.map((r) => {
        const c = r.polygon.reduce((a, p) => ({ x: a.x + p.x / r.polygon.length, y: a.y + p.y / r.polygon.length }), { x: 0, y: 0 });
        const color = doc.materials.find((m) => m.id === r.floorMaterialId)?.color ?? "#e8dcc8";
        return (
          <g key={r.id}>
            <polygon
              points={r.polygon.map((p) => `${p.x},${p.y}`).join(" ")}
              fill={color}
              opacity={0.35}
              stroke={selection?.id === r.id ? SELECT : "none"}
              strokeWidth={2 * px}
              onPointerDown={(e) => {
                if (tool !== "select" || e.button !== 0) return;
                // Klikken in een kamer selecteert de kamer; slepen verschuift het beeld.
                editor.select({ kind: "room", id: r.id });
                startDrag(e, { kind: "pan", startClient: { x: e.clientX, y: e.clientY }, startOrigin: viewport.origin, moved: false });
              }}
            />
            <text x={c.x} y={c.y} fontSize={fontSize * 1.1} textAnchor="middle" fill="#7d6c58" pointerEvents="none">
              <tspan x={c.x} dy={0}>{r.name}</tspan>
              <tspan x={c.x} dy={fontSize * 1.4} fontSize={fontSize}>{formatArea(polygonArea(r.polygon))}</tspan>
            </text>
          </g>
        );
      })}

      {floor.walls.map((w) => (
        <line key={w.id} x1={w.start.x} y1={w.start.y} x2={w.end.x} y2={w.end.y} stroke={selection?.id === w.id ? "#7a5b1e" : "#3f372e"} strokeWidth={w.thickness} strokeLinecap="square" />
      ))}

      {floor.openings.map((o) => {
        const wall = floor.walls.find((w) => w.id === o.wallId);
        if (!wall) return null;
        const c = pointAlongWall(wall, o.offset);
        const t = wall.thickness;
        const half = o.width / 2;
        const side = o.flipped ? -1 : 1;
        const hinge = o.swing === "left" ? -half : half;
        const selected = selection?.id === o.id;
        return (
          <g
            key={o.id}
            data-testid={`opening-${o.type}`}
            transform={`translate(${c.x} ${c.y}) rotate(${wallAngle(wall)})`}
            onPointerDown={(e) => selectAnd(e, { kind: "opening", id: o.id }, { kind: "opening", id: o.id, moved: false })}
            style={{ cursor: tool === "select" ? "ew-resize" : undefined }}
          >
            <rect x={-half} y={-t / 2 - 2 * px} width={o.width} height={t + 4 * px} fill="#fbfaf7" />
            {o.type === "window" ? (
              <g stroke={selected ? SELECT : "#8a8f92"} strokeWidth={2 * px} fill="#e6eef0">
                <rect x={-half} y={-t / 2} width={o.width} height={t} />
                <line x1={-half} y1={0} x2={half} y2={0} />
              </g>
            ) : (
              <g stroke={selected ? SELECT : "#5e5143"} strokeWidth={2 * px} fill="none">
                <line x1={hinge} y1={(side * t) / 2} x2={hinge} y2={side * (t / 2 + o.width)} />
                <path
                  d={`M ${hinge} ${side * (t / 2 + o.width)} A ${o.width} ${o.width} 0 0 ${(hinge < 0) === (side > 0) ? 0 : 1} ${-hinge} ${(side * t) / 2}`}
                  strokeDasharray={`${6 * px} ${4 * px}`}
                />
              </g>
            )}
            {/* Ruim klikgebied */}
            <rect x={-half} y={-Math.max(t, 16 * px) / 2} width={o.width} height={Math.max(t, 16 * px)} fill="transparent" />
            {selected && <rect x={-half} y={-t / 2 - 4 * px} width={o.width} height={t + 8 * px} fill="none" stroke={SELECT} strokeWidth={2 * px} strokeDasharray={`${4 * px} ${3 * px}`} />}
          </g>
        );
      })}

      {/* Klikgebieden voor muren boven de openingen-uitsparing, zodat muren overal selecteerbaar zijn. */}
      {floor.walls.map((w) => (
        <line
          key={`hit-${w.id}`}
          data-testid="wall"
          x1={w.start.x}
          y1={w.start.y}
          x2={w.end.x}
          y2={w.end.y}
          stroke="transparent"
          strokeWidth={Math.max(w.thickness, 14 * px)}
          style={{ cursor: tool === "select" ? "move" : undefined }}
          onPointerDown={(e) => {
            if (tool === "door" || tool === "window") return; // laat de achtergrond de opening plaatsen
            if (tool === "wall") return;
            selectAnd(e, { kind: "wall", id: w.id }, { kind: "wall", wallId: w.id, start: toWorld(e), moved: false });
          }}
          pointerEvents={tool === "select" ? "stroke" : "none"}
        />
      ))}

      {floor.furniture.map((f) => {
        const selected = selection?.id === f.id;
        return (
          <g
            key={f.id}
            data-testid="furniture"
            data-name={f.name}
            transform={`translate(${f.position.x} ${f.position.y}) rotate(${f.rotation})`}
            style={{ cursor: tool === "select" ? "move" : undefined }}
            onPointerDown={(e) => {
              const w = toWorld(e);
              selectAnd(e, { kind: "furniture", id: f.id }, { kind: "furniture", id: f.id, offset: { x: w.x - f.position.x, y: w.y - f.position.y }, moved: false });
            }}
          >
            {furnitureSymbol(f.kind, f.width, f.depth)}
            {selected && (
              <>
                <rect x={-f.width / 2 - 4 * px} y={-f.depth / 2 - 4 * px} width={f.width + 8 * px} height={f.depth + 8 * px} fill="none" stroke={SELECT} strokeWidth={2 * px} />
                <line x1={0} y1={-f.depth / 2 - 4 * px} x2={0} y2={-f.depth / 2 - 24 * px} stroke={SELECT} strokeWidth={1.5 * px} />
                <circle
                  data-testid="rotate-handle"
                  cx={0}
                  cy={-f.depth / 2 - 30 * px}
                  r={7 * px}
                  fill="#fff"
                  stroke={SELECT}
                  strokeWidth={2 * px}
                  style={{ cursor: "grab" }}
                  onPointerDown={(e) => startDrag(e, { kind: "rotate", id: f.id, moved: false })}
                >
                  <title>Sleep om te draaien</title>
                </circle>
              </>
            )}
          </g>
        );
      })}

      {floor.walls.map((w) => (
        <WallDimension key={`dim-${w.id}`} wall={w} label={wallInnerLength(floor, w)} px={px} highlight={selection?.id === w.id} />
      ))}

      {selectedFurniture && (
        <text
          x={selectedFurniture.position.x}
          y={selectedFurniture.position.y + Math.max(selectedFurniture.width, selectedFurniture.depth) / 2 + 22 * px}
          fontSize={fontSize}
          textAnchor="middle"
          fill={SELECT}
          pointerEvents="none"
          paintOrder="stroke"
          stroke="#fbfaf7"
          strokeWidth={3 * px}
        >
          {formatLength(selectedFurniture.width)} × {formatLength(selectedFurniture.depth)}
        </text>
      )}

      {selectedWall &&
        (["start", "end"] as const).map((which) => (
          <circle
            key={which}
            data-testid={`wall-handle-${which}`}
            cx={selectedWall[which].x}
            cy={selectedWall[which].y}
            r={7 * px}
            fill="#fff"
            stroke={SELECT}
            strokeWidth={2 * px}
            style={{ cursor: "crosshair" }}
            // eslint-disable-next-line react-hooks/refs -- event handler, wordt niet tijdens render uitgevoerd
            onPointerDown={(e) => onWallHandleDown(e, which)}
          />
        ))}

      {tool === "wall" && hover && (
        <g pointerEvents="none">
          {anchor && (
            <>
              <line x1={anchor.point.x} y1={anchor.point.y} x2={hover.x} y2={hover.y} stroke={SELECT} strokeWidth={settings.defaultWallThickness} strokeOpacity={0.45} strokeLinecap="square" />
              <text x={(anchor.point.x + hover.x) / 2} y={(anchor.point.y + hover.y) / 2 - 14 * px} fontSize={fontSize * 1.1} textAnchor="middle" fill={SELECT} fontWeight={600} paintOrder="stroke" stroke="#fbfaf7" strokeWidth={3 * px}>
                {formatLength(distance(anchor.point, hover))}
              </text>
            </>
          )}
          <circle cx={hover.x} cy={hover.y} r={5 * px} fill={SELECT} />
        </g>
      )}
    </svg>
  );
}

function Grid({ viewport, width, height, gridSize }: { viewport: Viewport; width: number; height: number; gridSize: number }) {
  const minorVisible = gridSize * viewport.scale >= 6;
  const major = gridSize * 10;
  return (
    <g pointerEvents="none">
      <defs>
        <pattern id="grid-minor" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
          <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#ebe4d9" strokeWidth={1 / viewport.scale} />
        </pattern>
        <pattern id="grid-major" width={major} height={major} patternUnits="userSpaceOnUse">
          <path d={`M ${major} 0 L 0 0 0 ${major}`} fill="none" stroke="#dccfbe" strokeWidth={1 / viewport.scale} />
        </pattern>
      </defs>
      {minorVisible && <rect x={viewport.origin.x} y={viewport.origin.y} width={width} height={height} fill="url(#grid-minor)" />}
      <rect x={viewport.origin.x} y={viewport.origin.y} width={width} height={height} fill="url(#grid-major)" />
    </g>
  );
}

function WallDimension({ wall, label, px, highlight }: { wall: Wall; label: number; px: number; highlight: boolean }) {
  const len = wallLength(wall);
  if (len * (1 / px) < 30) return null; // te klein om leesbaar te tonen
  const ux = (wall.end.x - wall.start.x) / len;
  const uy = (wall.end.y - wall.start.y) / len;
  const off = wall.thickness / 2 + 16 * px;
  const nx = uy;
  const ny = -ux;
  const a = { x: wall.start.x + nx * off, y: wall.start.y + ny * off };
  const b = { x: wall.end.x + nx * off, y: wall.end.y + ny * off };
  let angle = wallAngle(wall);
  if (angle > 90 && angle <= 270) angle -= 180;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const color = highlight ? SELECT : "#a08d76";
  const tick = 5 * px;
  return (
    <g pointerEvents="none" data-testid="wall-dimension">
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={1 * px} />
      <line x1={a.x - nx * tick} y1={a.y - ny * tick} x2={a.x + nx * tick} y2={a.y + ny * tick} stroke={color} strokeWidth={1 * px} />
      <line x1={b.x - nx * tick} y1={b.y - ny * tick} x2={b.x + nx * tick} y2={b.y + ny * tick} stroke={color} strokeWidth={1 * px} />
      <text
        x={mid.x}
        y={mid.y}
        transform={`rotate(${angle} ${mid.x} ${mid.y})`}
        dy={-4 * px}
        fontSize={11 * px}
        textAnchor="middle"
        fill={color}
        fontWeight={highlight ? 700 : 500}
        paintOrder="stroke"
        stroke="#fbfaf7"
        strokeWidth={3 * px}
      >
        {formatLength(label)}
      </text>
    </g>
  );
}

