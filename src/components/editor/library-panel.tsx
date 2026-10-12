"use client";

import { useState } from "react";
import { addFurniture, addRectangularRoom, FURNITURE_CATALOG, floorBounds, parseLength, type Point } from "@/domain/project";
import { furnitureSymbol } from "@/components/plan/furniture-symbol";
import type { EditorApi } from "./use-editor-state";

const CATEGORY_LABELS: Record<string, string> = {
  woonkamer: "Woonkamer",
  eetkamer: "Eetkamer",
  slaapkamer: "Slaapkamer",
  werkkamer: "Werkkamer",
  keuken: "Keuken",
  badkamer: "Badkamer",
};

export function LibraryPanel({ editor, viewCenter }: { editor: EditorApi; viewCenter: () => Point }) {
  const floor = editor.doc.floors[0]!;
  const categories = [...new Set(FURNITURE_CATALOG.map((c) => c.category))];

  return (
    <div className="space-y-6 p-4">
      <AddRoomForm
        hasWalls={floor.walls.length > 0}
        onAdd={(w, l) => {
          // Nieuwe kamer naast de bestaande plattegrond, zodat niets overlapt.
          const b = floorBounds(floor);
          const origin = b ? { x: Math.ceil((b.maxX + 1000) / 100) * 100, y: Math.round(b.minY / 100) * 100 + 50 } : { x: 0, y: 0 };
          editor.apply((d) => addRectangularRoom(d, floor.id, w, l, origin));
        }}
      />
      <section aria-labelledby="bibliotheek">
        <h2 id="bibliotheek" className="text-sm font-semibold text-sand-900">Meubels</h2>
        <p className="mt-1 text-xs text-sand-600">Klik om toe te voegen in het midden van je beeld; sleep daarna naar de juiste plek.</p>
        {categories.map((cat) => (
          <div key={cat} className="mt-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-sand-500">{CATEGORY_LABELS[cat] ?? cat}</h3>
            <ul className="mt-1.5 grid grid-cols-2 gap-1.5">
              {FURNITURE_CATALOG.filter((c) => c.category === cat).map((item) => (
                <li key={item.catalogId}>
                  <button
                    type="button"
                    onClick={() => {
                      // Midden van het beeld; schuif op als daar al iets staat, zodat niets precies overlapt.
                      const c = viewCenter();
                      let at = { x: Math.round(c.x / 10) * 10, y: Math.round(c.y / 10) * 10 };
                      while (floor.furniture.some((f) => Math.abs(f.position.x - at.x) < 50 && Math.abs(f.position.y - at.y) < 50)) {
                        at = { x: at.x + 300, y: at.y + 300 };
                      }
                      editor.setTool("select");
                      editor.apply((d) => {
                        const r = addFurniture(d, floor.id, item.catalogId, at);
                        return { doc: r.doc, selection: { kind: "furniture", id: r.furnitureId } };
                      });
                    }}
                    className="flex w-full flex-col items-center gap-1 rounded-lg border border-sand-200 bg-white p-2 text-center text-xs text-sand-800 hover:border-gold-400 hover:bg-gold-50"
                    title={`${item.name} — ${item.width} × ${item.depth} × ${item.height} mm`}
                  >
                    <svg viewBox={`${-item.width / 2 - 60} ${-item.depth / 2 - 60} ${item.width + 120} ${item.depth + 120}`} className="h-10 w-full" aria-hidden="true">
                      {furnitureSymbol(item.kind, item.width, item.depth)}
                    </svg>
                    <span>{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

function AddRoomForm({ onAdd, hasWalls }: { onAdd: (width: number, length: number) => void; hasWalls: boolean }) {
  const [width, setWidth] = useState("4 m");
  const [length, setLength] = useState("5 m");
  const [error, setError] = useState<string | null>(null);
  return (
    <section aria-labelledby="kamer-toevoegen">
      <h2 id="kamer-toevoegen" className="text-sm font-semibold text-sand-900">{hasWalls ? "Kamer toevoegen" : "Begin met een kamer"}</h2>
      <form
        className="mt-2 space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          const w = parseLength(width);
          const l = parseLength(length);
          if (w === null || l === null || w < 500 || l < 500 || w > 50_000 || l > 50_000) {
            setError("Vul maten in tussen 0,5 en 50 m, bijv. 4 m of 4000.");
            return;
          }
          setError(null);
          onAdd(w, l);
        }}
      >
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-medium text-sand-700">
            Breedte
            <input value={width} onChange={(e) => setWidth(e.target.value)} className="mt-1 block w-full rounded-md border border-sand-300 bg-white px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs font-medium text-sand-700">
            Lengte
            <input value={length} onChange={(e) => setLength(e.target.value)} className="mt-1 block w-full rounded-md border border-sand-300 bg-white px-2 py-1.5 text-sm" />
          </label>
        </div>
        {error && <p role="alert" className="text-xs text-clay-600">{error}</p>}
        <button type="submit" className="w-full rounded-md bg-gold-400 px-3 py-1.5 text-sm font-medium text-ink-950 hover:bg-gold-300">Rechthoekige kamer toevoegen</button>
        <p className="text-xs text-sand-500">Binnenmaten. Of teken zelf muren met het muurgereedschap (W).</p>
      </form>
    </section>
  );
}
