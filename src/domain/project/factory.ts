/** Aanmaken van nieuwe projecten en veelgebruikte bouwstenen. */
import { getCatalogItem } from "./catalog";
import { createId } from "./ids";
import {
  CURRENT_SCHEMA_VERSION,
  MAX_DIMENSION_MM,
  type Floor,
  type Furniture,
  type Point,
  type ProjectDocument,
  type ProjectSettings,
  type Room,
  type Wall,
} from "./schema";

export const DEFAULT_SETTINGS: ProjectSettings = {
  gridSize: 100,
  snapToGrid: true,
  defaultWallHeight: 2600,
  defaultWallThickness: 100,
};

export function createEmptyProject(): ProjectDocument {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    units: "mm",
    settings: { ...DEFAULT_SETTINGS },
    floors: [createFloor("Begane grond", 0)],
    materials: [
      { id: "mat_wall_default", name: "Wit gestuct", color: "#f3f0ea" },
      { id: "mat_floor_oak", name: "Eikenhout", color: "#c9a679" },
    ],
  };
}

export function createFloor(name: string, elevation: number): Floor {
  return { id: createId("floor"), name, elevation, walls: [], openings: [], rooms: [], furniture: [] };
}

export interface RectangularRoomOptions {
  /** Binnenmaat langs x, in mm. */
  width: number;
  /** Binnenmaat langs y, in mm. */
  length: number;
  /** Linkerbovenhoek van de binnenkant. */
  origin?: Point;
  wallThickness?: number;
  wallHeight?: number;
  name?: string;
}

/**
 * Maakt een rechthoekige kamer met vier muren. De opgegeven breedte en lengte zijn de binnenmaten;
 * de hartlijnen van de muren liggen een halve muurdikte naar buiten, zodat de vrije ruimte exact klopt.
 */
export function createRectangularRoom(opts: RectangularRoomOptions): { walls: Wall[]; room: Room } {
  const { width, length } = opts;
  for (const [label, value] of [["breedte", width], ["lengte", length]] as const) {
    if (!Number.isFinite(value) || value <= 0) throw new RangeError(`De ${label} moet groter zijn dan 0 mm.`);
    if (value > MAX_DIMENSION_MM) throw new RangeError(`De ${label} mag maximaal ${MAX_DIMENSION_MM / 1000} m zijn.`);
  }
  const o = opts.origin ?? { x: 0, y: 0 };
  const t = opts.wallThickness ?? DEFAULT_SETTINGS.defaultWallThickness;
  const h = opts.wallHeight ?? DEFAULT_SETTINGS.defaultWallHeight;
  const half = t / 2;
  const c = [
    { x: o.x - half, y: o.y - half },
    { x: o.x + width + half, y: o.y - half },
    { x: o.x + width + half, y: o.y + length + half },
    { x: o.x - half, y: o.y + length + half },
  ] as const;
  const walls: Wall[] = c.map((start, i) => ({
    id: createId("wall"),
    start: { ...start },
    end: { ...c[(i + 1) % 4]! },
    thickness: t,
    height: h,
  }));
  const room: Room = {
    id: createId("room"),
    name: opts.name ?? "Kamer",
    polygon: [
      { x: o.x, y: o.y },
      { x: o.x + width, y: o.y },
      { x: o.x + width, y: o.y + length },
      { x: o.x, y: o.y + length },
    ],
  };
  return { walls, room };
}

export function createFurniture(catalogId: string, position: Point, rotation = 0): Furniture {
  const item = getCatalogItem(catalogId);
  if (!item) throw new Error(`Onbekend meubel: ${catalogId}`);
  return {
    id: createId("item"),
    catalogId: item.catalogId,
    name: item.name,
    kind: item.kind,
    position: { ...position },
    rotation,
    width: item.width,
    depth: item.depth,
    height: item.height,
    elevation: item.elevation ?? 0,
  };
}
