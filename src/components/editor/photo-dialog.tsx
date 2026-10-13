"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildScene, type ProjectDocument } from "@/domain/project";
import { PhotoRender } from "@/components/three/photo-render";
import { defaultEyeCamera } from "@/lib/three/eye-camera";
import { downloadFile, safeFileName } from "@/lib/download";

const QUALITY = [
  { id: "concept", label: "Concept", samples: 64, hint: "Snel, nog wat korrelig" },
  { id: "hoog", label: "Hoog", samples: 256, hint: "Mooi resultaat" },
  { id: "presentatie", label: "Presentatie", samples: 1024, hint: "Ruisvrij, duurt langer" },
] as const;

/** Venster om een fotorealistische render van het ontwerp te maken en te downloaden. */
export function PhotoDialog({ doc, projectName, onClose }: { doc: ProjectDocument; projectName: string; onClose: () => void }) {
  const scene = useMemo(() => buildScene(doc.floors[0]!, doc.materials), [doc]);
  const [corner, setCorner] = useState(0);
  const [quality, setQuality] = useState<(typeof QUALITY)[number]["id"]>("hoog");
  const [run, setRun] = useState(0);
  const [image, setImage] = useState<HTMLCanvasElement | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const camera = useMemo(() => defaultEyeCamera(scene, corner), [scene, corner]);
  const samples = QUALITY.find((q) => q.id === quality)!.samples;

  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const restart = (fn: () => void) => {
    fn();
    setImage(null);
    setRun((r) => r + 1);
  };
  const onReady = useCallback((img: HTMLCanvasElement) => setImage(img), []);

  const download = () => {
    if (!image) return;
    downloadFile(`${safeFileName(projectName)} - render.jpg`, image.toDataURL("image/jpeg", 0.93));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4" role="presentation" onClick={onClose}>
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Fotorealistische render"
        className="w-full max-w-5xl rounded-2xl bg-white p-5 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-ink-950">Fotorealistische render</h2>
            <p className="text-sm text-sand-600">Op ooghoogte, met daglicht door de ramen. Het beeld wordt per stap scherper.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-sand-700 hover:bg-sand-100">Sluiten (Esc)</button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Kwaliteit" className="flex rounded-lg border border-sand-300 p-0.5">
            {QUALITY.map((q) => (
              <button key={q.id} type="button" title={q.hint} aria-pressed={quality === q.id} onClick={() => restart(() => setQuality(q.id))} className={`rounded-md px-3 py-1 text-sm ${quality === q.id ? "bg-ink-950 text-ivory" : "text-sand-700 hover:bg-sand-100"}`}>
                {q.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => restart(() => setCorner((c) => c + 1))} className="rounded-md border border-sand-300 px-3 py-1.5 text-sm hover:bg-sand-100">Ander standpunt</button>
          <div className="ml-auto">
            <button type="button" disabled={!image} onClick={download} className="rounded-full bg-gold-400 px-5 py-2 text-sm font-medium text-ink-950 hover:bg-gold-300 disabled:opacity-50">
              {image ? "Download afbeelding" : "Bezig met renderen…"}
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl bg-ink-950">
          <PhotoRender key={run} document={doc} camera={camera} width={1600} height={1000} samples={samples} onReady={onReady} />
        </div>
        <p className="mt-2 text-xs text-sand-500">Renderen gebeurt op je eigen computer; met een snelle videokaart gaat het veel sneller. Je kunt dit venster sluiten om te stoppen.</p>
      </div>
    </div>
  );
}
