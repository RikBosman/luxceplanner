"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteFurniture,
  deleteOpening,
  deleteWall,
  duplicateFurniture,
  fitBounds,
  floorBounds,
  parseProjectDocument,
  rotateFurniture,
  screenToWorld,
  updateFurniture,
  zoomAt,
  type ProjectDocument,
  type Viewport,
} from "@/domain/project";
import { saveProjectDocument } from "@/lib/projects/actions";
import { AutosaveController, type AutosaveState } from "@/lib/editor/autosave";
import { LibraryPanel } from "./library-panel";
import { PlanCanvas } from "./plan-canvas";
import { PropertiesPanel } from "./properties-panel";
import { SaveStatus } from "./save-status";
import { useEditorState, type Tool } from "./use-editor-state";

const View3D = dynamic(() => import("./view-3d").then((m) => m.View3D), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center text-sm text-sand-600">3D-weergave laden…</div>,
});

const backupKey = (id: string) => `ruimte:backup:${id}`;

interface Backup {
  revision: number;
  savedAt: number;
  document: unknown;
}

function readBackup(id: string): Backup | null {
  try {
    const raw = window.localStorage.getItem(backupKey(id));
    return raw ? (JSON.parse(raw) as Backup) : null;
  } catch {
    return null;
  }
}

const TOOLS: { id: Tool; label: string; key: string }[] = [
  { id: "select", label: "Selecteren", key: "V" },
  { id: "wall", label: "Muur", key: "W" },
  { id: "door", label: "Deur", key: "D" },
  { id: "window", label: "Raam", key: "N" },
];

export function Editor({
  projectId,
  projectName,
  initialRevision,
  initialDocument,
}: {
  projectId: string;
  projectName: string;
  initialRevision: number;
  initialDocument: ProjectDocument;
}) {
  const editor = useEditorState(initialDocument);
  const [view, setView] = useState<"2d" | "3d">("2d");
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [saveState, setSaveState] = useState<AutosaveState>({ status: "saved", revision: initialRevision });
  const [restore, setRestore] = useState<ProjectDocument | null>(null);
  const autosave = useRef<AutosaveController<ProjectDocument> | null>(null);
  const floor = editor.doc.floors[0]!;

  // Canvasgrootte volgen.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({ width: Math.max(1, entry.contentRect.width), height: Math.max(1, entry.contentRect.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);

  const fit = useCallback(() => {
    const b = floorBounds(editor.committed.floors[0]!) ?? { minX: -500, minY: -500, maxX: 5000, maxY: 4000 };
    setViewport(fitBounds({ minX: b.minX - 600, minY: b.minY - 600, maxX: b.maxX + 600, maxY: b.maxY + 600 }, size.width, size.height, 24));
  }, [editor.committed, size]);

  // Eerste keer: alles in beeld zodra de grootte bekend is.
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || size.width < 50) return;
    fitted.current = true;
    fit();
  }, [fit, size]);

  // Autosave
  useEffect(() => {
    const controller = new AutosaveController<ProjectDocument>({
      revision: initialRevision,
      onChange: setSaveState,
      save: async (doc, expected) => {
        const r = await saveProjectDocument(projectId, expected, doc);
        return r.ok ? { ok: true, revision: r.revision } : { ok: false, reason: r.reason, message: r.message };
      },
    });
    autosave.current = controller;
    return () => controller.stop();
  }, [projectId, initialRevision]);

  const lastSent = useRef(initialDocument);
  useEffect(() => {
    if (editor.committed === lastSent.current) return;
    lastSent.current = editor.committed;
    autosave.current?.update(editor.committed);
  }, [editor.committed]);

  // Lokale back-up van niet-opgeslagen werk (bijv. bij netwerkstoring of een gesloten tabblad).
  useEffect(() => {
    try {
      if (saveState.status === "saved") window.localStorage.removeItem(backupKey(projectId));
      else window.localStorage.setItem(backupKey(projectId), JSON.stringify({ revision: saveState.revision, savedAt: Date.now(), document: editor.committed } satisfies Backup));
    } catch {
      // Opslag vol of uitgeschakeld: geen back-up mogelijk, de statusindicator waarschuwt al.
    }
  }, [saveState.status, saveState.revision, editor.committed, projectId]);

  // Bij openen: is er een back-up van niet-opgeslagen wijzigingen op deze versie?
  useEffect(() => {
    const backup = readBackup(projectId);
    if (!backup || backup.revision !== initialRevision) return;
    const parsed = parseProjectDocument(backup.document);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- eenmalig bij openen, localStorage is alleen in de browser beschikbaar
    if (parsed.ok && JSON.stringify(parsed.document) !== JSON.stringify(initialDocument)) setRestore(parsed.document);
  }, [projectId, initialRevision, initialDocument]);

  // Waarschuwen bij verlaten met niet-opgeslagen werk.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (autosave.current?.hasUnsavedChanges) {
        autosave.current.flush();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const download = useCallback(() => {
    const blob = new Blob([JSON.stringify(editor.committed, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "ontwerp"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [editor.committed, projectName]);

  const zoomBy = (factor: number) => viewport && setViewport(zoomAt(viewport, { x: size.width / 2, y: size.height / 2 }, factor));
  const viewCenter = () => (viewport ? screenToWorld(viewport, { x: size.width / 2, y: size.height / 2 }) : { x: 2000, y: 2000 });

  // Sneltoetsen (via refs, zodat de listener maar één keer wordt geregistreerd)
  const editorRef = useRef(editor);
  const actionsRef = useRef({ fit, zoomBy });
  useEffect(() => {
    editorRef.current = editor;
    actionsRef.current = { fit, zoomBy };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.closest("input, textarea, select, [contenteditable=true]") !== null)) return;
      const ed = editorRef.current;
      const fid = ed.doc.floors[0]!.id;
      const sel = ed.selection;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) ed.redo();
        else ed.undo();
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        ed.redo();
        return;
      }
      if (mod && key === "s") {
        e.preventDefault();
        autosave.current?.flush();
        return;
      }
      if (mod && key === "d" && sel?.kind === "furniture") {
        e.preventDefault();
        ed.apply((d) => {
          const r = duplicateFurniture(d, fid, sel.id);
          return { doc: r.doc, selection: { kind: "furniture", id: r.furnitureId } };
        });
        return;
      }
      if (mod || e.altKey) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        if (!sel) return;
        e.preventDefault();
        if (sel.kind === "wall") ed.apply((d) => ({ doc: deleteWall(d, fid, sel.id), selection: null }));
        if (sel.kind === "opening") ed.apply((d) => ({ doc: deleteOpening(d, fid, sel.id), selection: null }));
        if (sel.kind === "furniture") ed.apply((d) => ({ doc: deleteFurniture(d, fid, sel.id), selection: null }));
        return;
      }
      if (e.key === "Escape") {
        ed.select(null);
        ed.setTool("select");
        return;
      }
      if (sel?.kind === "furniture" && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const step = e.shiftKey ? 100 : 10;
        const item = ed.doc.floors[0]!.furniture.find((f) => f.id === sel.id);
        if (!item) return;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        ed.apply((d) => updateFurniture(d, fid, sel.id, { position: { x: item.position.x + dx, y: item.position.y + dy } }));
        return;
      }
      if (key === "r" && sel?.kind === "furniture") return ed.apply((d) => rotateFurniture(d, fid, sel.id, e.shiftKey ? -90 : 90));
      if (key === "v") return ed.setTool("select");
      if (key === "w") return ed.setTool("wall");
      if (key === "d") return ed.setTool("door");
      if (key === "n") return ed.setTool("window");
      if (key === "0") return actionsRef.current.fit();
      if (key === "+" || key === "=") return actionsRef.current.zoomBy(1.25);
      if (key === "-") return actionsRef.current.zoomBy(0.8);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toolHint = useMemo(() => {
    switch (editor.tool) {
      case "wall":
        return "Klik om een muur te beginnen, klik opnieuw voor elk volgend punt. Dubbelklik of Esc om te stoppen. Houd Alt ingedrukt om niet uit te lijnen.";
      case "door":
        return "Klik op een muur om een deur te plaatsen.";
      case "window":
        return "Klik op een muur om een raam te plaatsen.";
      default:
        return floor.walls.length === 0
          ? "Begin met een kamer via het paneel links, of teken muren met het muurgereedschap (W)."
          : "Klik op een element om het te selecteren. Sleep om te verplaatsen; sleep de lege ruimte om het beeld te verschuiven. Scroll om te zoomen.";
    }
  }, [editor.tool, floor.walls.length]);

  return (
    <div className="flex min-h-[520px] flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-sand-200 bg-white px-3 py-2">
        <Link href="/app" className="rounded-md px-2 py-1 text-sm text-sand-600 hover:bg-sand-100">← Mijn ontwerpen</Link>
        <h1 className="mr-2 max-w-[16rem] truncate text-sm font-semibold text-sand-900" title={projectName}>{projectName}</h1>

        <div role="group" aria-label="Weergave" className="flex rounded-lg border border-sand-300 p-0.5">
          {(["2d", "3d"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`rounded-md px-3 py-1 text-sm ${view === v ? "bg-gold-400 text-ink-950" : "text-sand-700 hover:bg-sand-100"}`}>
              {v.toUpperCase()}
            </button>
          ))}
        </div>

        {view === "2d" && (
          <div role="toolbar" aria-label="Gereedschap" className="flex rounded-lg border border-sand-300 p-0.5">
            {TOOLS.map((t) => (
              <button key={t.id} type="button" aria-pressed={editor.tool === t.id} title={`${t.label} (${t.key})`} onClick={() => editor.setTool(t.id)} className={`rounded-md px-3 py-1 text-sm ${editor.tool === t.id ? "bg-sand-800 text-white" : "text-sand-700 hover:bg-sand-100"}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-1">
          <button type="button" onClick={editor.undo} disabled={!editor.canUndo} title="Ongedaan maken (Ctrl+Z)" className="rounded-md border border-sand-300 px-2.5 py-1 text-sm disabled:opacity-40">↶ Ongedaan maken</button>
          <button type="button" onClick={editor.redo} disabled={!editor.canRedo} title="Opnieuw uitvoeren (Ctrl+Shift+Z)" className="rounded-md border border-sand-300 px-2.5 py-1 text-sm disabled:opacity-40">↷ Opnieuw</button>
        </div>

        {view === "2d" && (
          <div className="flex gap-1" aria-label="Zoom">
            <button type="button" onClick={() => zoomBy(0.8)} title="Uitzoomen (-)" aria-label="Uitzoomen" className="rounded-md border border-sand-300 px-2.5 py-1 text-sm">−</button>
            <button type="button" onClick={() => zoomBy(1.25)} title="Inzoomen (+)" aria-label="Inzoomen" className="rounded-md border border-sand-300 px-2.5 py-1 text-sm">+</button>
            <button type="button" onClick={fit} title="Alles in beeld (0)" className="rounded-md border border-sand-300 px-2.5 py-1 text-sm">Passend</button>
          </div>
        )}

        <div className="ml-auto">
          <SaveStatus state={saveState} onRetry={() => autosave.current?.retry()} onDownload={download} />
        </div>
      </div>

      {restore && (
        <div role="alert" className="flex flex-wrap items-center gap-3 border-b border-sand-300 bg-sand-100 px-4 py-2 text-sm">
          <span>Er zijn niet-opgeslagen wijzigingen van een eerdere sessie gevonden op dit apparaat.</span>
          <button type="button" className="font-semibold text-gold-700 underline" onClick={() => { editor.replace(restore); setRestore(null); }}>Herstellen</button>
          <button type="button" className="text-sand-700 underline" onClick={() => { try { window.localStorage.removeItem(backupKey(projectId)); } catch {} setRestore(null); }}>Negeren</button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {view === "2d" && (
          <aside aria-label="Bibliotheek" className="hidden w-64 shrink-0 overflow-y-auto border-r border-sand-200 bg-sand-50 md:block">
            <LibraryPanel editor={editor} viewCenter={viewCenter} />
          </aside>
        )}
        <div className="relative min-w-0 flex-1">
          <div ref={containerRef} className="absolute inset-0">
            {view === "2d" ? (
              viewport && <PlanCanvas editor={editor} viewport={viewport} onViewportChange={setViewport} size={size} />
            ) : (
              <View3D editor={editor} />
            )}
          </div>
          {view === "2d" && (
            <p className="pointer-events-none absolute bottom-3 left-3 right-3 mx-auto w-fit max-w-full rounded-lg bg-white/90 px-3 py-1.5 text-center text-xs text-sand-700 shadow-sm">{toolHint}</p>
          )}
          {editor.message && (
            <div role={editor.message.tone === "error" ? "alert" : "status"} className={`absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-3 rounded-lg px-4 py-2 text-sm shadow ${editor.message.tone === "error" ? "bg-clay-600 text-white" : "bg-sand-800 text-white"}`}>
              {editor.message.text}
              <button type="button" onClick={editor.clearMessage} aria-label="Melding sluiten" className="opacity-80 hover:opacity-100">✕</button>
            </div>
          )}
          <p className="absolute left-3 top-3 rounded bg-white/80 px-2 py-1 text-xs text-sand-600 md:hidden">
            Tip: op een groter scherm heb je toegang tot de meubelbibliotheek en alle bewerkingen.
          </p>
        </div>
        <aside aria-label="Eigenschappen" className="hidden w-72 shrink-0 overflow-y-auto border-l border-sand-200 bg-white lg:block">
          <PropertiesPanel editor={editor} />
        </aside>
      </div>
    </div>
  );
}
