"use client";

import { useEffect, useRef, useState } from "react";
import { AI_STYLES, type AiStyle } from "@/lib/ai/prompt";
import { downloadFile, safeFileName } from "@/lib/download";

/** Venster voor een AI-render: foto-echte impressie van de huidige 3D-weergave. */
export function AiRenderDialog({ projectId, projectName, input, onClose }: { projectId: string; projectName: string; input: string; onClose: () => void }) {
  const [style, setStyle] = useState<AiStyle>("zoals-ontworpen");
  const [wish, setWish] = useState("");
  const [state, setState] = useState<{ status: "idle" | "busy" | "done" | "error"; image?: string; error?: string; remaining?: number; seconds?: number }>({ status: "idle" });
  const dialog = useRef<HTMLDivElement>(null);
  const started = useRef(0);

  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const generate = async () => {
    started.current = Date.now();
    setState({ status: "busy" });
    try {
      const res = await fetch("/api/ai-render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId, style, wish: wish.trim() || undefined, image: input, aspectRatio: "16:9" }),
      });
      const body = (await res.json().catch(() => ({}))) as { image?: string; error?: string; remaining?: number };
      if (!res.ok || !body.image) throw new Error(body.error ?? "Er ging iets mis bij het maken van de AI-render.");
      setState({ status: "done", image: body.image, remaining: body.remaining, seconds: Math.round((Date.now() - started.current) / 1000) });
    } catch (e) {
      setState({ status: "error", error: e instanceof Error ? e.message : "Er ging iets mis." });
    }
  };

  const download = () => {
    if (!state.image) return;
    downloadFile(`${safeFileName(projectName)} - AI-impressie.${state.image.startsWith("data:image/png") ? "png" : "jpg"}`, state.image);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4" role="presentation" onClick={onClose}>
      <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="AI-render" data-testid="ai-dialog" className="max-h-full w-full max-w-6xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl outline-none" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-ink-950">AI-render</h2>
            <p className="max-w-2xl text-sm text-sand-600">
              Een AI maakt van je 3D-weergave in enkele seconden een foto-echt beeld. Het is een <strong>impressie</strong>: de indeling blijft, maar details en exacte maten kunnen afwijken. Voor een maatvaste weergave gebruik je de fotorealistische render.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-sand-700 hover:bg-sand-100">Sluiten (Esc)</button>
        </div>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-sand-800">Stijl</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(Object.keys(AI_STYLES) as AiStyle[]).map((s) => (
              <button key={s} type="button" aria-pressed={style === s} onClick={() => setStyle(s)} className={`rounded-full border px-3 py-1.5 text-sm ${style === s ? "border-ink-950 bg-ink-950 text-ivory" : "border-sand-300 text-sand-800 hover:bg-sand-100"}`}>
                {AI_STYLES[s].label}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="mt-3 block text-sm font-medium text-sand-800">
          Eigen wens (optioneel)
          <input value={wish} maxLength={300} onChange={(e) => setWish(e.target.value)} placeholder="bijv. avondsfeer met kaarslicht, meer planten" className="mt-1 block w-full rounded-lg border border-sand-300 px-3 py-2 text-sm" />
        </label>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <figure>
            <figcaption className="mb-1 text-xs font-medium uppercase tracking-wide text-sand-500">Jouw 3D-weergave</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element -- lokale momentopname (data-URL) */}
            <img src={input} alt="Momentopname van de 3D-weergave" className="w-full rounded-xl border border-sand-200" />
          </figure>
          <figure>
            <figcaption className="mb-1 text-xs font-medium uppercase tracking-wide text-sand-500">AI-impressie</figcaption>
            <div className="flex aspect-[16/9] items-center justify-center overflow-hidden rounded-xl border border-sand-200 bg-sand-100">
              {state.status === "done" && state.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- resultaat als data-URL
                <img src={state.image} alt="AI-impressie van het ontwerp" data-testid="ai-result" className="h-full w-full object-cover" />
              ) : state.status === "busy" ? (
                <p role="status" className="animate-pulse text-sm text-sand-600">AI is bezig… dit duurt meestal 5–20 seconden.</p>
              ) : state.status === "error" ? (
                <p role="alert" className="px-6 text-center text-sm text-clay-600">{state.error}</p>
              ) : (
                <p className="px-6 text-center text-sm text-sand-500">Kies een stijl en klik op “Maak AI-render”.</p>
              )}
            </div>
          </figure>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={generate} disabled={state.status === "busy"} className="rounded-full bg-gold-400 px-5 py-2 text-sm font-medium text-ink-950 hover:bg-gold-300 disabled:opacity-60">
            {state.status === "done" ? "Opnieuw genereren" : "Maak AI-render"}
          </button>
          <button type="button" onClick={download} disabled={state.status !== "done"} className="rounded-full border border-sand-300 px-5 py-2 text-sm hover:bg-sand-100 disabled:opacity-50">Download</button>
          {state.status === "done" && (
            <p className="text-xs text-sand-500">
              Klaar in {state.seconds} s{state.remaining !== undefined ? ` · nog ${state.remaining} AI-renders vandaag` : ""}.
            </p>
          )}
          <p className="ml-auto text-xs text-sand-500">De momentopname en een beschrijving van je ontwerp worden naar Google Gemini gestuurd.</p>
        </div>
      </div>
    </div>
  );
}
