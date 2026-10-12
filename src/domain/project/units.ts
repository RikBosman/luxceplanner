/** Weergave en invoer van maten. Intern altijd mm; afronden alleen voor de gebruiker. */

const nl = (digits: number) =>
  new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: digits });

/** Toont een lengte, bijv. 4000 → "4,00 m" en 850 → "85 cm". */
export function formatLength(mm: number): string {
  if (Math.abs(mm) >= 1000) return `${nl(2).format(mm / 1000)} m`;
  if (Math.abs(mm) >= 10) return `${nl(1).format(mm / 10)} cm`;
  return `${nl(0).format(mm)} mm`;
}

/** Toont een oppervlakte in m², bijv. 20 000 000 mm² → "20,0 m²". */
export function formatArea(mm2: number): string {
  return `${new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(mm2 / 1_000_000)} m²`;
}

/**
 * Leest een door de gebruiker ingetypte maat. Zonder eenheid wordt mm aangenomen.
 * Voorbeelden: "4000" → 4000, "400 cm" → 4000, "4 m" → 4000, "4,25m" → 4250.
 * Geeft null bij ongeldige invoer.
 */
export function parseLength(input: string): number | null {
  const match = input.trim().toLowerCase().replace(",", ".").match(/^(-?\d+(?:\.\d+)?)\s*(mm|cm|m)?$/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const unit = match[2] ?? "mm";
  return unit === "m" ? value * 1000 : unit === "cm" ? value * 10 : value;
}
