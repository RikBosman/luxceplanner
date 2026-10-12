import "server-only";
import { isLocalMode } from "@/lib/mode";
import type { ProjectDocument } from "@/domain/project";

/** Een opgeslagen project zoals het uit de opslag komt; `document` is nog niet gevalideerd. */
export interface StoredProject {
  id: string;
  name: string;
  document: unknown;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export type StoreErrorCode = "limit" | "conflict" | "not_found" | "invalid" | "error";

/** Fout met een begrijpelijke melding voor de gebruiker. */
export class StoreFailure extends Error {
  constructor(
    readonly code: StoreErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Opslag van projecten voor de ingelogde gebruiker. Twee uitvoeringen:
 * - Supabase (productie): PostgreSQL met Row Level Security;
 * - lokaal: een JSON-bestand op deze computer (zie src/lib/mode.ts).
 */
export interface ProjectStore {
  list(): Promise<Pick<StoredProject, "id" | "name" | "updatedAt" | "document">[]>;
  get(id: string): Promise<StoredProject | null>;
  create(name: string, document: ProjectDocument): Promise<{ id: string }>;
  rename(id: string, name: string): Promise<void>;
  duplicate(id: string): Promise<void>;
  remove(id: string): Promise<void>;
  /** Slaat op als de revisie nog `expectedRevision` is; anders StoreFailure("conflict"). */
  save(id: string, expectedRevision: number, document: ProjectDocument): Promise<{ revision: number; updatedAt: string }>;
  plan(): Promise<{ planName: string; maxProjects: number | null; projectCount: number }>;
  /** Verwijdert het account en alle bijbehorende gegevens (lokaal: alle lokale ontwerpen). */
  deleteAccount(): Promise<void>;
}

/** Opslag voor de huidige gebruiker, of null als er niemand is ingelogd. */
export async function getStore(): Promise<ProjectStore | null> {
  if (isLocalMode()) {
    const { getLocalStore } = await import("./local-store");
    return getLocalStore();
  }
  const { getSupabaseStore } = await import("./supabase-store");
  return getSupabaseStore();
}
