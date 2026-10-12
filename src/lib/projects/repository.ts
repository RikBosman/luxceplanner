import "server-only";
import { z } from "zod";
import { parseProjectDocument, type ProjectDocument } from "@/domain/project";
import { getCurrentUser } from "@/lib/supabase/server";

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

/** Projecten van de ingelogde gebruiker. RLS zorgt dat alleen eigen projecten terugkomen. */
export async function listMyProjects(): Promise<{ projects: ProjectSummary[]; error?: string }> {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { projects: [], error: "Niet ingelogd." };
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, updated_at, document")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) return { projects: [], error: "Je ontwerpen konden niet worden geladen. Probeer het opnieuw." };
  return {
    projects: data.map((row) => {
      const parsed = parseProjectDocument(row.document);
      return { id: row.id, name: row.name, updatedAt: row.updated_at, document: parsed.ok ? parsed.document : null };
    }),
  };
}

export async function getMyProject(id: string): Promise<ProjectRecord | null> {
  if (!projectIdSchema.safeParse(id).success) return null;
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return null;
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, updated_at, created_at, revision, document")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const parsed = parseProjectDocument(data.document);
  return {
    id: data.id,
    name: data.name,
    updatedAt: data.updated_at,
    createdAt: data.created_at,
    revision: data.revision,
    document: parsed.ok ? parsed.document : null,
    loadError: parsed.ok ? undefined : `${parsed.error}${parsed.issues.length ? ` (${parsed.issues.slice(0, 3).join("; ")})` : ""}`,
  };
}

export async function getMyPlan(): Promise<{ planName: string; maxProjects: number | null; projectCount: number } | null> {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return null;
  const [{ data: ent }, { count }] = await Promise.all([
    supabase.from("entitlements").select("plan_id, status, plans(name, max_projects)").eq("user_id", user.id).maybeSingle(),
    supabase.from("projects").select("id", { count: "exact", head: true }),
  ]);
  const plan = (ent?.plans ?? null) as { name: string; max_projects: number | null } | null;
  return { planName: plan?.name ?? "Gratis", maxProjects: plan ? plan.max_projects : 3, projectCount: count ?? 0 };
}
