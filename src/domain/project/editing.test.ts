import { describe, expect, it } from "vitest";
import {
  canRedo,
  canUndo,
  commit,
  createHistory,
  MAX_HISTORY,
  normalizeDegrees,
  panBy,
  projectOntoWall,
  rectangleCorners,
  redo,
  screenToWorld,
  snapPoint,
  undo,
  worldToScreen,
  zoomAt,
  fitBounds,
  type Viewport,
} from ".";

describe("wereld- en schermcoördinaten", () => {
  const vp: Viewport = { origin: { x: -500, y: -1000 }, scale: 0.1 };

  it("rekent heen en terug zonder verlies", () => {
    for (const p of [{ x: 0, y: 0 }, { x: 4000, y: 5000 }, { x: -1234.5, y: 987.25 }]) {
      const back = screenToWorld(vp, worldToScreen(vp, p));
      expect(back.x).toBeCloseTo(p.x, 9);
      expect(back.y).toBeCloseTo(p.y, 9);
    }
    expect(worldToScreen(vp, { x: 0, y: 0 })).toEqual({ x: 50, y: 100 });
  });

  it("houdt het punt onder de cursor vast bij zoomen", () => {
    const cursor = { x: 320, y: 240 };
    const before = screenToWorld(vp, cursor);
    const zoomed = zoomAt(vp, cursor, 2);
    expect(zoomed.scale).toBeCloseTo(0.2, 12);
    const after = screenToWorld(zoomed, cursor);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
  });

  it("begrenst zoom en verschuift correct", () => {
    expect(zoomAt(vp, { x: 0, y: 0 }, 1e9).scale).toBe(2);
    expect(zoomAt(vp, { x: 0, y: 0 }, 1e-9).scale).toBe(0.005);
    const panned = panBy(vp, 100, -50);
    expect(worldToScreen(panned, { x: 0, y: 0 })).toEqual({ x: 150, y: 50 });
  });

  it("past een kamer in beeld", () => {
    const fitted = fitBounds({ minX: 0, minY: 0, maxX: 4000, maxY: 5000 }, 800, 600, 50);
    const center = worldToScreen(fitted, { x: 2000, y: 2500 });
    expect(center.x).toBeCloseTo(400, 9);
    expect(center.y).toBeCloseTo(300, 9);
    expect(5000 * fitted.scale).toBeCloseTo(500, 9);
  });
});

describe("snappen, draaien en projecteren", () => {
  it("snapt aan het raster", () => {
    expect(snapPoint({ x: 1049, y: 1051 }, 100)).toEqual({ x: 1000, y: 1100 });
  });

  it("normaliseert rotaties", () => {
    expect(normalizeDegrees(370)).toBe(10);
    expect(normalizeDegrees(-90)).toBe(270);
    expect(normalizeDegrees(360)).toBe(0);
    expect(normalizeDegrees(-0)).toBe(0);
  });

  it("berekent de hoeken van een gedraaid meubel", () => {
    const corners = rectangleCorners({ x: 0, y: 0 }, 2000, 1000, 90);
    expect(corners[0]!.x).toBeCloseTo(500, 9);
    expect(corners[0]!.y).toBeCloseTo(-1000, 9);
  });

  it("projecteert een punt op een muur", () => {
    const r = projectOntoWall({ start: { x: 0, y: 0 }, end: { x: 4000, y: 0 } }, { x: 1500, y: 300 });
    expect(r.offset).toBe(1500);
    expect(r.distance).toBe(300);
    expect(projectOntoWall({ start: { x: 0, y: 0 }, end: { x: 4000, y: 0 } }, { x: 9000, y: 0 }).offset).toBe(4000);
  });
});

describe("ongedaan maken en opnieuw uitvoeren", () => {
  it("werkt in beide richtingen en wist de toekomst bij een nieuwe wijziging", () => {
    let h = createHistory(1);
    expect(canUndo(h)).toBe(false);
    h = commit(h, 2);
    h = commit(h, 3);
    h = undo(h);
    expect(h.present).toBe(2);
    expect(canRedo(h)).toBe(true);
    h = redo(h);
    expect(h.present).toBe(3);
    h = undo(undo(h));
    expect(h.present).toBe(1);
    h = undo(h); // niets meer om ongedaan te maken
    expect(h.present).toBe(1);
    h = commit(h, 9);
    expect(canRedo(h)).toBe(false);
  });

  it("begrenst de geschiedenis", () => {
    let h = createHistory(0);
    for (let i = 1; i <= MAX_HISTORY + 50; i++) h = commit(h, i);
    expect(h.past).toHaveLength(MAX_HISTORY);
  });
});
