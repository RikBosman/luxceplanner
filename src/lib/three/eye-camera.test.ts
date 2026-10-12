import { describe, expect, it } from "vitest";
import { buildScene, SAMPLE_DESIGNS } from "@/domain/project";
import { defaultEyeCamera } from "./eye-camera";

const inside = (p: [number, number, number], polygon: [number, number][]) => {
  const xs = polygon.map((q) => q[0]);
  const zs = polygon.map((q) => q[1]);
  return p[0] > Math.min(...xs) && p[0] < Math.max(...xs) && p[2] > Math.min(...zs) && p[2] < Math.max(...zs);
};

describe("camera voor fotorealistische renders", () => {
  it("staat voor elk voorbeeld binnen de kamer, op ooghoogte", () => {
    for (const s of SAMPLE_DESIGNS) {
      const scene = buildScene(s.document.floors[0]!, s.document.materials);
      const room = scene.floors[0]!.polygon;
      for (const cam of [s.camera!, defaultEyeCamera(scene, 0), defaultEyeCamera(scene, 1), defaultEyeCamera(scene, 3)]) {
        expect(inside(cam.position, room), `${s.slug}: camera binnen de kamer`).toBe(true);
        expect(cam.position[1]).toBeGreaterThan(1.2);
        expect(cam.position[1]).toBeLessThan(scene.ceilingHeight);
      }
    }
  });

  it("geeft vier verschillende hoeken", () => {
    const scene = buildScene(SAMPLE_DESIGNS[0]!.document.floors[0]!, SAMPLE_DESIGNS[0]!.document.materials);
    const positions = new Set([0, 1, 2, 3].map((c) => defaultEyeCamera(scene, c).position.join(",")));
    expect(positions.size).toBe(4);
  });
});
