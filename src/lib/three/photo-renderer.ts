/**
 * Fotorealistische renderer (path tracing in de browser via three-gpu-pathtracer, MIT).
 * Simuleert lichtstralen fysiek: zacht daglicht door de ramen, indirect licht dat via muren en vloer
 * weerkaatst, zachte schaduwen en reflecties. Wordt per sample beter; na enkele honderden samples ruisarm.
 */
import * as THREE from "three";
import { DenoiseMaterial, GradientEquirectTexture, WebGLPathTracer } from "three-gpu-pathtracer";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import type { Scene3D } from "@/domain/project";
import type { PhotoCamera } from "./eye-camera";
import { buildRoomGroup, createTextures, disposeGroup, loadSceneModels } from "./scene-objects";

export type { PhotoCamera } from "./eye-camera";
export { defaultEyeCamera } from "./eye-camera";

export interface PhotoRenderOptions {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  scene: Scene3D;
  camera: PhotoCamera;
  /** Aantal samples tot het beeld klaar is. */
  samples: number;
  /** Ruis wegfilteren (randbewust vervagen) in de weergave. Standaard aan. */
  denoise?: boolean;
  onProgress?: (samples: number, target: number) => void;
  onDone?: () => void;
}

export class PhotoRenderer {
  private renderer: THREE.WebGLRenderer;
  private pathTracer: WebGLPathTracer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private env: GradientEquirectTexture;
  private room!: THREE.Group;
  /** Gekloonde modellen delen geometrie met de cache en worden daarom niet opgeruimd. */
  private models: THREE.Object3D[] = [];
  private frame = 0;
  private stopped = false;
  private denoiseQuad: FullScreenQuad | null = null;

  constructor(private readonly opts: PhotoRenderOptions) {
    const { canvas, width, height, scene: data } = opts;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.45;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Lucht als omgeving (zichtbaar door de ramen) en als zachte lichtbron.
    this.env = new GradientEquirectTexture(512);
    this.env.topColor.set("#e9f0f7");
    this.env.bottomColor.set("#d9cdbb");
    this.env.exponent = 1.6;
    this.env.update();
    this.scene.environment = this.env;
    this.scene.background = this.env;
    this.scene.environmentIntensity = 2.2;


    // Daglicht: een zacht vlaklicht net buiten elk raam, naar binnen gericht.
    for (const w of data.windows) {
      const light = new THREE.RectAreaLight("#fff6ec", 28, w.width * 0.95, w.height * 0.95);
      light.position.set(w.center[0] - w.inward[0] * 0.25, w.center[1], w.center[2] - w.inward[1] * 0.25);
      light.lookAt(w.center[0] + w.inward[0], w.center[1] - 0.15, w.center[2] + w.inward[1]);
      this.scene.add(light);
    }
    // Zon: schuin door het eerste raam naar binnen.
    const first = data.windows[0];
    const sun = new THREE.DirectionalLight("#ffe6c2", 4.5);
    if (first) {
      sun.position.set(first.center[0] - first.inward[0] * 6 + 2, first.center[1] + 5, first.center[2] - first.inward[1] * 6 + 1.5);
      sun.target.position.set(first.center[0] + first.inward[0] * 2, 0, first.center[2] + first.inward[1] * 2);
    } else {
      sun.position.set(5, 10, 3);
    }
    this.scene.add(sun, sun.target);
    // Warm licht in staande lampen.
    for (const [x, y, z] of data.lights) {
      const p = new THREE.PointLight("#ffbf75", 2.2, 0, 2);
      p.position.set(x, y, z);
      this.scene.add(p);
    }

    const cam = opts.camera;
    this.camera = new THREE.PerspectiveCamera(cam.fov, width / height, 0.05, 100);
    this.camera.position.set(...cam.position);
    this.camera.lookAt(...cam.target);
    this.camera.updateMatrixWorld();

    this.pathTracer = new WebGLPathTracer(this.renderer);
    this.pathTracer.tiles.set(2, 2);
    this.pathTracer.bounces = 6;
    this.pathTracer.transmissiveBounces = 6;
    this.pathTracer.minSamples = 1;
    this.pathTracer.renderDelay = 0;
    this.pathTracer.fadeDuration = 0;
    this.pathTracer.filterGlossyFactor = 1;
    if (opts.denoise !== false) {
      const material = new DenoiseMaterial({ map: this.pathTracer.target.texture, sigma: 3.2, threshold: 0.04, blending: THREE.NoBlending });
      const quad = new FullScreenQuad(material);
      this.denoiseQuad = quad;
      this.pathTracer.renderToCanvasCallback = (target, renderer) => {
        material.map = target.texture;
        const auto = renderer.autoClear;
        renderer.autoClear = false;
        quad.render(renderer);
        renderer.autoClear = auto;
      };
    }
  }

  /** Laadt de 3D-modellen, bouwt de kamer en start het renderen. */
  async start() {
    const models = await loadSceneModels(this.opts.scene);
    if (this.stopped) return;
    const loaded = new Set(models.map((m) => m.userData.sourceId as string));
    this.room = buildRoomGroup(this.opts.scene, createTextures(), { ceiling: true, skipSources: loaded, photo: true });
    this.models = models;
    this.scene.add(this.room, ...models);
    this.pathTracer.setScene(this.scene, this.camera);
    this.loop();
  }

  private loop() {
    const loop = () => {
      if (this.stopped) return;
      this.pathTracer.renderSample();
      const done = Math.floor(this.pathTracer.samples);
      this.opts.onProgress?.(done, this.opts.samples);
      if (done >= this.opts.samples) {
        this.opts.onDone?.();
        return;
      }
      this.frame = requestAnimationFrame(loop);
    };
    this.frame = requestAnimationFrame(loop);
  }

  toDataURL(type = "image/jpeg", quality = 0.92) {
    return this.renderer.domElement.toDataURL(type, quality);
  }

  dispose() {
    this.stopped = true;
    cancelAnimationFrame(this.frame);
    this.pathTracer.dispose();
    this.denoiseQuad?.material.dispose();
    this.denoiseQuad?.dispose();
    if (this.room) disposeGroup(this.room);
    this.env.dispose();
    this.renderer.dispose();
  }
}

/**
 * Verwijdert "fireflies": losse pixels die veel feller zijn dan hun omgeving (een bekend artefact van path
 * tracing bij weinig samples). Zo'n pixel krijgt de mediaan van zijn 3×3-omgeving; de rest blijft ongemoeid.
 */
export function removeFireflies(source: HTMLCanvasElement, target: HTMLCanvasElement, threshold = 0.18) {
  const w = source.width;
  const h = source.height;
  target.width = w;
  target.height = h;
  const ctx = target.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(img.data);
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = (0.2126 * src[i * 4]! + 0.7152 * src[i * 4 + 1]! + 0.0722 * src[i * 4 + 2]!) / 255;
  const nb: number[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      nb.length = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) nb.push(i + dy * w + dx);
      nb.sort((a, b) => lum[a]! - lum[b]!);
      const median = nb[4]!;
      if (lum[i]! - lum[median]! > threshold) {
        for (let c = 0; c < 3; c++) img.data[i * 4 + c] = src[median * 4 + c]!;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}
