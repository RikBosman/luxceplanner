import { describe, expect, it } from "vitest";
import {
  createEmptyProject,
  createFurniture,
  createRectangularRoom,
  formatArea,
  formatLength,
  parseLength,
  parseProjectDocument,
  polygonArea,
  projectDocumentSchema,
  wallLength,
  withWallLength,
  type ProjectDocument,
} from ".";

describe("rechthoekige kamer met echte afmetingen", () => {
  it("maakt een kamer van 4000 × 5000 mm met exacte binnenmaten", () => {
    const { walls, room } = createRectangularRoom({ width: 4000, length: 5000, wallThickness: 100 });
    expect(walls).toHaveLength(4);
    expect(polygonArea(room.polygon)).toBe(20_000_000);
    expect(formatArea(polygonArea(room.polygon))).toBe("20,0 m²");
    // Hartlijnen liggen een halve muurdikte buiten de binnenmaat.
    expect(walls.map(wallLength)).toEqual([4100, 5100, 4100, 5100]);
    // Muren sluiten aan.
    walls.forEach((w, i) => expect(w.end).toEqual(walls[(i + 1) % 4]!.start));
  });

  it("weigert ongeldige maten", () => {
    expect(() => createRectangularRoom({ width: 0, length: 3000 })).toThrow(RangeError);
    expect(() => createRectangularRoom({ width: Number.NaN, length: 3000 })).toThrow(RangeError);
    expect(() => createRectangularRoom({ width: 3000, length: 1e9 })).toThrow(RangeError);
  });

  it("past de lengte van een muur aan met behoud van richting", () => {
    const wall = { start: { x: 0, y: 0 }, end: { x: 300, y: 400 } };
    const longer = withWallLength(wall, 1000);
    expect(wallLength(longer)).toBeCloseTo(1000, 9);
    expect(longer.end.x / longer.end.y).toBeCloseTo(0.75, 12);
    expect(() => withWallLength(wall, 0)).toThrow(RangeError);
  });
});

describe("maten weergeven en invoeren", () => {
  it("leest maten in mm, cm en m", () => {
    expect(parseLength("4000")).toBe(4000);
    expect(parseLength("400 cm")).toBe(4000);
    expect(parseLength("4,25m")).toBe(4250);
    expect(parseLength("12.5 mm")).toBe(12.5);
    expect(parseLength("vier meter")).toBeNull();
    expect(parseLength("")).toBeNull();
  });

  it("rondt alleen af voor weergave", () => {
    expect(formatLength(4000)).toBe("4 m");
    expect(formatLength(4255.5)).toBe("4,26 m");
    expect(formatLength(850)).toBe("85 cm");
    expect(formatLength(5)).toBe("5 mm");
  });
});

describe("projectdocument valideren", () => {
  const valid = (): ProjectDocument => {
    const doc = createEmptyProject();
    const { walls, room } = createRectangularRoom({ width: 4000, length: 5000 });
    const floor = doc.floors[0]!;
    floor.walls.push(...walls);
    floor.rooms.push(room);
    floor.furniture.push(createFurniture("sofa-3", { x: 2000, y: 2500 }, 90));
    floor.openings.push({
      id: "door_1", type: "door", wallId: walls[0]!.id, offset: 1000, width: 900, height: 2100,
      sillHeight: 0, swing: "left", flipped: false,
    });
    return doc;
  };

  it("accepteert een nieuw en een gevuld project", () => {
    expect(projectDocumentSchema.safeParse(createEmptyProject()).success).toBe(true);
    const result = parseProjectDocument(JSON.parse(JSON.stringify(valid())));
    expect(result.ok).toBe(true);
  });

  it("wijst ongeldige data veilig af zonder te crashen", () => {
    for (const bad of [null, 42, "tekst", [], {}, { schemaVersion: "1" }, { schemaVersion: 0 }]) {
      const r = parseProjectDocument(bad);
      expect(r.ok).toBe(false);
    }
  });

  it("weigert documenten van een nieuwere schemaversie", () => {
    const r = parseProjectDocument({ ...valid(), schemaVersion: 999 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/nieuwere versie/);
  });

  it("vindt dubbele ID's, kapotte verwijzingen en onzinnige waarden", () => {
    const dup = valid();
    dup.floors[0]!.walls[1]!.id = dup.floors[0]!.walls[0]!.id;
    expect(parseProjectDocument(dup).ok).toBe(false);

    const orphan = valid();
    orphan.floors[0]!.openings[0]!.wallId = "bestaat_niet";
    expect(parseProjectDocument(orphan).ok).toBe(false);

    const huge = valid();
    huge.floors[0]!.furniture[0]!.width = Number.POSITIVE_INFINITY;
    expect(parseProjectDocument(JSON.parse(JSON.stringify(huge))).ok).toBe(false);

    const zeroWall = valid();
    zeroWall.floors[0]!.walls[0]!.end = { ...zeroWall.floors[0]!.walls[0]!.start };
    expect(parseProjectDocument(zeroWall).ok).toBe(false);
  });

  it("geeft elk element een unieke stabiele ID", () => {
    const doc = valid();
    const floor = doc.floors[0]!;
    const ids = [...floor.walls, ...floor.rooms, ...floor.furniture].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("voorbeeldontwerpen", () => {
  it("zijn geldige projectdocumenten", async () => {
    const { SAMPLE_DESIGNS } = await import(".");
    for (const sample of SAMPLE_DESIGNS) {
      const r = parseProjectDocument(JSON.parse(JSON.stringify(sample.document)));
      expect(r.ok, sample.slug + (r.ok ? "" : ` ${r.error} ${r.issues.join("; ")}`)).toBe(true);
    }
  });
});
