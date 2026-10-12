import "server-only";
import { z } from "zod";
import { parseProjectDocument, type ProjectDocument } from "@/domain/project";
import { getStore } from "./store";

export const projectIdSchema = z.uuid();

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  document: ProjectDocument | null;
}

export interface ProjectRecord extends ProjectSummary {
  revision: number;
  createdAt: string;
  loadError?: string;
}

/** Projecten van de ingelogde gebruiker (in Supabase afgedwongen met RLS). */
export async function listMyProjects(): Promise<{ projects: ProjectSummary[]; error?: string }> {
  const store = await getStore();
  if (!store) return { projects: [], error: "Niet ingelogd." };
  try {
    const rows = await store.list();
    return {
      projects: rows.map((row) => {
        const parsed = parseProjectDocument(row.document);
        return { id: row.id, name: row.name, updatedAt: row.updatedAt, document: parsed.ok ? parsed.document : null };
      }),
    };
  } catch {
    return { projects: [], error: "Je ontwerpen konden niet worden geladen. Probeer het opnieuw." };
  }
}

export async function getMyProject(id: string): Promise<ProjectRecord | null> {
  if (!projectIdSchema.safeParse(id).success) return null;
  const store = await getStore();
  if (!store) return null;
  const row = await store.get(id).catch(() => null);
  if (!row) return null;
  const parsed = parseProjectDocument(row.document);
  return {
    id: row.id,
    name: row.name,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
    revision: row.revision,
    document: parsed.ok ? parsed.document : null,
    loadError: parsed.ok ? undefined : `${parsed.error}${parsed.issues.length ? ` (${parsed.issues.slice(0, 3).join("; ")})` : ""}`,
  };
}

export async function getMyPlan(): Promise<{ planName: string; maxProjects: number | null; projectCount: number } | null> {
  const store = await getStore();
  if (!store) return null;
  return store.plan().catch(() => null);
}
