"use client";

/**
 * Realistische weergave van een 3D-scène (uit buildScene): afgeronde vormen, cilinders en bollen,
 * fysiek gebaseerde materialen, procedurele houtvloer en stucwerk, zachte schaduwen en warm lamplicht.
 * Gedeeld door de interactieve 3D-weergave in de studio en de gerenderde voorbeelden op de website.
 */
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Scene3D } from "@/domain/project";
import { createGeometry, createMaterial, createTextures, loadSceneModels, type Textures } from "@/lib/three/scene-objects";

/** Hoogte (m) waarop muren aan de camerakant worden afgesneden. */
export const CUTAWAY_HEIGHT = 0.4;

// ---------------------------------------------------------------------------- Scène

export function RoomMeshes({ scene, cutaway }: { scene: Scene3D; cutaway: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const textures = useMemo<Textures>(() => createTextures(), []);
  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures]);

  // Realistische modellen asynchroon laden; tot dan (of als laden mislukt) de eigen vorm tonen.
  const [models, setModels] = useState<{ scene: Scene3D; objects: THREE.Object3D[] }>({ scene, objects: [] });
  useEffect(() => {
    let cancelled = false;
    loadSceneModels(scene).then((objects) => {
      if (!cancelled) setModels({ scene, objects });
    });
    return () => {
      cancelled = true;
    };
  }, [scene]);
  const modelObjects = useMemo(() => (models.scene === scene ? models.objects : []), [models, scene]);
  const loadedSources = useMemo(() => new Set(modelObjects.map((o) => o.userData.sourceId as string)), [modelObjects]);
  useEffect(() => invalidate(), [modelObjects, invalidate]);

  const items = useMemo(() => scene.boxes.map((b) => ({ b, geometry: createGeometry(b), material: createMaterial(b, textures) })), [scene, textures]);
  useEffect(
    () => () => {
      for (const { geometry, material } of items) {
        geometry.dispose();
        material.dispose();
      }
    },
    [items],
  );
  useEffect(() => invalidate(), [items, cutaway, invalidate]);

  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const b = scene.bounds!;
  const cx = (b.min[0] + b.max[0]) / 2;
  const cz = (b.min[2] + b.max[2]) / 2;

  // Poppenhuisweergave: muren tussen camera en het midden van de kamer worden verlaagd.
  useFrame(({ camera }) => {
    const camX = camera.position.x - cx;
    const camZ = camera.position.z - cz;
    const fromAbove = camera.position.y > Math.hypot(camX, camZ) * 2.5;
    items.forEach(({ b: box }, i) => {
      const mesh = meshes.current[i];
      if (!mesh || box.kind === "furniture") return;
      const [x, y, z] = box.center;
      const bottom = y - box.size[1] / 2;
      const front = cutaway && !fromAbove && (x - cx) * camX + (z - cz) * camZ > 0.05;
      if (!front || bottom + box.size[1] <= CUTAWAY_HEIGHT) {
        mesh.visible = true;
        mesh.scale.y = 1;
        mesh.position.y = y;
      } else if (bottom >= CUTAWAY_HEIGHT) {
        mesh.visible = false;
      } else {
        const h = CUTAWAY_HEIGHT - bottom;
        mesh.visible = true;
        mesh.scale.y = h / box.size[1];
        mesh.position.y = bottom + h / 2;
      }
    });
  });

  return (
    <group>
      {scene.floors.map((f) => (
        <FloorMesh key={f.id} polygon={f.polygon} color={f.color} planks={textures.planks} />
      ))}
      {modelObjects.map((o, i) => (
        <primitive key={`model-${i}`} object={o} />
      ))}
      {items.map(({ b: box, geometry, material }, i) => (
        <mesh
          visible={!loadedSources.has(box.sourceId)}
          key={`${box.sourceId}-${i}`}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          geometry={geometry}
          material={material}
          position={box.center}
          rotation={[0, box.rotationY, 0]}
          castShadow={box.kind !== "window-glass" && box.finish !== "light"}
          receiveShadow
        />
      ))}
      {scene.lights.map((l, i) => (
        <pointLight key={i} position={l} color="#ffc98a" intensity={1.6} distance={4.5} decay={2} />
      ))}
    </group>
  );
}

function FloorMesh({ polygon, color, planks }: { polygon: [number, number][]; color: string; planks: THREE.Texture }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape(polygon.map(([x, z]) => new THREE.Vector2(x, z)));
    const g = new THREE.ShapeGeometry(shape);
    g.rotateX(Math.PI / 2); // (x, y) van de vorm → (x, 0, z) in de scène
    return g;
  }, [polygon]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[0, 0.001, 0]} receiveShadow>
      <meshStandardMaterial color={color} map={planks} side={THREE.DoubleSide} roughness={0.62} />
    </mesh>
  );
}

/**
 * Belichting: zachte omgevingsreflecties (RoomEnvironment, geen externe bestanden), warm hemellicht en een
 * "zon" met zachte schaduwen. `soft` geeft hogere schaduwkwaliteit (voor gerenderde beelden).
 */
export function StudioLighting({ scene, quality = "interactive" }: { scene: Scene3D; quality?: "interactive" | "render" }) {
  const { gl, invalidate } = useThree();
  const environment = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return texture;
  }, [gl]);
  useEffect(() => {
    invalidate();
    return () => environment.dispose();
  }, [environment, invalidate]);

  const b = scene.bounds!;
  const cx = (b.min[0] + b.max[0]) / 2;
  const cz = (b.min[2] + b.max[2]) / 2;
  const span = Math.max(b.max[0] - b.min[0], b.max[2] - b.min[2], 3);
  const light = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const l = light.current;
    if (!l) return;
    l.target.position.set(cx, 0, cz);
    l.target.updateMatrixWorld();
    const cam = l.shadow.camera;
    cam.left = cam.bottom = -span * 0.8;
    cam.right = cam.top = span * 0.8;
    cam.near = 0.5;
    cam.far = span * 4;
    cam.updateProjectionMatrix();
    l.shadow.needsUpdate = true;
    invalidate();
  }, [cx, cz, span, invalidate]);

  const mapSize = quality === "render" ? 4096 : 2048;
  return (
    <>
      <primitive object={environment} attach="environment" />
      <hemisphereLight args={["#fff3e2", "#5a4638", 0.35]} />
      <directionalLight
        ref={light}
        position={[cx - span * 0.6, span * 1.4, cz - span * 0.9]}
        intensity={1.55}
        color="#ffe8cc"
        castShadow
        shadow-mapSize-width={mapSize}
        shadow-mapSize-height={mapSize}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-radius={quality === "render" ? 6 : 4}
      />
      <directionalLight position={[cx + span, span * 0.8, cz + span]} intensity={0.22} color="#ffe9d0" />
    </>
  );
}
