/**
 * Voorbeeldontwerpen voor de website en als inspiratie. Het zijn echte, geldige projectdocumenten (zie de
 * tests). Sfeer: warm en gelaagd — taupe muren, donker gerookt eiken, cognac velours, bouclé, linnen,
 * zwart metaal en gedroogde takken.
 */
import { getCatalogItem } from "./catalog";
import { createRectangularRoom, DEFAULT_SETTINGS } from "./factory";
import { CURRENT_SCHEMA_VERSION, type Furniture, type Material, type Opening, type ProjectDocument } from "./schema";

interface ItemOptions {
  rotation?: number;
  materialId?: string;
  elevation?: number;
  width?: number;
  depth?: number;
  height?: number;
  name?: string;
}

function item(id: string, catalogId: string, x: number, y: number, o: ItemOptions = {}): Furniture {
  const c = getCatalogItem(catalogId)!;
  return {
    id,
    catalogId,
    name: o.name ?? c.name,
    kind: c.kind,
    position: { x, y },
    rotation: o.rotation ?? 0,
    width: o.width ?? c.width,
    depth: o.depth ?? c.depth,
    height: o.height ?? c.height,
    elevation: o.elevation ?? c.elevation ?? 0,
    ...(o.materialId ? { materialId: o.materialId } : {}),
  };
}

function opening(id: string, type: Opening["type"], wallId: string, offset: number, width: number, height: number, sillHeight: number, extra: Partial<Opening> = {}): Opening {
  return { id, type, wallId, offset, width, height, sillHeight, swing: "left", flipped: false, ...extra };
}

/** Gedeeld palet. */
const PALETTE: Material[] = [
  { id: "mat_wall", name: "Kalkverf taupe", color: "#a39789" },
  { id: "mat_floor", name: "Gerookt eiken", color: "#4f4239" },
  { id: "mat_velvet", name: "Cognac velours", color: "#8a4b2c" },
  { id: "mat_boucle", name: "Bouclé ivoor", color: "#ece4d6" },
  { id: "mat_black", name: "Zwart metaal", color: "#1e1b19" },
  { id: "mat_walnut", name: "Donker notenhout", color: "#3f2c20" },
  { id: "mat_smoked", name: "Gerookt eiken front", color: "#5b4a3d" },
  { id: "mat_linen", name: "Linnen", color: "#d8cdbd" },
  { id: "mat_art_portrait", name: "Doek antraciet", color: "#4f4c44" },
  { id: "mat_art_rust", name: "Doek roest", color: "#7a5a43" },
  { id: "mat_bedding", name: "Taupe linnen", color: "#6f5f50" },
  { id: "mat_rug", name: "Wol zand", color: "#8c7b68" },
];

function room(width: number, length: number, name: string) {
  const { walls, room: r } = createRectangularRoom({ width, length, name });
  return {
    walls: walls.map((w, i) => ({ ...w, id: `wall_${i + 1}`, materialId: "mat_wall" })),
    rooms: [{ ...r, id: "room_1", floorMaterialId: "mat_floor" }],
  };
}

function doc(floorName: string, r: ReturnType<typeof room>, openings: Opening[], furniture: Furniture[]): ProjectDocument {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    units: "mm",
    settings: { ...DEFAULT_SETTINGS },
    materials: PALETTE.map((m) => ({ ...m })),
    floors: [{ id: "floor_1", name: floorName, elevation: 0, walls: r.walls, rooms: r.rooms, openings, furniture }],
  };
}

export interface SampleDesign {
  slug: string;
  title: string;
  description: string;
  document: ProjectDocument;
  /** Camerastandpunt voor de fotorealistische render (meters: x, hoogte, z). */
  camera?: { position: [number, number, number]; target: [number, number, number]; fov: number };
}

/** 6,0 × 4,2 m. Muur 1 = achter (boven), muur 4 = links. */
function livingRoom(): ProjectDocument {
  return doc(
    "Begane grond",
    room(6000, 4200, "Woonkamer"),
    [
      opening("window_1", "window", "wall_1", 4950, 1600, 2000, 400),
      opening("door_1", "door", "wall_4", 800, 930, 2115, 0),
    ],
    [
      item("item_sofa", "sofa-lounge", 1900, 550, { materialId: "mat_velvet" }),
      item("item_art_1", "wall-art", 1250, 20, { materialId: "mat_art_portrait" }),
      item("item_art_2", "wall-art", 2500, 20, { materialId: "mat_art_rust", width: 600, height: 800, elevation: 1250 }),
      item("item_lamp", "floor-lamp", 3620, 320),
      item("item_curtain_1", "curtain", 3850, 70, { width: 600 }),
      item("item_curtain_2", "curtain", 5600, 70, { width: 700 }),
      item("item_table_1", "side-table-round", 3200, 1550, { materialId: "mat_black", width: 700, depth: 700, height: 480 }),
      item("item_table_2", "side-table-round", 2650, 1750, { materialId: "mat_black", height: 400 }),
      item("item_vase", "vase-branches", 3250, 1500, { elevation: 480, width: 300, depth: 300, height: 1150 }),
      item("item_armchair", "lounge-chair", 1250, 2950, { rotation: 200 }),
      item("item_plant", "plant", 4400, 650),
      item("item_plant_2", "plant", 330, 1500, { width: 560, depth: 525, height: 672 }),
      item("item_dining", "dining-table", 4800, 2950, { rotation: 90, materialId: "mat_walnut" }),
      item("item_chair_1", "dining-chair", 4250, 2550, { rotation: 270, materialId: "mat_linen" }),
      item("item_chair_2", "dining-chair", 4250, 3350, { rotation: 270, materialId: "mat_linen" }),
      item("item_chair_3", "dining-chair", 5350, 2550, { rotation: 90, materialId: "mat_linen" }),
      item("item_chair_4", "dining-chair", 5350, 3350, { rotation: 90, materialId: "mat_linen" }),
      item("item_vase_2", "vase-flowers", 4800, 2950, { elevation: 750 }),
    ],
  );
}

/** 3,6 × 3,4 m. */
function bedroom(): ProjectDocument {
  return doc(
    "Verdieping",
    room(3600, 3400, "Slaapkamer"),
    [
      opening("window_1", "window", "wall_1", 3050, 900, 1700, 700),
      opening("door_1", "door", "wall_3", 2500, 880, 2115, 0, { swing: "right" }),
    ],
    [
      item("item_rug", "rug", 1800, 1500, { materialId: "mat_rug" }),
      item("item_bed", "bed-double", 1800, 1050, { materialId: "mat_bedding" }),
      item("item_art", "wall-art", 1800, 20, { materialId: "mat_art_portrait", width: 1000, height: 1100, elevation: 1200 }),
      item("item_table", "side-table-round", 700, 300, { materialId: "mat_black", width: 450, depth: 450, height: 500 }),
      item("item_vase", "vase-branches", 700, 300, { elevation: 500, width: 220, depth: 220, height: 650 }),
      item("item_lamp", "floor-lamp", 2950, 300),
      item("item_wardrobe", "wardrobe", 300, 2500, { rotation: 270, materialId: "mat_smoked" }),
      item("item_chair", "lounge-chair", 2950, 2700, { rotation: 225 }),
      item("item_plant", "plant", 330, 1400, { width: 560, depth: 525, height: 672 }),
    ],
  );
}

/** 5,2 × 3,0 m. */
function kitchen(): ProjectDocument {
  return doc(
    "Begane grond",
    room(5200, 3000, "Keuken & eetplek"),
    [
      opening("window_1", "window", "wall_1", 4150, 1400, 1300, 900),
      opening("door_1", "door", "wall_2", 1500, 930, 2115, 0, { flipped: true }),
    ],
    [
      item("item_rug", "rug", 1700, 1950, { materialId: "mat_rug", width: 2600, depth: 1800 }),
      item("item_kitchen", "kitchen-unit", 1700, 310, { materialId: "mat_smoked" }),
      item("item_table", "dining-table", 1700, 1950, { materialId: "mat_walnut" }),
      item("item_chair_1", "dining-chair", 1200, 1350, { materialId: "mat_linen" }),
      item("item_chair_2", "dining-chair", 2200, 1350, { materialId: "mat_linen" }),
      item("item_chair_3", "dining-chair", 1200, 2550, { rotation: 180, materialId: "mat_linen" }),
      item("item_chair_4", "dining-chair", 2200, 2550, { rotation: 180, materialId: "mat_linen" }),
      item("item_vase", "vase-flowers", 1700, 1950, { elevation: 750 }),
      item("item_plant", "plant", 380, 2620),
      item("item_desk", "desk", 4300, 350, { materialId: "mat_walnut" }),
      item("item_lamp", "floor-lamp", 4950, 900),
      item("item_art", "wall-art", 20, 1950, { rotation: 270, materialId: "mat_art_rust", width: 900, height: 1100, elevation: 1050 }),
      item("item_curtain", "curtain", 3150, 70, { width: 500 }),
    ],
  );
}

export const SAMPLE_DESIGNS: readonly SampleDesign[] = [
  {
    slug: "woonkamer",
    title: "Warme lounge met eethoek",
    description: "6,0 × 4,2 m: cognac velours, bouclé, gerookt eiken en kunst aan de muur.",
    document: livingRoom(),
    camera: { position: [0.55, 1.4, 4.0], target: [3.1, 0.95, 0.6], fov: 62 },
  },
  {
    slug: "slaapkamer",
    title: "Rustige slaapkamer",
    description: "3,6 × 3,4 m in taupe en linnen, met een wollen kleed en zachte verlichting.",
    document: bedroom(),
    camera: { position: [1.25, 1.5, 3.15], target: [2.1, 0.8, 0.7], fov: 64 },
  },
  {
    slug: "keuken",
    title: "Keuken met eetplek",
    description: "5,2 × 3,0 m: gerookt eiken fronten, notenhouten tafel en een kleine werkhoek.",
    document: kitchen(),
    camera: { position: [4.9, 1.5, 2.8], target: [1.5, 1.0, 0.6], fov: 62 },
  },
];
