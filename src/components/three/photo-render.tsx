"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildScene, type ProjectDocument } from "@/domain/project";
import { defaultEyeCamera, type PhotoCamera } from "@/lib/three/eye-camera";
import { PhotoRenderer, removeFireflies } from "@/lib/three/photo-renderer";

/** Rendert een ontwerp fotorealistisch in een canvas, met voortgang. */
export function PhotoRender({
  document: doc,
  camera,
  width,
  height,
  samples,
  className,
  onReady,
}: {
  document: ProjectDocument;
  camera?: PhotoCamera;
  width: number;
  height: number;
  samples: number;
  className?: string;
  /** Wordt aangeroepen met het eindbeeld (na ruisfilter) zodra het renderen klaar is. */
  onReady?: (image: HTMLCanvasElement) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const output = useRef<HTMLCanvasElement>(null);
  const [finished, setFinished] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const scene = useMemo(() => buildScene(doc.floors[0]!, doc.materials), [doc]);

  useEffect(() => {
    if (!canvas.current || !scene.bounds) return;
    let renderer: PhotoRenderer | null = null;
    try {
      renderer = new PhotoRenderer({
        canvas: canvas.current,
        width,
        height,
        scene,
        camera: camera ?? defaultEyeCamera(scene),
        samples,
        onProgress: (n, t) => setProgress(n / t),
        onDone: () => {
          if (canvas.current && output.current) {
            removeFireflies(canvas.current, output.current);
            setFinished(true);
            onReady?.(output.current);
          }
          document.body.dataset.renderReady = "1";
        },
      });
      renderer.start().catch((e) => {
        console.error(e);
        setError("Het renderen is mislukt.");
      });
    } catch (e) {
      console.error(e);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- foutmelding als WebGL2 of de renderer niet beschikbaar is
      setError("Fotorealistisch renderen wordt niet ondersteund door deze browser of grafische kaart.");
    }
    return () => renderer?.dispose();
  }, [scene, camera, width, height, samples, onReady]);

  return (
    <div className={className}>
      <canvas ref={canvas} width={width} height={height} style={{ width: "100%", height: "auto", display: finished ? "none" : "block" }} data-testid="photo-canvas" />
      <canvas ref={output} style={{ width: "100%", height: "auto", display: finished ? "block" : "none" }} data-testid="photo-output" />
      {error ? (
        <p role="alert" className="mt-2 text-sm text-clay-600">{error}</p>
      ) : (
        progress < 1 && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded bg-sand-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <div className="h-full bg-gold-400 transition-[width]" style={{ width: `${progress * 100}%` }} />
          </div>
        )
      )}
    </div>
  );
}
