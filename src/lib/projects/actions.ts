"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createEmptyProject,
  createRectangularRoom,
  parseLength,
  projectDocumentSchema,
  projectNameSchema,
  type ProjectDocument,
} from "@/domain/project";
import { getCurrentUser } from "@/lib/supabase/server";
import { projectErrorMessage } from "./errors";
import { projectIdSchema } from "./repository";

export interface ActionState {
  error?: string;
  fields?: Record<string, string>;
}

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

async function requireUser() {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) redirect("/inloggen");
  return { supabase, user };
}

export async function createProject(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const fields: Record<string, string> = {};
  const name = projectNameSchema.safeParse(str(fd, "name"));
  if (!name.success) fields.name = name.error.issues[0]!.message;

  const rawWidth = str(fd, "width").trim();
  const rawLength = str(fd, "length").trim();
  const wantsRoom = rawWidth !== "" || rawLength !== "";
  let width = 0;
  let length = 0;
  if (wantsRoom) {
    const w = parseLength(rawWidth);
    const l = parseLength(rawLength);
    if (w === null || w < 500 || w > 50_000) fields.width = "Vul een breedte in tussen 0,5 en 50 m, bijv. 4 m of 4000.";
    if (l === null || l < 500 || l > 50_000) fields.length = "Vul een lengte in tussen 0,5 en 50 m, bijv. 5 m of 5000.";
    width = w ?? 0;
    length = l ?? 0;
  }
  if (Object.keys(fields).length > 0) return { fields };

  const document = createEmptyProject();
  if (wantsRoom) {
    const { walls, room } = createRectangularRoom({ width, length, name: "Kamer" });
    document.floors[0]!.walls.push(...walls);
    document.floors[0]!.rooms.push({ ...room, floorMaterialId: "mat_floor_oak" });
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("projects")
    .insert({ name: name.data!, document, schema_version: document.schemaVersion })
    .select("id")
    .single();
  if (error || !data) return { error: projectErrorMessage(error) };
  revalidatePath("/app");
  redirect(`/app/projecten/${data.id}`);
}

export async function renameProject(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = projectIdSchema.safeParse(str(fd, "id"));
  const name = projectNameSchema.safeParse(str(fd, "name"));
  if (!id.success) return { error: "Onbekend ontwerp." };
  if (!name.success) return { fields: { name: name.error.issues[0]!.message } };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("projects").update({ name: name.data }).eq("id", id.data).select("id");
  if (error) return { error: projectErrorMessage(error) };
  if (!data?.length) return { error: projectErrorMessage({ message: "project_not_found" }) };
  revalidatePath("/app");
  return {};
}

export async function duplicateProject(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = projectIdSchema.safeParse(str(fd, "id"));
  if (!id.success) return { error: "Onbekend ontwerp." };
  const { supabase } = await requireUser();
  const { data: source, error: readError } = await supabase.from("projects").select("name, document, schema_version").eq("id", id.data).maybeSingle();
  if (readError || !source) return { error: projectErrorMessage({ message: "project_not_found" }) };
  const copyName = `${source.name} (kopie)`.slice(0, 120);
  const { error } = await supabase.from("projects").insert({ name: copyName, document: source.document, schema_version: source.schema_version });
  if (error) return { error: projectErrorMessage(error) };
  revalidatePath("/app");
  return {};
}

export async function deleteProject(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = projectIdSchema.safeParse(str(fd, "id"));
  if (!id.success) return { error: "Onbekend ontwerp." };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("projects").delete().eq("id", id.data).select("id");
  if (error) return { error: projectErrorMessage(error) };
  if (!data?.length) return { error: projectErrorMessage({ message: "project_not_found" }) };
  revalidatePath("/app");
  if (str(fd, "terug") === "1") redirect("/app");
  return {};
}

export type SaveResult =
  | { ok: true; revision: number; updatedAt: string }
  | { ok: false; reason: "conflict" | "not_found" | "invalid" | "unauthenticated" | "error"; message: string };

/**
 * Slaat het volledige projectdocument op met conflictbescherming. De server valideert het document
 * opnieuw; de database weigert de opslag als de revisie intussen is veranderd.
 */
export async function saveProjectDocument(id: string, expectedRevision: number, document: ProjectDocument): Promise<SaveResult> {
  if (!projectIdSchema.safeParse(id).success || !z.number().int().positive().safeParse(expectedRevision).success) {
    return { ok: false, reason: "invalid", message: "Ongeldig verzoek." };
  }
  const parsed = projectDocumentSchema.safeParse(document);
  if (!parsed.success) {
    return { ok: false, reason: "invalid", message: "Het ontwerp bevat ongeldige gegevens en is niet opgeslagen." };
  }
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) return { ok: false, reason: "unauthenticated", message: "Je sessie is verlopen. Log opnieuw in om op te slaan." };

  const { data, error } = await supabase
    .rpc("save_project_document", { p_id: id, p_expected_revision: expectedRevision, p_document: parsed.data })
    .single<{ revision: number; updated_at: string }>();
  if (error || !data) {
    const msg = error?.message ?? "";
    const reason = msg.includes("revision_conflict") ? "conflict" : msg.includes("project_not_found") ? "not_found" : "error";
    return { ok: false, reason, message: projectErrorMessage(error) };
  }
  return { ok: true, revision: data.revision, updatedAt: data.updated_at };
}

export async function deleteAccount(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (str(fd, "bevestiging").trim().toUpperCase() !== "VERWIJDER") {
    return { fields: { bevestiging: "Typ VERWIJDER om te bevestigen." } };
  }
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("delete_own_account");
  if (error) return { error: "Je account kon niet worden verwijderd. Probeer het later opnieuw of neem contact op." };
  await supabase.auth.signOut();
  redirect("/inloggen?melding=account-verwijderd");
}
