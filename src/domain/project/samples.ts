/**
 * Voorbeeldontwerpen. Deze worden gebruikt als voorbeeld op de website en als startpunt bij het
 * aanmaken van een project. Het zijn echte, geldige projectdocumenten (zie de tests).
 */
import { getCatalogItem } from "./catalog";
import { createRectangularRoom, DEFAULT_SETTINGS } from "./factory";
import { CURRENT_SCHEMA_VERSION, type Furniture, type ProjectDocument } from "./schema";

function item(id: string, catalogId: string, x: number, y: number, rotation = 0): Furniture {
  const c = getCatalogItem(catalogId)!;
  return {
    id, catalogId, name: c.name, kind: c.kind, position: { x, y }, rotation,
    width: c.width, depth: c.depth, height: c.height, elevation: 0,
  };
}

function withStableIds<T extends { id: string }>(items: T[], prefix: string): T[] {
  return items.map((x, i) => ({ ...x, id: `${prefix}_${i + 1}` }));
}

export interface SampleDesign {
  slug: string;
  title: string;
  description: string;
  document: ProjectDocument;
}

function livingRoom(): ProjectDocument {
  const { walls, room } = createRectangularRoom({ width: 6000, length: 4200, name: "Woonkamer" });
  const w = withStableIds(walls, "wall");
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    units: "mm",
    settings: { ...DEFAULT_SETTINGS },
    materials: [
      { id: "mat_wall", name: "Kalkwit", color: "#f3efe7" },
      { id: "mat_floor", name: "Eiken visgraat", color: "#c9a679" },
    ],
    floors: [{
      id: "floor_1", name: "Begane grond", elevation: 0,
      walls: w.map((x) => ({ ...x, materialId: "mat_wall" })),
      rooms: [{ ...room, id: "room_1", floorMaterialId: "mat_floor" }],
      openings: [
        { id: "door_1", type: "door", wallId: "wall_4", offset: 3400, width: 930, height: 2115, sillHeight: 0, swing: "left", flipped: false },
        { id: "window_1", type: "window", wallId: "wall_1", offset: 4400, width: 1800, height: 1500, sillHeight: 700, swing: "left", flipped: false },
        { id: "window_2", type: "window", wallId: "wall_2", offset: 2150, width: 1600, height: 1500, sillHeight: 700, swing: "left", flipped: false },
      ],
      furniture: [
        item("item_sofa", "sofa-3", 1650, 3650, 180),
        item("item_armchair", "armchair", 3300, 2600, 90),
        item("item_coffee", "coffee-table", 1650, 2550),
        item("item_books", "bookcase", 1650, 200),
        item("item_table", "dining-table", 4700, 1300, 90),
        item("item_chair_1", "dining-chair", 3900, 900, 270),
        item("item_chair_2", "dining-chair", 3900, 1700, 270),
        item("item_chair_3", "dining-chair", 5500, 900, 90),
        item("item_chair_4", "dining-chair", 5500, 1700, 90),
      ],
    }],
  };
}

function bedroom(): ProjectDocument {
  const { walls, room } = createRectangularRoom({ width: 3600, length: 3400, name: "Slaapkamer" });
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    units: "mm",
    settings: { ...DEFAULT_SETTINGS },
    materials: [
      { id: "mat_wall", name: "Zachtgroen", color: "#dfe6d6" },
      { id: "mat_floor", name: "Licht eiken", color: "#d8bf98" },
    ],
    floors: [{
      id: "floor_1", name: "Verdieping", elevation: 0,
      walls: withStableIds(walls, "wall").map((x) => ({ ...x, materialId: "mat_wall" })),
      rooms: [{ ...room, id: "room_1", floorMaterialId: "mat_floor" }],
      openings: [
        { id: "door_1", type: "door", wallId: "wall_3", offset: 3300, width: 880, height: 2115, sillHeight: 0, swing: "right", flipped: false },
        { id: "window_1", type: "window", wallId: "wall_1", offset: 1850, width: 1400, height: 1400, sillHeight: 800, swing: "left", flipped: false },
      ],
      furniture: [
        item("item_bed", "bed-double", 1800, 1050),
        item("item_wardrobe", "wardrobe", 2750, 3100, 180),
        item("item_desk", "desk", 3250, 1300, 90),
      ],
    }],
  };
}

function studio(): ProjectDocument {
  const { walls, room } = createRectangularRoom({ width: 5200, length: 3000, name: "Keuken & werkplek" });
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    units: "mm",
    settings: { ...DEFAULT_SETTINGS },
    materials: [
      { id: "mat_wall", name: "Zandsteen", color: "#ece3d4" },
      { id: "mat_floor", name: "Gietvloer", color: "#bdb5a8" },
    ],
    floors: [{
      id: "floor_1", name: "Begane grond", elevation: 0,
      walls: withStableIds(walls, "wall").map((x) => ({ ...x, materialId: "mat_wall" })),
      rooms: [{ ...room, id: "room_1", floorMaterialId: "mat_floor" }],
      openings: [
        { id: "door_1", type: "door", wallId: "wall_2", offset: 1500, width: 930, height: 2115, sillHeight: 0, swing: "left", flipped: true },
        { id: "window_1", type: "window", wallId: "wall_3", offset: 1500, width: 2000, height: 1300, sillHeight: 900, swing: "left", flipped: false },
      ],
      furniture: [
        item("item_kitchen", "kitchen-unit", 1700, 310),
        item("item_table", "dining-table", 1700, 1900),
        item("item_chair_1", "dining-chair", 1200, 1300),
        item("item_chair_2", "dining-chair", 2200, 1300),
        item("item_chair_3", "dining-chair", 1200, 2500, 180),
        item("item_chair_4", "dining-chair", 2200, 2500, 180),
        item("item_books", "bookcase", 4400, 2825, 180),
        item("item_desk", "desk", 4400, 350, 0),
      ],
    }],
  };
}

export const SAMPLE_DESIGNS: readonly SampleDesign[] = [
  { slug: "woonkamer", title: "Lichte woonkamer met eethoek", description: "6,0 × 4,2 m met zithoek, boekenkast en eettafel voor vier.", document: livingRoom() },
  { slug: "slaapkamer", title: "Rustige slaapkamer", description: "3,6 × 3,4 m met tweepersoonsbed, kledingkast en bureau.", document: bedroom() },
  { slug: "keuken", title: "Keuken met werkplek", description: "5,2 × 3,0 m met keukenblok, eettafel en een kleine werkhoek.", document: studio() },
];
