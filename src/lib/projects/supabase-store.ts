import "server-only";
import type { ProjectDocument } from "@/domain/project";
import { getCurrentUser } from "@/lib/supabase/server";
import { projectErrorMessage } from "./errors";
import { StoreFailure, type ProjectStore } from "./store";

function fail(error: { message?: string; code?: string } | null | undefined): never {
  const msg = error?.message ?? "";
  const code = msg.includes("project_limit_reached")
    ? "limit"
    : msg.includes("revision_conflict")
      ? "conflict"
      : msg.includes("project_not_found")
        ? "not_found"
        : error?.code === "23514"
          ? "invalid"
          : "error";
  throw new StoreFailure(code, projectErrorMessage(error));
}

const notFound = (): never => fail({ message: "project_not_found" });

export async function getSupabaseStore(): Promise<ProjectStore | null> {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return null;

  return {
    async list() {
      const { data, error } = await supabase.from("projects").select("id, name, updated_at, document").order("updated_at", { ascending: false }).limit(200);
      if (error) fail(error);
      return data.map((r) => ({ id: r.id, name: r.name, updatedAt: r.updated_at, document: r.document as unknown }));
    },
    async get(id) {
      const { data, error } = await supabase.from("projects").select("id, name, updated_at, created_at, revision, document").eq("id", id).maybeSingle();
      if (error || !data) return null;
      return { id: data.id, name: data.name, document: data.document as unknown, revision: data.revision, createdAt: data.created_at, updatedAt: data.updated_at };
    },
    async create(name, document: ProjectDocument) {
      const { data, error } = await supabase.from("projects").insert({ name, document, schema_version: document.schemaVersion }).select("id").single();
      if (error || !data) fail(error);
      return { id: data.id as string };
    },
    async rename(id, name) {
      const { data, error } = await supabase.from("projects").update({ name }).eq("id", id).select("id");
      if (error) fail(error);
      if (!data?.length) notFound();
    },
    async duplicate(id) {
      const { data: source, error: readError } = await supabase.from("projects").select("name, document, schema_version").eq("id", id).maybeSingle();
      if (readError || !source) return notFound();
      const { error } = await supabase.from("projects").insert({ name: `${source.name} (kopie)`.slice(0, 120), document: source.document, schema_version: source.schema_version });
      if (error) fail(error);
    },
    async remove(id) {
      const { data, error } = await supabase.from("projects").delete().eq("id", id).select("id");
      if (error) fail(error);
      if (!data?.length) notFound();
    },
    async save(id, expectedRevision, document) {
      const { data, error } = await supabase
        .rpc("save_project_document", { p_id: id, p_expected_revision: expectedRevision, p_document: document })
        .single<{ revision: number; updated_at: string }>();
      if (error || !data) fail(error);
      return { revision: data.revision, updatedAt: data.updated_at };
    },
    async plan() {
      const [{ data: ent }, { count }] = await Promise.all([
        supabase.from("entitlements").select("plan_id, status, plans(name, max_projects)").eq("user_id", user.id).maybeSingle(),
        supabase.from("projects").select("id", { count: "exact", head: true }),
      ]);
      const plan = (ent?.plans ?? null) as { name: string; max_projects: number | null } | null;
      return { planName: plan?.name ?? "Gratis", maxProjects: plan ? plan.max_projects : 3, projectCount: count ?? 0 };
    },
    async deleteAccount() {
      const { error } = await supabase.rpc("delete_own_account");
      if (error) throw new StoreFailure("error", "Je account kon niet worden verwijderd. Probeer het later opnieuw of neem contact op.");
      await supabase.auth.signOut();
    },
  };
}
