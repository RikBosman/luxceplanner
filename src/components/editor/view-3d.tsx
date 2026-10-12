"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildScene, setFloorColor, setWallColor, type Scene3D } from "@/domain/project";
import { RoomMeshes, StudioLighting } from "@/components/three/room-meshes";
import { PhotoDialog } from "./photo-dialog";
import type { EditorApi } from "./use-editor-state";

const WALL_SWATCHES = ["#f3efe7", "#e9e2d6", "#a39789", "#8c8073", "#dfe6d6", "#c9c2b6"];
const FLOOR_SWATCHES = ["#c9a679", "#d8bf98", "#a07c56", "#4f4239", "#8f8a82", "#e8e1d3"];

type ViewPreset = "schuin" | "boven" | "laag";

function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    if (this.state.failed) {
      return (
        <div role="alert" className="flex h-full items-center justify-center p-6 text-center text-sm text-clay-600">
          De 3D-weergave kon niet worden getoond. Je ontwerp is niet aangetast; ga terug naar 2D om verder te werken.
        </div>
      );
    }
    return this.props.children;
  }
}

export function View3D({ editor, projectName = "ontwerp" }: { editor: EditorApi; projectName?: string }) {
  const doc = editor.committed;
  const floor = doc.floors[0]!;
  const scene = useMemo(() => buildScene(floor, doc.materials), [floor, doc.materials]);
  const [preset, setPreset] = useState<{ name: ViewPreset; n: number }>({ name: "schuin", n: 0 });
  const [cutaway, setCutaway] = useState(true);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [supported] = useState(() => (typeof document === "undefined" ? true : webglAvailable()));

  if (!supported) {
    return (
      <div role="alert" className="flex h-full items-center justify-center p-6 text-center text-sm text-sand-700">
        Je browser of apparaat ondersteunt geen WebGL, dat nodig is voor de 3D-weergave. Probeer een recente versie van Chrome, Edge, Firefox of Safari.
      </div>
    );
  }
  if (!scene.bounds) {
    return <div className="flex h-full items-center justify-center p-6 text-center text-sm text-sand-700">Er is nog niets om in 3D te tonen. Teken eerst een kamer in 2D.</div>;
  }

  const wallColor = doc.materials.find((m) => m.id === floor.walls[0]?.materialId)?.color ?? "#f3efe7";
  const floorColor = doc.materials.find((m) => m.id === floor.rooms[0]?.floorMaterialId)?.color ?? "#d9c7a7";

  return (
    <div className="relative h-full" data-testid="view-3d" data-furniture-parts={scene.boxes.filter((b) => b.kind === "furniture").length}>
      <SceneErrorBoundary>
        <Canvas shadows frameloop="demand" dpr={[1, 2]} scene={{ environmentIntensity: 0.35 }} camera={{ fov: 45, near: 0.05, far: 500 }} gl={{ antialias: true, preserveDrawingBuffer: true }}>
          <color attach="background" args={["#f4f1ec"]} />
          <StudioLighting scene={scene} />
          <RoomMeshes scene={scene} cutaway={cutaway} />
          <Controls scene={scene} preset={preset} />
        </Canvas>
      </SceneErrorBoundary>

      <div className="absolute left-3 top-3 flex gap-1 rounded-lg bg-white/90 p-1 shadow-sm" role="group" aria-label="Camerastandpunt">
        {(["schuin", "boven", "laag"] as const).map((p) => (
          <button key={p} type="button" onClick={() => setPreset({ name: p, n: preset.n + 1 })} className="rounded-md px-2.5 py-1 text-xs text-sand-800 hover:bg-sand-100">
            {p === "schuin" ? "Schuin" : p === "boven" ? "Bovenaanzicht" : "Ooghoogte"}
          </button>
        ))}
        <label className="flex items-center gap-1.5 border-l border-sand-200 px-2.5 text-xs text-sand-800">
          <input type="checkbox" checked={cutaway} onChange={(e) => setCutaway(e.target.checked)} className="accent-gold-600" />
          Voorste muren verlagen
        </label>
        <button type="button" onClick={() => setPhotoOpen(true)} className="ml-1 rounded-md bg-gold-400 px-3 py-1 text-xs font-medium text-ink-950 hover:bg-gold-300">
          ✦ Fotorealistische render
        </button>
      </div>

      <div className="absolute right-3 top-3 w-56 space-y-3 rounded-xl bg-white/95 p-3 text-xs shadow-sm">
        <ColorPicker label="Muren" value={wallColor} swatches={WALL_SWATCHES} onPick={(c) => editor.apply((d) => setWallColor(d, floor.id, c))} />
        <ColorPicker label="Vloer" value={floorColor} swatches={FLOOR_SWATCHES} onPick={(c) => editor.apply((d) => setFloorColor(d, floor.id, c))} />
      </div>

      {scene.warnings.length > 0 && (
        <div role="status" className="absolute bottom-12 left-3 max-w-md rounded-lg bg-white/95 px-3 py-2 text-xs text-clay-600 shadow-sm">
          {scene.warnings.slice(0, 3).map((w) => <p key={w}>{w}</p>)}
        </div>
      )}
      {photoOpen && <PhotoDialog doc={doc} projectName={projectName} onClose={() => setPhotoOpen(false)} />}
      <p className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-white/90 px-3 py-1.5 text-xs text-sand-700 shadow-sm">
        Sleep om te draaien · scroll om te zoomen · rechtermuisknop om te verschuiven. Bewerken doe je in 2D.
      </p>
    </div>
  );
}

function ColorPicker({ label, value, swatches, onPick }: { label: string; value: string; swatches: string[]; onPick: (c: string) => void }) {
  return (
    <fieldset>
      <legend className="font-medium text-sand-800">{label}</legend>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {swatches.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`${label}: kleur ${c}`}
            aria-pressed={value.toLowerCase() === c}
            onClick={() => onPick(c)}
            className={`size-6 rounded-full border ${value.toLowerCase() === c ? "border-gold-600 ring-2 ring-gold-400" : "border-sand-300"}`}
            style={{ background: c }}
          />
        ))}
        <label className="relative size-6 cursor-pointer overflow-hidden rounded-full border border-dashed border-sand-400" title="Eigen kleur">
          <span className="sr-only">Eigen kleur voor {label.toLowerCase()}</span>
          <input type="color" value={value} onChange={(e) => onPick(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" />
          <span aria-hidden="true" className="flex size-full items-center justify-center text-sand-500">+</span>
        </label>
      </div>
    </fieldset>
  );
}

function Controls({ scene, preset }: { scene: Scene3D; preset: { name: ViewPreset; n: number } }) {
  const { camera, gl, invalidate } = useThree();
  const b = scene.bounds!;
  const center = useMemo(() => new THREE.Vector3((b.min[0] + b.max[0]) / 2, 0.8, (b.min[2] + b.max[2]) / 2), [b]);
  const radius = Math.max(b.max[0] - b.min[0], b.max[2] - b.min[2], 3);

  const controls = useMemo(() => {
    const c = new OrbitControls(camera, gl.domElement);
    c.enableDamping = false;
    c.maxPolarAngle = Math.PI / 2 - 0.02; // niet onder de vloer
    c.minDistance = 0.5;
    c.maxDistance = 200;
    return c;
  }, [camera, gl]);

  useEffect(() => {
    const onChange = () => invalidate();
    controls.addEventListener("change", onChange);
    return () => {
      controls.removeEventListener("change", onChange);
      controls.dispose();
    };
  }, [controls, invalidate]);

  // Camera instellen bij openen en bij het kiezen van een standpunt.
  useEffect(() => {
    const d = radius * 1.25;
    const positions: Record<ViewPreset, [number, number, number]> = {
      schuin: [center.x + d * 0.75, d * 0.85, center.z + d * 0.95],
      boven: [center.x, d * 1.6, center.z + 0.001],
      laag: [center.x + d * 0.2, 1.6, center.z + d * 0.9],
    };
    camera.position.set(...positions[preset.name]);
    controls.target.copy(preset.name === "laag" ? new THREE.Vector3(center.x, 1.2, center.z) : center);
    controls.update();
    invalidate();
    // Alleen bij een nieuw standpunt; niet bij elke bewerking terugspringen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, controls]);

  return null;
}
