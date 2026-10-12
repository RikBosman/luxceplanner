import { describe, expect, it } from "vitest";
import {
  addFurniture,
  addOpening,
  addRectangularRoom,
  addWall,
  createEmptyProject,
  deleteWall,
  EditError,
  findWallNear,
  moveFurniture,
  moveOpening,
  moveWallEndpoint,
  parseProjectDocument,
  rotateFurniture,
  setAllWallHeights,
  setWallLength,
  snapWallPoint,
  translateWall,
  updateOpening,
  wallLength,
  type ProjectDocument,
} from ".";

function roomDoc() {
  const base = createEmptyProject();
  return addRectangularRoom(base, base.floors[0]!.id, 4000, 5000);
}
function setup() {
  const base = createEmptyProject();
  const floorId = base.floors[0]!.id;
  const doc = addRectangularRoom(base, floorId, 4000, 5000);
  return { doc, floorId, floor: (d: ProjectDocument) => d.floors[0]! };
}
const valid = (d: ProjectDocument) => expect(parseProjectDocument(JSON.parse(JSON.stringify(d))).ok).toBe(true);

describe("muren bewerken", () => {
  it("houdt aansluitende muren verbonden bij het verplaatsen van een hoekpunt", () => {
    const { doc, floorId, floor } = setup();
    const w0 = floor(doc).walls[0]!;
    const moved = moveWallEndpoint(doc, floorId, w0.id, "end", { x: 5000, y: -50 });
    const walls = floor(moved).walls;
    expect(walls[0]!.end).toEqual({ x: 5000, y: -50 });
    expect(walls[1]!.start).toEqual({ x: 5000, y: -50 }); // aansluitende muur rekt mee
    expect(floor(doc).walls[0]!.end).toEqual({ x: 4050, y: -50 }); // origineel onveranderd (nodig voor undo)
    valid(moved);
  });

  it("zet een muur exact op lengte", () => {
    const { doc, floorId, floor } = setup();
    const w0 = floor(doc).walls[0]!;
    const next = setWallLength(doc, floorId, w0.id, 6000);
    expect(wallLength(floor(next).walls[0]!)).toBeCloseTo(6000, 9);
    expect(() => setWallLength(doc, floorId, w0.id, 10)).toThrow(EditError);
  });

  it("verschuift een muur en rekt de buren mee", () => {
    const { doc, floorId, floor } = setup();
    const right = floor(doc).walls[1]!;
    const next = translateWall(doc, floorId, right.id, 1000, 0);
    expect(floor(next).walls[1]!.start.x).toBe(right.start.x + 1000);
    expect(wallLength(floor(next).walls[0]!)).toBe(5100);
  });

  it("weigert te korte muren en verwijdert openingen met de muur", () => {
    const { doc, floorId, floor } = setup();
    expect(() => addWall(doc, floorId, { x: 0, y: 0 }, { x: 50, y: 0 })).toThrow(/minimaal/);
    const wallId = floor(doc).walls[0]!.id;
    const { doc: withDoor } = addOpening(doc, floorId, wallId, "door", { x: 2000, y: 0 });
    const removed = deleteWall(withDoor, floorId, wallId);
    expect(floor(removed).walls).toHaveLength(3);
    expect(floor(removed).openings).toHaveLength(0);
    valid(removed);
  });
});

describe("deuren en ramen", () => {
  it("plaatst een deur op de muur, binnen de grenzen", () => {
    const { doc, floorId, floor } = setup();
    const wall = floor(doc).walls[0]!;
    const { doc: d1, openingId } = addOpening(doc, floorId, wall.id, "door", { x: 4000, y: 300 });
    const door = floor(d1).openings.find((o) => o.id === openingId)!;
    expect(door.offset).toBe(wallLength(wall) - door.width / 2); // tegen het einde geklemd
    const d2 = moveOpening(d1, floorId, openingId, { x: 1000, y: -500 });
    expect(floor(d2).openings[0]!.offset).toBe(1050); // afgerond op 1 cm
    valid(d2);
  });

  it("weigert openingen die niet passen", () => {
    const { doc, floorId, floor } = setup();
    const wall = floor(doc).walls[0]!;
    const { doc: d1, openingId } = addOpening(doc, floorId, wall.id, "window", { x: 2000, y: 0 });
    expect(() => updateOpening(d1, floorId, openingId, { width: 99_000 })).toThrow(EditError);
    expect(() => updateOpening(d1, floorId, openingId, { height: 2500 })).toThrow(/boven de muur/);
    expect(() => setAllWallHeights(d1, floorId, 1500)).toThrow(EditError);
  });

  it("houdt openingen binnen een muur die korter wordt", () => {
    const { doc, floorId, floor } = setup();
    const wall = floor(doc).walls[0]!;
    const { doc: d1 } = addOpening(doc, floorId, wall.id, "door", { x: 3800, y: 0 });
    const shorter = setWallLength(d1, floorId, wall.id, 2000);
    const o = floor(shorter).openings[0]!;
    expect(o.offset + o.width / 2).toBeLessThanOrEqual(2000 + 1e-9);
    valid(shorter);
  });
});

describe("meubels", () => {
  it("kan worden toegevoegd, verplaatst en gedraaid", () => {
    const { doc, floorId, floor } = setup();
    const { doc: d1, furnitureId } = addFurniture(doc, floorId, "sofa-3", { x: 2000, y: 2500 });
    const d2 = moveFurniture(d1, floorId, furnitureId, { x: 1500, y: 4000 });
    const d3 = rotateFurniture(rotateFurniture(d2, floorId, furnitureId, 90), floorId, furnitureId, 300);
    const sofa = floor(d3).furniture[0]!;
    expect(sofa.position).toEqual({ x: 1500, y: 4000 });
    expect(sofa.rotation).toBe(30);
    expect(sofa.width).toBe(2100);
    valid(d3);
    expect(() => addFurniture(doc, floorId, "bestaat-niet", { x: 0, y: 0 })).toThrow(EditError);
  });
});

describe("snappen", () => {
  it("snapt aan muurpunten, assen en raster", () => {
    const doc = roomDoc();
    const floor = doc.floors[0]!;
    const opts = { gridSize: 100, snapToGrid: true, tolerance: 150 };
    expect(snapWallPoint({ x: 4000, y: 0 }, floor, opts)).toEqual({ point: { x: 4050, y: -50 }, kind: "endpoint" });
    expect(snapWallPoint({ x: 7030, y: 2380 }, floor, { ...opts, anchor: { x: 7000, y: 0 } })).toEqual({ point: { x: 7000, y: 2400 }, kind: "axis" });
    expect(snapWallPoint({ x: 1234, y: 2345 }, floor, opts)).toEqual({ point: { x: 1200, y: 2300 }, kind: "grid" });
    expect(findWallNear(floor, { x: 2000, y: 20 }, 50)?.id).toBe(floor.walls[0]!.id);
    expect(findWallNear(floor, { x: 2000, y: 2000 }, 50)).toBeNull();
  });
});

describe("meubels magnetisch tegen de muur", () => {
  it("schuift de achterkant tegen de binnenkant van de muur", async () => {
    const { snapFurnitureToWalls } = await import(".");
    const floor = roomDoc().floors[0]!;
    // Boekenkast (diepte 350) vlak onder de bovenmuur (binnenkant op y = 0).
    const snapped = snapFurnitureToWalls(floor, { position: { x: 2000, y: 230 }, rotation: 0, width: 800, depth: 350 }, 100);
    expect(snapped.x).toBeCloseTo(2000, 9);
    expect(snapped.y).toBeCloseTo(175, 9);
    // Te ver weg: geen aanpassing.
    expect(snapFurnitureToWalls(floor, { position: { x: 2000, y: 900 }, rotation: 0, width: 800, depth: 350 }, 100)).toEqual({ x: 2000, y: 900 });
    // Gedraaid 90° tegen de linkermuur (binnenkant x = 0).
    const side = snapFurnitureToWalls(floor, { position: { x: 240, y: 2000 }, rotation: 90, width: 800, depth: 350 }, 100);
    expect(side.x).toBeCloseTo(175, 9);
  });
});

describe("binnenmaten", () => {
  it("toont en zet de vrije binnenmaat van muren", async () => {
    const { wallInnerLength, setWallInnerLength } = await import(".");
    const { doc, floorId, floor } = setup();
    const walls = floor(doc).walls;
    expect(walls.map((w) => wallInnerLength(floor(doc), w))).toEqual([4000, 5000, 4000, 5000]);
    const wider = setWallInnerLength(doc, floorId, walls[0]!.id, 4500);
    expect(wallInnerLength(floor(wider), floor(wider).walls[0]!)).toBeCloseTo(4500, 9);
    // Een losse muur heeft geen aansluitingen: binnenmaat = lengte.
    const { doc: d2, wallId } = addWall(doc, floorId, { x: 10000, y: 0 }, { x: 12000, y: 0 });
    expect(wallInnerLength(floor(d2), floor(d2).walls.find((w) => w.id === wallId)!)).toBe(2000);
  });
});
