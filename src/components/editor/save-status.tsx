"use client";

import type { AutosaveState } from "@/lib/editor/autosave";

const timeFormat = new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit" });

export function SaveStatus({ state, onRetry, onDownload }: { state: AutosaveState; onRetry: () => void; onDownload: () => void }) {
  const base = "flex items-center gap-2 rounded-full px-3 py-1 text-xs";
  switch (state.status) {
    case "saved":
      return (
        <p role="status" data-testid="save-status" data-status="saved" className={`${base} text-gold-700`}>
          <span aria-hidden="true" className="size-2 rounded-full bg-gold-500" />
          {state.lastSavedAt ? `Opgeslagen om ${timeFormat.format(state.lastSavedAt)}` : "Alles opgeslagen"}
        </p>
      );
    case "pending":
      return <p role="status" data-testid="save-status" data-status="pending" className={`${base} text-sand-700`}><span aria-hidden="true" className="size-2 rounded-full bg-sand-400" />Wijzigingen nog niet opgeslagen</p>;
    case "saving":
      return <p role="status" data-testid="save-status" data-status="saving" className={`${base} text-sand-700`}><span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-gold-400" />Opslaan…</p>;
    case "error":
      return (
        <div role="alert" data-testid="save-status" data-status="error" className={`${base} bg-clay-500/10 text-clay-600`}>
          <span>Opslaan mislukt: {state.message} We proberen het automatisch opnieuw.</span>
          <button type="button" onClick={onRetry} className="font-semibold underline">Nu opnieuw</button>
        </div>
      );
    case "unauthenticated":
      return (
        <div role="alert" data-testid="save-status" data-status="unauthenticated" className={`${base} bg-clay-500/10 text-clay-600`}>
          <span>Je sessie is verlopen; wijzigingen zijn niet opgeslagen.</span>
          <a href="/inloggen" target="_blank" rel="noopener" className="font-semibold underline">Log opnieuw in</a>
          <button type="button" onClick={onRetry} className="font-semibold underline">Daarna opnieuw opslaan</button>
        </div>
      );
    case "conflict":
      return (
        <div role="alert" data-testid="save-status" data-status="conflict" className={`${base} bg-clay-500/10 text-clay-600`}>
          <span>{state.message} Om niets te overschrijven slaan we hier niet meer op.</span>
          <button type="button" onClick={onDownload} className="font-semibold underline">Download jouw versie</button>
          <button type="button" onClick={() => window.location.reload()} className="font-semibold underline">Laatste versie laden</button>
        </div>
      );
  }
}
