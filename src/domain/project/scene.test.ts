import { describe, expect, it } from "vitest";
import {
  addFurniture,
  addOpening,
  addRectangularRoom,
  buildScene,
  createEmptyProject,
  MM,
  moveFurniture,
  parseProjectDocument,
  rotateFurniture,
  SAMPLE_DESIGNS,
  setFloorColor,
  setWallColor,
  FURNITURE_CATALOG,
  furnitureParts,
  type Box3,
  type ProjectDocument,
} from ".";

/** Omhullend kader (in meters) van gedraaide blokken. */
function worldBounds(boxes: Box3[]) {
  const pts = boxes.flatMap((b) => {
    const c = Math.cos(b.rotationY);
    const s = Math.sin(b.rotationY);
    return [-1, 1].flatMap((i) =>
      [-1, 1].map((k) => {
        const lx = (i * b.size[0]) / 2;
        const lz = (k * b.size[2]) / 2;
        // Rotatie rond y (Three.js): x' = x cos + z sin, z' = -x sin + z cos
        return { x: b.center[0] + lx * c + lz * s, z: b.center[2] - lx * s + lz * c, y0: b.center[1] - b.size[1] / 2, y1: b.center[1] + b.size[1] / 2 };
      }),
    );
  });
  return {
    minX: Math.min(...pts.map((p) => p.x)), maxX: Math.max(...pts.map((p) => p.x)),
    minZ: Math.min(...pts.map((p) => p.z)), maxZ: Math.max(...pts.map((p) => p.z)),
    maxY: Math.max(...pts.map((p) => p.y1)),
  };
}

function room() {
  const base = createEmptyProject();
  const fid = base.floors[0]!.id;
  return { doc: addRectangularRoom(base, fid, 4000, 5000), fid };
}

describe("3D-scène komt overeen met de projectdata", () => {
  it("bouwt muren op ware grootte en hoogte", () => {
    const { doc } = room();
    const scene = buildScene(doc.floors[0]!, doc.materials);
    const walls = scene.boxes.filter((b) => b.kind === "wall");
    expect(walls).toHaveLength(4);
    // Bovenmuur: hartlijn 4100 mm + halve dikte aan beide kanten = 4200 mm lang, 2600 hoog, 100 dik.
    expect(walls[0]!.size[0]).toBeCloseTo(4.2, 9);
    expect(walls[0]!.size[1]).toBeCloseTo(2.6, 9);
    expect(walls[0]!.size[2]).toBeCloseTo(0.1, 9);
    expect(walls[0]!.center).toEqual([expect.closeTo(2, 9), expect.closeTo(1.3, 9), expect.closeTo(-0.05, 9)]);
    // Rechtermuur loopt in plan naar beneden (+y) → in 3D langs +z.
    expect(Math.cos(walls[1]!.rotationY)).toBeCloseTo(0, 9);
    expect(-Math.sin(walls[1]!.rotationY)).toBeCloseTo(1, 9);
    expect(scene.floors[0]!.polygon).toEqual([[0, 0], [4, 0], [4, 5], [0, 5]]);
    expect(scene.bounds!.max[1]).toBeCloseTo(2.6, 9);
  });

  it("maakt een gat in de muur voor deuren en ramen", () => {
    const { doc, fid } = room();
    const wallId = doc.floors[0]!.walls[0]!.id;
    const { doc: d1 } = addOpening(doc, fid, wallId, "window", { x: 2000, y: 0 });
    const scene = buildScene(d1.floors[0]!, d1.materials);
    const segments = scene.boxes.filter((b) => b.sourceId === wallId && b.kind === "wall");
    // links, borstwering, latei, rechts
    expect(segments).toHaveLength(4);
    const sill = segments.find((s) => s.center[1] < 0.5)!;
    expect(sill.size[1]).toBeCloseTo(0.8, 9);
    expect(sill.size[0]).toBeCloseTo(1.2, 9);
    const glass = scene.boxes.find((b) => b.kind === "window-glass")!;
    expect(glass.size[1]).toBeCloseTo(1.4 - 0.09, 9); // binnen het kozijn (2 × 45 mm)
    expect(glass.center[1]).toBeCloseTo(0.8 + 0.7, 9);
    // Totale muurlengte blijft gelijk: segmenten + opening = 4200 mm
    const solidFull = segments.filter((s) => s.size[1] > 2.5).reduce((sum, s) => sum + s.size[0], 0);
    expect(solidFull + 1.2).toBeCloseTo(4.2, 9);
  });

  it("zet plinten en sierlijsten aan de binnenkant van de muren", () => {
    const { doc } = room();
    const scene = buildScene(doc.floors[0]!, doc.materials);
    const trims = scene.boxes.filter((b) => b.kind === "trim");
    expect(trims.length).toBeGreaterThanOrEqual(8); // per muur een plint en een sierlijst
    // Bovenmuur: hartlijn op y = -50 mm, binnenkant op y = 0; de plint ligt daar net binnen.
    const top = trims.filter((t) => Math.abs(t.center[2]) < 0.05 && t.center[1] < 0.1);
    expect(top).toHaveLength(1);
    expect(top[0]!.center[2]).toBeGreaterThan(0);
    expect(top[0]!.center[2] - top[0]!.size[2] / 2).toBeCloseTo(0, 9);
    expect(scene.ceilingHeight).toBeCloseTo(2.6, 9);
  });

  it("plaatst meubels op dezelfde positie, maat en draaiing als in 2D", () => {
    const { doc, fid } = room();
    const { doc: d1, furnitureId } = addFurniture(doc, fid, "wardrobe", { x: 0, y: 0 });
    const d2 = rotateFurniture(moveFurniture(d1, fid, furnitureId, { x: 1000, y: 3000 }), fid, furnitureId, 90);
    const parts = buildScene(d2.floors[0]!, d2.materials).boxes.filter((b) => b.sourceId === furnitureId);
    expect(parts.length).toBeGreaterThan(3); // romp, deuren, grepen, plint
    for (const p of parts) expect(p.rotationY).toBeCloseTo(-Math.PI / 2, 9);
    const b = worldBounds(parts);
    // 90° gedraaid: de breedte (1500) ligt langs plan-y, de diepte (600) langs plan-x (+ grepen tot 18 mm).
    expect(b.maxZ - b.minZ).toBeCloseTo(1.5, 2);
    expect(b.maxX - b.minX).toBeGreaterThanOrEqual(0.6 - 1e-9);
    expect(b.maxX - b.minX).toBeLessThanOrEqual(0.62);
    expect((b.minZ + b.maxZ) / 2).toBeCloseTo(3, 2);
    expect(b.maxY).toBeCloseTo(2.1, 9);
  });

  it("houdt elk meubel uit de bibliotheek binnen zijn opgegeven maten", () => {
    for (const item of FURNITURE_CATALOG) {
      const parts = furnitureParts(item.kind, item.width, item.depth, item.height);
      expect(parts.length, item.catalogId).toBeGreaterThan(1);
      for (const p of parts) {
        expect(p.sx > 0 && p.sy > 0 && p.sz > 0, `${item.catalogId}: positieve maten`).toBe(true);
        // Kleine uitsteeksels (grepen, werkblad-overstek) tot 25 mm zijn toegestaan.
        expect(Math.abs(p.x) + p.sx / 2, `${item.catalogId}: breedte`).toBeLessThanOrEqual(item.width / 2 + 25);
        expect(Math.abs(p.z) + p.sz / 2, `${item.catalogId}: diepte`).toBeLessThanOrEqual(item.depth / 2 + 25);
        expect(p.y - p.sy / 2, `${item.catalogId}: niet onder de vloer`).toBeGreaterThanOrEqual(0);
      }
      const top = Math.max(...parts.map((p) => p.y + p.sy / 2));
      // Hoofdbord van een bed en een kraan mogen boven de opgegeven hoogte uitkomen.
      expect(top, item.catalogId).toBeLessThanOrEqual(item.height + (item.kind === "bed" ? 600 : item.kind === "kitchen" || item.kind === "vanity" ? 310 : 1));
    }
  });

  it("gebruikt de gekozen kleuren", () => {
    const { doc, fid } = room();
    const colored = setFloorColor(setWallColor(doc, fid, "#aabbcc"), fid, "#112233");
    expect(parseProjectDocument(JSON.parse(JSON.stringify(colored))).ok).toBe(true);
    const scene = buildScene(colored.floors[0]!, colored.materials);
    expect(scene.boxes.filter((b) => b.kind === "wall").every((b) => b.color === "#aabbcc")).toBe(true);
    expect(scene.floors[0]!.color).toBe("#112233");
  });

  it("slaat ongeldige geometrie over met een waarschuwing in plaats van te crashen", () => {
    const { doc } = room();
    const broken: ProjectDocument = structuredClone(doc);
    broken.floors[0]!.walls[0]!.end = { ...broken.floors[0]!.walls[0]!.start };
    broken.floors[0]!.rooms[0]!.polygon = broken.floors[0]!.rooms[0]!.polygon.slice(0, 2);
    const scene = buildScene(broken.floors[0]!, broken.materials);
    expect(scene.warnings.length).toBe(2);
    expect(scene.boxes.filter((b) => b.kind === "wall")).toHaveLength(3);
  });

  it("bouwt alle voorbeeldontwerpen zonder waarschuwingen", () => {
    for (const s of SAMPLE_DESIGNS) {
      const scene = buildScene(s.document.floors[0]!, s.document.materials);
      expect(scene.warnings).toEqual([]);
      expect(scene.boxes.length).toBeGreaterThan(10);
    }
    expect(MM).toBe(0.001);
  });
});
