"use client";

import {
  deleteFurniture,
  deleteOpening,
  deleteWall,
  duplicateFurniture,
  formatArea,
  formatLength,
  polygonArea,
  rotateFurniture,
  setAllWallHeights,
  setFurnitureColor,
  getCatalogItem,
  setWallInnerLength,
  updateFurniture,
  updateOpening,
  updateSettings,
  updateWall,
  wallInnerLength,
  wallLength,
  type ProjectDocument,
} from "@/domain/project";
import { DimensionInput, NumberInput, PanelButton } from "./inputs";
import type { EditorApi } from "./use-editor-state";

export function PropertiesPanel({ editor }: { editor: EditorApi }) {
  const { doc, selection } = editor;
  const floor = doc.floors[0]!;
  const fid = floor.id;

  if (selection?.kind === "wall") {
    const w = floor.walls.find((x) => x.id === selection.id);
    if (!w) return null;
    return (
      <Panel title="Muur" onClose={() => editor.select(null)}>
        <DimensionInput label="Lengte (binnenmaat)" value={wallInnerLength(floor, w)} min={100} onCommit={(v) => editor.apply((d) => setWallInnerLength(d, fid, w.id, v))} />
        <p className="text-xs text-sand-500">Hartlijn: {formatLength(wallLength(w))}</p>
        <DimensionInput label="Dikte" value={w.thickness} min={20} onCommit={(v) => editor.apply((d) => updateWall(d, fid, w.id, { thickness: v }))} />
        <DimensionInput label="Hoogte" value={w.height} min={100} onCommit={(v) => editor.apply((d) => updateWall(d, fid, w.id, { height: v }))} />
        <p className="text-xs text-sand-600">Sleep de muur om hem te verschuiven, of de ronde punten om de hoeken te verplaatsen. Aansluitende muren bewegen mee.</p>
        <PanelButton tone="danger" onClick={() => editor.apply((d) => ({ doc: deleteWall(d, fid, w.id), selection: null }))}>Muur verwijderen</PanelButton>
      </Panel>
    );
  }

  if (selection?.kind === "opening") {
    const o = floor.openings.find((x) => x.id === selection.id);
    if (!o) return null;
    const label = o.type === "door" ? "Deur" : "Raam";
    return (
      <Panel title={label} onClose={() => editor.select(null)}>
        <DimensionInput label="Breedte" value={o.width} min={200} onCommit={(v) => editor.apply((d) => updateOpening(d, fid, o.id, { width: v }))} />
        <DimensionInput label="Hoogte" value={o.height} min={200} onCommit={(v) => editor.apply((d) => updateOpening(d, fid, o.id, { height: v }))} />
        {o.type === "window" && (
          <DimensionInput label="Borstwering (hoogte onderkant)" value={o.sillHeight} min={0} onCommit={(v) => editor.apply((d) => updateOpening(d, fid, o.id, { sillHeight: v }))} />
        )}
        <DimensionInput label="Positie (midden, vanaf begin muur)" value={o.offset} min={0} onCommit={(v) => editor.apply((d) => updateOpening(d, fid, o.id, { offset: v }))} />
        {o.type === "door" && (
          <div className="flex flex-wrap gap-2">
            <PanelButton onClick={() => editor.apply((d) => updateOpening(d, fid, o.id, { swing: o.swing === "left" ? "right" : "left" }))}>Scharnier wisselen</PanelButton>
            <PanelButton onClick={() => editor.apply((d) => updateOpening(d, fid, o.id, { flipped: !o.flipped }))}>Draairichting omkeren</PanelButton>
          </div>
        )}
        <PanelButton tone="danger" onClick={() => editor.apply((d) => ({ doc: deleteOpening(d, fid, o.id), selection: null }))}>{label} verwijderen</PanelButton>
      </Panel>
    );
  }

  if (selection?.kind === "furniture") {
    const f = floor.furniture.find((x) => x.id === selection.id);
    if (!f) return null;
    return (
      <Panel title={f.name} onClose={() => editor.select(null)}>
        <div className="grid grid-cols-2 gap-2">
          <DimensionInput label="Breedte" value={f.width} min={10} onCommit={(v) => editor.apply((d) => updateFurniture(d, fid, f.id, { width: v }))} />
          <DimensionInput label="Diepte" value={f.depth} min={10} onCommit={(v) => editor.apply((d) => updateFurniture(d, fid, f.id, { depth: v }))} />
          <DimensionInput label="Hoogte" value={f.height} min={10} onCommit={(v) => editor.apply((d) => updateFurniture(d, fid, f.id, { height: v }))} />
          <NumberInput label="Draaiing" suffix="°" value={f.rotation} onCommit={(v) => editor.apply((d) => updateFurniture(d, fid, f.id, { rotation: v }))} />
          <DimensionInput label="Positie x" value={f.position.x} onCommit={(v) => editor.apply((d) => updateFurniture(d, fid, f.id, { position: { ...f.position, x: v } }))} />
          <DimensionInput label="Positie y" value={f.position.y} onCommit={(v) => editor.apply((d) => updateFurniture(d, fid, f.id, { position: { ...f.position, y: v } }))} />
        </div>
        <div className="flex flex-wrap gap-2">
          <PanelButton title="Sneltoets: Shift+R" onClick={() => editor.apply((d) => rotateFurniture(d, fid, f.id, -90))}>↺ 90°</PanelButton>
          <PanelButton title="Sneltoets: R" onClick={() => editor.apply((d) => rotateFurniture(d, fid, f.id, 90))}>↻ 90°</PanelButton>
          <PanelButton title="Sneltoets: Ctrl+D" onClick={() => editor.apply((d) => { const r = duplicateFurniture(d, fid, f.id); return { doc: r.doc, selection: { kind: "furniture", id: r.furnitureId } }; })}>Dupliceren</PanelButton>
        </div>
        <label className="flex items-center justify-between gap-2 text-xs font-medium text-sand-700">
          Kleur (3D)
          <input
            type="color"
            value={doc.materials.find((m) => m.id === f.materialId)?.color ?? getCatalogItem(f.catalogId)?.color ?? "#b9a88f"}
            onChange={(e) => editor.apply((d) => setFurnitureColor(d, fid, f.id, e.target.value))}
            className="h-8 w-14 cursor-pointer rounded border border-sand-300 bg-white"
          />
        </label>
        <PanelButton tone="danger" onClick={() => editor.apply((d) => ({ doc: deleteFurniture(d, fid, f.id), selection: null }))}>Verwijderen</PanelButton>
      </Panel>
    );
  }

  if (selection?.kind === "room") {
    const r = floor.rooms.find((x) => x.id === selection.id);
    if (!r) return null;
    return (
      <Panel title={r.name} onClose={() => editor.select(null)}>
        <p className="text-sm text-sand-700">Vloeroppervlak: <strong>{formatArea(polygonArea(r.polygon))}</strong></p>
        <p className="text-xs text-sand-600">De vloer volgt de binnenmaat van de kamer zoals die is aangemaakt.</p>
      </Panel>
    );
  }

  return <Overview doc={doc} editor={editor} />;
}

function Overview({ doc, editor }: { doc: ProjectDocument; editor: EditorApi }) {
  const floor = doc.floors[0]!;
  const area = floor.rooms.reduce((s, r) => s + polygonArea(r.polygon), 0);
  return (
    <div className="space-y-5 p-4">
      <section>
        <h2 className="text-sm font-semibold text-sand-900">Ontwerp</h2>
        <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
          <dt className="text-sand-600">Vloeroppervlak</dt><dd>{formatArea(area)}</dd>
          <dt className="text-sand-600">Muren</dt><dd>{floor.walls.length}</dd>
          <dt className="text-sand-600">Deuren/ramen</dt><dd>{floor.openings.length}</dd>
          <dt className="text-sand-600">Meubels</dt><dd>{floor.furniture.length}</dd>
        </dl>
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-sand-900">Instellingen</h2>
        <label className="flex items-center gap-2 text-sm text-sand-800">
          <input type="checkbox" className="size-4 accent-moss-600" checked={doc.settings.snapToGrid} onChange={(e) => editor.apply((d) => updateSettings(d, { snapToGrid: e.target.checked }))} />
          Uitlijnen op raster ({formatLength(doc.settings.gridSize)})
        </label>
        <DimensionInput label="Muurhoogte (alle muren)" value={doc.settings.defaultWallHeight} min={1000} onCommit={(v) => editor.apply((d) => setAllWallHeights(d, floor.id, v))} />
        <DimensionInput label="Dikte nieuwe muren" value={doc.settings.defaultWallThickness} min={20} onCommit={(v) => editor.apply((d) => updateSettings(d, { defaultWallThickness: v }))} />
      </section>
      <section>
        <h2 className="text-sm font-semibold text-sand-900">Elementen</h2>
        <p className="mt-1 text-xs text-sand-600">Kies een element om het te selecteren en te bewerken.</p>
        <ul className="mt-2 max-h-72 space-y-0.5 overflow-auto text-sm">
          {floor.rooms.map((r) => <ElementButton key={r.id} label={`${r.name} (${formatArea(polygonArea(r.polygon))})`} onClick={() => editor.select({ kind: "room", id: r.id })} />)}
          {floor.walls.map((w, i) => <ElementButton key={w.id} label={`Muur ${i + 1} (${formatLength(wallInnerLength(floor, w))})`} onClick={() => editor.select({ kind: "wall", id: w.id })} />)}
          {floor.openings.map((o, i) => <ElementButton key={o.id} label={`${o.type === "door" ? "Deur" : "Raam"} ${i + 1} (${formatLength(o.width)})`} onClick={() => editor.select({ kind: "opening", id: o.id })} />)}
          {floor.furniture.map((f) => <ElementButton key={f.id} label={f.name} onClick={() => editor.select({ kind: "furniture", id: f.id })} />)}
        </ul>
      </section>
      <section>
        <h2 className="text-sm font-semibold text-sand-900">Sneltoetsen</h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-sand-700">
          <dt><kbd>V</kbd></dt><dd>Selecteren</dd>
          <dt><kbd>W</kbd></dt><dd>Muur tekenen (Esc of dubbelklik stopt)</dd>
          <dt><kbd>D</kbd> / <kbd>N</kbd></dt><dd>Deur / raam plaatsen</dd>
          <dt><kbd>R</kbd></dt><dd>Meubel 90° draaien</dd>
          <dt><kbd>Del</kbd></dt><dd>Selectie verwijderen</dd>
          <dt><kbd>Ctrl+Z</kbd></dt><dd>Ongedaan maken</dd>
          <dt><kbd>Ctrl+Shift+Z</kbd></dt><dd>Opnieuw uitvoeren</dd>
          <dt><kbd>Pijltjes</kbd></dt><dd>Meubel 1 cm verschuiven (Shift: 10 cm)</dd>
          <dt><kbd>Alt</kbd></dt><dd>Tijdelijk niet uitlijnen</dd>
          <dt><kbd>0</kbd></dt><dd>Alles in beeld</dd>
        </dl>
      </section>
    </div>
  );
}

function ElementButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <li>
      <button type="button" onClick={onClick} className="w-full truncate rounded px-2 py-1 text-left text-sand-800 hover:bg-sand-100">{label}</button>
    </li>
  );
}

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <section aria-label={`Eigenschappen: ${title}`} className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-sand-900">{title}</h2>
        <button type="button" onClick={onClose} className="rounded px-2 py-1 text-xs text-sand-600 hover:bg-sand-100">Sluiten (Esc)</button>
      </div>
      {children}
    </section>
  );
}
