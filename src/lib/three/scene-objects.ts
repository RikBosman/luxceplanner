/**
 * Gedeelde opbouw van 3D-objecten (vormen, materialen, procedurele texturen) voor alle 3D-weergaven:
 * de interactieve studio, de website-renders en de fotorealistische renderer. Alleen in de browser gebruiken.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Box3 } from "@/domain/project";

// ---------------------------------------------------------------------------- Procedurele texturen

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Houten planken (lichte variatie rond wit, zodat de vloerkleur bepalend blijft). Beslaat 2,4 × 2,4 m. */
export function createPlankTexture(): THREE.CanvasTexture {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const rnd = seeded(42);
  const plankW = size * (0.19 / 2.4);
  for (let row = 0; row * plankW < size; row++) {
    let x = -rnd() * size * 0.5;
    while (x < size) {
      const len = size * ((1.2 + rnd() * 1.2) / 2.4);
      const tone = 214 + Math.floor(rnd() * 34);
      g.fillStyle = `rgb(${tone},${tone - 4},${tone - 10})`;
      g.fillRect(x, row * plankW, len, plankW);
      // Nerf
      g.strokeStyle = `rgba(80,60,40,${0.05 + rnd() * 0.05})`;
      g.lineWidth = 1;
      for (let k = 0; k < 7; k++) {
        const y = row * plankW + rnd() * plankW;
        g.beginPath();
        g.moveTo(x, y);
        g.bezierCurveTo(x + len * 0.3, y + (rnd() - 0.5) * 6, x + len * 0.7, y + (rnd() - 0.5) * 6, x + len, y + (rnd() - 0.5) * 4);
        g.stroke();
      }
      // Voeg
      g.fillStyle = "rgba(40,30,20,0.35)";
      g.fillRect(x, row * plankW, 2, plankW);
      x += len;
    }
    g.fillStyle = "rgba(40,30,20,0.3)";
    g.fillRect(0, row * plankW, size, 1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 2.4, 1 / 2.4);
  t.anisotropy = 8;
  return t;
}

/** Fijne ruis als reliëf voor stucwerk en bouclé. */
function createNoiseTexture(seed: number, blobs: number, scale: number): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "#808080";
  g.fillRect(0, 0, size, size);
  const rnd = seeded(seed);
  for (let i = 0; i < blobs; i++) {
    const v = Math.floor(100 + rnd() * 60);
    g.fillStyle = `rgba(${v},${v},${v},0.5)`;
    g.beginPath();
    g.arc(rnd() * size, rnd() * size, 1 + rnd() * scale, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ---------------------------------------------------------------------------- Materialen

export type Textures = { planks: THREE.CanvasTexture; plaster: THREE.CanvasTexture; boucle: THREE.CanvasTexture };

function lighter(hex: string, f: number) {
  return new THREE.Color(hex).lerp(new THREE.Color("#ffffff"), f);
}

export function createMaterial(b: Box3, tex: Textures): THREE.Material {
  const color = new THREE.Color(b.color);
  const finish = b.finish ?? "matte";
  switch (finish) {
    case "plaster": {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.95, bumpMap: tex.plaster, bumpScale: 0.6 });
      return m;
    }
    case "velvet":
      return new THREE.MeshPhysicalMaterial({ color, roughness: 0.82, sheen: 1, sheenRoughness: 0.4, sheenColor: lighter(b.color, 0.35) });
    case "boucle":
      return new THREE.MeshPhysicalMaterial({ color, roughness: 1, sheen: 0.7, sheenRoughness: 0.9, sheenColor: lighter(b.color, 0.5), bumpMap: tex.boucle, bumpScale: 3 });
    case "fabric":
    case "linen":
      return new THREE.MeshPhysicalMaterial({ color, roughness: 0.95, sheen: 0.4, sheenRoughness: 0.8, sheenColor: lighter(b.color, 0.4) });
    case "wood":
      return new THREE.MeshStandardMaterial({ color, roughness: 0.55 });
    case "lacquer":
      return new THREE.MeshStandardMaterial({ color, roughness: 0.38 });
    case "metal":
      return new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.55 });
    case "brass":
      return new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 1 });
    case "stone":
      return new THREE.MeshStandardMaterial({ color, roughness: 0.42 });
    case "ceramic":
      return new THREE.MeshStandardMaterial({ color, roughness: 0.62 });
    case "glass":
      return new THREE.MeshPhysicalMaterial({ color, roughness: 0.05, metalness: 0, transparent: true, opacity: b.opacity ?? 0.3, envMapIntensity: 1.2 });
    case "light":
      return new THREE.MeshStandardMaterial({ color, emissive: new THREE.Color("#ffd9a0"), emissiveIntensity: 2.2, roughness: 1 });
    case "paper":
    case "matte":
    default:
      return new THREE.MeshStandardMaterial({ color, roughness: 0.85, transparent: b.opacity !== undefined, opacity: b.opacity ?? 1 });
  }
}

export function createGeometry(b: Box3): THREE.BufferGeometry {
  const [sx, sy, sz] = b.size;
  switch (b.shape) {
    case "rounded": {
      const r = Math.max(0, Math.min(b.radius ?? 0.01, Math.min(sx, sy, sz) / 2 - 1e-4));
      return r > 1e-4 ? new RoundedBoxGeometry(sx, sy, sz, 4, r) : new THREE.BoxGeometry(sx, sy, sz);
    }
    case "cylinder": {
      const t = b.taper ?? 1;
      const top = t <= 1 ? 0.5 * t : 0.5;
      const bottom = t <= 1 ? 0.5 : 0.5 / t;
      return new THREE.CylinderGeometry(top, bottom, 1, 40).scale(sx, sy, sz);
    }
    case "sphere":
      return new THREE.SphereGeometry(0.5, 40, 24).scale(sx, sy, sz);
    default:
      return new THREE.BoxGeometry(sx, sy, sz);
  }
}


export function createTextures(): Textures {
  return { planks: createPlankTexture(), plaster: createNoiseTexture(7, 2500, 2), boucle: createNoiseTexture(11, 4000, 3) };
}

/**
 * Bouwt de complete kamer als Three.js-groep (zonder React): vloeren, muren, details en meubels,
 * optioneel met plafond (voor weergaven van binnenuit).
 */
export function buildRoomGroup(
  scene: import("@/domain/project").Scene3D,
  textures: Textures,
  options: { ceiling?: boolean; skipSources?: ReadonlySet<string>; /** Voor path tracing: geen ruitglas en geen kleine lichtgevende vlakken (voorkomt ruis). */ photo?: boolean } = {},
): THREE.Group {
  const group = new THREE.Group();
  for (const f of scene.floors) {
    const shape = new THREE.Shape(f.polygon.map(([x, z]) => new THREE.Vector2(x, z)));
    const floorGeo = new THREE.ShapeGeometry(shape);
    floorGeo.rotateX(Math.PI / 2);
    const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: f.color, map: textures.planks, roughness: 0.55, side: THREE.DoubleSide }));
    floor.position.y = 0.001;
    floor.receiveShadow = true;
    group.add(floor);
    if (options.ceiling) {
      const ceilGeo = new THREE.ShapeGeometry(shape);
      ceilGeo.rotateX(Math.PI / 2);
      const ceiling = new THREE.Mesh(ceilGeo, new THREE.MeshStandardMaterial({ color: "#f6f3ee", roughness: 0.95, side: THREE.DoubleSide }));
      ceiling.position.y = scene.ceilingHeight;
      group.add(ceiling);
    }
  }
  for (const b of scene.boxes) {
    if (options.skipSources?.has(b.sourceId)) continue;
    if (options.photo && b.kind === "window-glass") continue;
    if (options.photo && b.finish === "light") continue;
    const mesh = new THREE.Mesh(createGeometry(b), createMaterial(b, textures));
    mesh.position.set(...b.center);
    mesh.rotation.y = b.rotationY;
    mesh.castShadow = b.kind !== "window-glass";
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  return group;
}

/** Ruimt geometrieën en materialen van een groep op. */
export function disposeGroup(group: THREE.Object3D) {
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry.dispose();
      (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose());
    }
  });
}

// ---------------------------------------------------------------------------- 3D-modellen (glTF)

const modelCache = new Map<string, Promise<THREE.Object3D>>();

/** Laadt een glTF-model één keer en deelt het daarna (als bron om te klonen). */
export function loadModel(url: string): Promise<THREE.Object3D> {
  let p = modelCache.get(url);
  if (!p) {
    p = import("three/examples/jsm/loaders/GLTFLoader.js").then(
      ({ GLTFLoader }) =>
        new Promise<THREE.Object3D>((resolve, reject) => {
          new GLTFLoader().load(url, (gltf) => resolve(gltf.scene), undefined, reject);
        }),
    );
    p.catch(() => modelCache.delete(url));
    modelCache.set(url, p);
  }
  return p;
}

/**
 * Plaatst een kloon van een model op maat: onderkant op `position.y`, midden op (x, z), gedraaid, en
 * geschaald naar de afmetingen van het meubel (zodat 2D en 3D exact overeenkomen).
 */
export function placeModel(source: THREE.Object3D, m: import("@/domain/project").Scene3D["models"][number]): THREE.Object3D {
  const inner = source.clone(true);
  const box = new THREE.Box3().setFromObject(inner);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  inner.position.set(-center.x, -box.min.y, -center.z);
  const holder = new THREE.Group();
  holder.add(inner);
  holder.scale.set(m.size[0] / (size.x || 1), m.size[1] / (size.y || 1), m.size[2] / (size.z || 1));
  const outer = new THREE.Group();
  outer.add(holder);
  outer.position.set(...m.position);
  outer.rotation.y = m.rotationY;
  outer.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  outer.userData.sourceId = m.sourceId;
  return outer;
}

/** Laadt en plaatst alle modellen van een scène; mislukte modellen worden overgeslagen (terugvalvorm blijft). */
export async function loadSceneModels(scene: import("@/domain/project").Scene3D): Promise<THREE.Object3D[]> {
  const results = await Promise.allSettled(scene.models.map(async (m) => placeModel(await loadModel(m.url), m)));
  return results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
}
