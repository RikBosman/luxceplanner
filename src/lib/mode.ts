/**
 * Lokale modus: de app draait zonder Supabase. Er is één vaste lokale gebruiker (geen inloggen) en
 * ontwerpen worden opgeslagen in een JSON-bestand op deze computer. Bedoeld om te ontwikkelen en
 * uit te proberen — niet voor een publieke website.
 *
 * Aan met RUIMTE_MODE=local (staat standaard aan in .env.development, dus bij `pnpm dev`).
 */
export function isLocalMode(): boolean {
  return process.env.RUIMTE_MODE?.trim().toLowerCase() === "local";
}

export const LOCAL_USER = { id: "00000000-0000-4000-8000-000000000001", email: "lokaal@ruimte.local" } as const;
