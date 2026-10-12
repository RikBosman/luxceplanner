import type { Scene3D } from "@/domain/project";

export interface PhotoCamera {
  /** Positie en kijkpunt in meters (x, hoogte, z). */
  position: [number, number, number];
  target: [number, number, number];
  /** Verticale kijkhoek in graden. */
  fov: number;
}

/**
 * Camera op ooghoogte in een hoek van de kamer, gericht op het zwaartepunt van de inrichting.
 * `corner` 0 = de hoek het verst van de inrichting (meestal het mooiste overzicht); 1–3 = de andere hoeken.
 */
export function defaultEyeCamera(scene: Scene3D, corner = 0): PhotoCamera {
  // Binnenruimte uit de vloeren (niet uit de muren, die steken naar buiten uit).
  const pts = scene.floors.flatMap((f) => f.polygon);
  const minX = Math.min(...pts.map((p) => p[0]));
  const maxX = Math.max(...pts.map((p) => p[0]));
  const minZ = Math.min(...pts.map((p) => p[1]));
  const maxZ = Math.max(...pts.map((p) => p[1]));
  const pad = 0.35;
  const corners: [number, number][] = [
    [minX + pad, minZ + pad],
    [maxX - pad, minZ + pad],
    [minX + pad, maxZ - pad],
    [maxX - pad, maxZ - pad],
  ];
  const furniture = scene.boxes.filter((x) => x.kind === "furniture");
  const fx = furniture.length ? furniture.reduce((s, x) => s + x.center[0], 0) / furniture.length : (minX + maxX) / 2;
  const fz = furniture.length ? furniture.reduce((s, x) => s + x.center[2], 0) / furniture.length : (minZ + maxZ) / 2;
  const [cx, cz] = corners.sort((p, q) => Math.hypot(q[0] - fx, q[1] - fz) - Math.hypot(p[0] - fx, p[1] - fz))[((corner % 4) + 4) % 4]!;
  return { position: [cx, 1.45, cz], target: [fx, 0.95, fz], fov: 60 };
}

