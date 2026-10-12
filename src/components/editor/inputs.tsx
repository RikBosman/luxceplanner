"use client";

import { useId, useState } from "react";
import { parseLength } from "@/domain/project";

/** Invoer van een maat. Accepteert mm, cm of m; zonder eenheid mm. Toont de waarde in mm (afgerond voor weergave). */
export function DimensionInput({
  label,
  value,
  onCommit,
  min,
}: {
  label: string;
  value: number;
  onCommit: (mm: number) => void;
  min?: number;
}) {
  const id = useId();
  const shown = String(Math.round(value * 10) / 10);
  const [text, setText] = useState(shown);
  const [synced, setSynced] = useState(shown);
  const [error, setError] = useState<string | null>(null);
  if (synced !== shown) {
    // Waarde is van buitenaf gewijzigd (slepen, ongedaan maken): invoer bijwerken.
    setSynced(shown);
    setText(shown);
    setError(null);
  }
  const commit = () => {
    if (text.trim() === shown) return;
    const mm = parseLength(text);
    if (mm === null) return setError("Typ een maat, bijv. 4000, 400 cm of 4 m.");
    if (min !== undefined && mm < min) return setError(`Minimaal ${min} mm.`);
    setError(null);
    onCommit(mm);
  };
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-sand-700">{label}</label>
      <div className="flex items-center rounded-md border border-sand-300 bg-white focus-within:border-gold-500 aria-[invalid=true]:border-clay-500" aria-invalid={error ? true : undefined}>
        <input
          id={id}
          value={text}
          inputMode="decimal"
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setText(shown);
              setError(null);
            }
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-fout` : undefined}
          className="w-full min-w-0 rounded-md bg-transparent px-2 py-1.5 text-sm outline-none"
        />
        <span className="pr-2 text-xs text-sand-500">mm</span>
      </div>
      {error && <p id={`${id}-fout`} className="text-xs text-clay-600">{error}</p>}
    </div>
  );
}

export function NumberInput({ label, value, onCommit, suffix }: { label: string; value: number; onCommit: (v: number) => void; suffix?: string }) {
  const id = useId();
  const shown = String(Math.round(value * 10) / 10);
  const [text, setText] = useState(shown);
  const [synced, setSynced] = useState(shown);
  if (synced !== shown) {
    setSynced(shown);
    setText(shown);
  }
  const commit = () => {
    const v = Number(text.replace(",", "."));
    if (!Number.isFinite(v)) return setText(shown);
    if (String(v) !== shown) onCommit(v);
  };
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-sand-700">{label}</label>
      <div className="flex items-center rounded-md border border-sand-300 bg-white focus-within:border-gold-500">
        <input id={id} value={text} inputMode="decimal" onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} className="w-full min-w-0 rounded-md bg-transparent px-2 py-1.5 text-sm outline-none" />
        {suffix && <span className="pr-2 text-xs text-sand-500">{suffix}</span>}
      </div>
    </div>
  );
}

export function PanelButton({ children, onClick, tone = "default", title, disabled }: { children: React.ReactNode; onClick: () => void; tone?: "default" | "danger"; title?: string; disabled?: boolean }) {
  const cls = tone === "danger" ? "border-clay-500/40 text-clay-600 hover:bg-clay-500/10" : "border-sand-300 text-sand-800 hover:bg-sand-100";
  return (
    <button type="button" onClick={onClick} title={title} disabled={disabled} className={`rounded-md border bg-white px-2.5 py-1.5 text-sm disabled:opacity-50 ${cls}`}>
      {children}
    </button>
  );
}
