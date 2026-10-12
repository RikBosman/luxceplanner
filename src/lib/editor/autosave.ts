/**
 * Autosave met debounce, maximaal één verzoek tegelijk en automatisch opnieuw proberen.
 *
 * - Wijzigingen worden pas na `delay` ms rust opgeslagen (geen verzoek per muisbeweging).
 * - Er is nooit meer dan één opslagverzoek tegelijk onderweg; wat tussentijds verandert, gaat in het
 *   volgende verzoek mee. Elk verzoek stuurt de revisie die het verwacht; de database weigert opslag als
 *   die niet klopt. Zo kan een oudere versie nooit een nieuwere overschrijven.
 * - Bij een netwerk- of serverfout blijft de wijziging bewaard en wordt het opnieuw geprobeerd (met
 *   oplopende wachttijd). De gebruiker ziet dit in de statusindicator.
 */
export type AutosaveStatus = "saved" | "pending" | "saving" | "error" | "conflict" | "unauthenticated";

export type SaveOutcome =
  | { ok: true; revision: number }
  | { ok: false; reason: "conflict" | "not_found" | "invalid" | "unauthenticated" | "error"; message: string };

export interface AutosaveOptions<T> {
  revision: number;
  save: (doc: T, expectedRevision: number) => Promise<SaveOutcome>;
  onChange: (state: AutosaveState) => void;
  delay?: number;
  maxRetryDelay?: number;
  timers?: { set: (fn: () => void, ms: number) => unknown; clear: (handle: unknown) => void };
}

export interface AutosaveState {
  status: AutosaveStatus;
  revision: number;
  message?: string;
  lastSavedAt?: number;
}

export class AutosaveController<T> {
  private latest: T | undefined;
  private dirty = false;
  private inFlight = false;
  private timer: unknown = null;
  private failures = 0;
  private stopped = false;
  private state: AutosaveState;
  private readonly delay: number;
  private readonly maxRetryDelay: number;
  private readonly timers: NonNullable<AutosaveOptions<T>["timers"]>;

  constructor(private readonly opts: AutosaveOptions<T>) {
    this.delay = opts.delay ?? 1200;
    this.maxRetryDelay = opts.maxRetryDelay ?? 30_000;
    this.timers = opts.timers ?? { set: (fn, ms) => setTimeout(fn, ms), clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>) };
    this.state = { status: "saved", revision: opts.revision };
  }

  get current(): AutosaveState {
    return this.state;
  }

  get hasUnsavedChanges(): boolean {
    return this.dirty || this.inFlight;
  }

  /** Meld een nieuwe versie van het document. */
  update(doc: T): void {
    if (this.stopped) return;
    this.latest = doc;
    this.dirty = true;
    if (!this.inFlight && this.state.status !== "error") this.setState({ status: "pending" });
    this.schedule(this.delay);
  }

  /** Sla direct op (bijv. bij Ctrl+S of het verlaten van de pagina). */
  flush(): void {
    if (this.stopped) return;
    this.clearTimer();
    void this.run();
  }

  /** Handmatig opnieuw proberen na een fout. */
  retry(): void {
    // Na opnieuw inloggen mag opslaan weer worden geprobeerd; bij een conflict niet.
    if (this.state.status === "unauthenticated") this.stopped = false;
    this.failures = 0;
    this.flush();
  }

  stop(): void {
    this.stopped = true;
    this.clearTimer();
  }

  private schedule(ms: number) {
    this.clearTimer();
    this.timer = this.timers.set(() => {
      this.timer = null;
      void this.run();
    }, ms);
  }

  private clearTimer() {
    if (this.timer !== null) this.timers.clear(this.timer);
    this.timer = null;
  }

  private async run(): Promise<void> {
    if (this.stopped || this.inFlight || !this.dirty || this.latest === undefined) return;
    const doc = this.latest;
    this.dirty = false;
    this.inFlight = true;
    this.setState({ status: "saving", message: undefined });

    let outcome: SaveOutcome;
    try {
      outcome = await this.opts.save(doc, this.state.revision);
    } catch {
      outcome = { ok: false, reason: "error", message: "Geen verbinding met de server." };
    }
    this.inFlight = false;
    if (this.stopped) return;

    if (outcome.ok) {
      this.failures = 0;
      this.setState({ revision: outcome.revision, lastSavedAt: Date.now(), status: this.dirty ? "pending" : "saved", message: undefined });
      if (this.dirty) this.schedule(0);
      return;
    }

    if (outcome.reason === "conflict" || outcome.reason === "not_found" || outcome.reason === "unauthenticated") {
      // Niet automatisch opnieuw proberen: de gebruiker moet kiezen wat er gebeurt.
      this.dirty = true;
      this.stopped = true;
      this.setState({ status: outcome.reason === "unauthenticated" ? "unauthenticated" : "conflict", message: outcome.message });
      return;
    }

    // Tijdelijke fout (of ongeldig document): wijziging blijft bewaard, later opnieuw proberen.
    this.dirty = true;
    this.failures += 1;
    this.setState({ status: "error", message: outcome.message });
    if (outcome.reason === "error") {
      this.schedule(Math.min(this.maxRetryDelay, 2000 * 2 ** (this.failures - 1)));
    }
  }

  private setState(patch: Partial<AutosaveState>) {
    this.state = { ...this.state, ...patch };
    this.opts.onChange(this.state);
  }
}
