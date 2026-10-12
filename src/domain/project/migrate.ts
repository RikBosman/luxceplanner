/**
 * Inlezen van opgeslagen projectdata, ongeacht de schemaversie waarmee het is opgeslagen.
 *
 * Werkwijze bij een toekomstige schemawijziging:
 * 1. Verhoog CURRENT_SCHEMA_VERSION in schema.ts en pas het schema aan.
 * 2. Voeg hieronder een migratie toe van de vorige versie naar de nieuwe.
 * 3. Voeg een test toe met een voorbeeld van de oude versie.
 * Opgeslagen ontwerpen worden zo bij het openen automatisch bijgewerkt.
 */
import { CURRENT_SCHEMA_VERSION, projectDocumentSchema, type ProjectDocument } from "./schema";

type Migration = (doc: Record<string, unknown>) => Record<string, unknown>;

/** migrations[n] zet een document van versie n om naar versie n + 1. */
const migrations: Record<number, Migration> = {
  // Voorbeeld voor later: 1: (doc) => ({ ...doc, schemaVersion: 2, ... }),
};

export type ParseResult =
  | { ok: true; document: ProjectDocument; migrated: boolean }
  | { ok: false; error: string; issues: string[] };

export function parseProjectDocument(input: unknown): ParseResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, error: "Het projectbestand is geen geldig object.", issues: [] };
  }
  let doc = input as Record<string, unknown>;
  const startVersion = doc.schemaVersion;
  if (typeof startVersion !== "number" || !Number.isInteger(startVersion) || startVersion < 1) {
    return { ok: false, error: "Het projectbestand heeft geen geldige schemaversie.", issues: [] };
  }
  if (startVersion > CURRENT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: "Dit ontwerp is gemaakt met een nieuwere versie van de app. Vernieuw de pagina.",
      issues: [],
    };
  }

  for (let v = startVersion; v < CURRENT_SCHEMA_VERSION; v++) {
    const migrate = migrations[v];
    if (!migrate) {
      return { ok: false, error: `Geen migratie beschikbaar van schemaversie ${v}.`, issues: [] };
    }
    doc = migrate(doc);
  }

  const result = projectDocumentSchema.safeParse(doc);
  if (!result.success) {
    return {
      ok: false,
      error: "Het projectbestand bevat ongeldige gegevens.",
      issues: result.error.issues.slice(0, 20).map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }
  return { ok: true, document: result.data, migrated: startVersion !== CURRENT_SCHEMA_VERSION };
}
