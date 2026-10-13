/**
 * Eenvoudige limiet per gebruiker per dag (in het geheugen van de server). Beschermt tegen onverwachte
 * kosten. Bij meerdere serverinstanties of na een herstart begint de telling opnieuw; voor productie op
 * schaal hoort dit in de database (zie README).
 */
export class DailyLimiter {
  private counts = new Map<string, { day: string; n: number }>();
  constructor(private readonly limit: number, private readonly now: () => Date = () => new Date()) {}

  /** Telt een poging; geeft false als de limiet voor vandaag al bereikt is. */
  take(key: string): { ok: boolean; remaining: number } {
    const day = this.now().toISOString().slice(0, 10);
    const entry = this.counts.get(key);
    const n = entry && entry.day === day ? entry.n : 0;
    if (n >= this.limit) return { ok: false, remaining: 0 };
    this.counts.set(key, { day, n: n + 1 });
    return { ok: true, remaining: this.limit - n - 1 };
  }

  /** Geeft een poging terug (bijv. als de AI-dienst faalde). */
  refund(key: string) {
    const entry = this.counts.get(key);
    if (entry && entry.n > 0) entry.n -= 1;
  }
}
