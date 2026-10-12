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
  type ProjectDocument,
} from ".";

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
    expect(glass.size[1]).toBeCloseTo(1.4, 9);
    expect(glass.center[1]).toBeCloseTo(0.8 + 0.7, 9);
    // Totale muurlengte blijft gelijk: segmenten + opening = 4200 mm
    const solidFull = segments.filter((s) => s.size[1] > 2.5).reduce((sum, s) => sum + s.size[0], 0);
    expect(solidFull + 1.2).toBeCloseTo(4.2, 9);
  });

  it("plaatst meubels op dezelfde positie en draaiing als in 2D", () => {
    const { doc, fid } = room();
    const { doc: d1, furnitureId } = addFurniture(doc, fid, "wardrobe", { x: 0, y: 0 });
    const d2 = rotateFurniture(moveFurniture(d1, fid, furnitureId, { x: 1000, y: 3000 }), fid, furnitureId, 90);
    const parts = buildScene(d2.floors[0]!, d2.materials).boxes.filter((b) => b.sourceId === furnitureId);
    expect(parts).toHaveLength(1);
    expect(parts[0]!.center).toEqual([expect.closeTo(1, 9), expect.closeTo(1.05, 9), expect.closeTo(3, 9)]);
    expect(parts[0]!.size).toEqual([expect.closeTo(1.5, 9), expect.closeTo(2.1, 9), expect.closeTo(0.6, 9)]);
    expect(parts[0]!.rotationY).toBeCloseTo(-Math.PI / 2, 9);
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
