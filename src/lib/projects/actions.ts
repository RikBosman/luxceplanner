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
import { isLocalMode } from "@/lib/mode";
import { projectIdSchema } from "./repository";
import { getStore, StoreFailure, type ProjectStore } from "./store";

export interface ActionState {
  error?: string;
  fields?: Record<string, string>;
}

const str = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
};

async function requireStore(): Promise<ProjectStore> {
  const store = await getStore();
  if (!store) redirect("/inloggen");
  return store;
}

const GENERIC_ERROR = "Er ging iets mis bij het opslaan. Controleer je verbinding en probeer het opnieuw.";
const messageOf = (e: unknown) => (e instanceof StoreFailure ? e.message : GENERIC_ERROR);
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

  const store = await requireStore();
  let id: string;
  try {
    ({ id } = await store.create(name.data!, document));
  } catch (e) {
    return { error: messageOf(e) };
  }
  revalidatePath("/app");
  redirect(`/app/projecten/${id}`);
}

export async function renameProject(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = projectIdSchema.safeParse(str(fd, "id"));
  const name = projectNameSchema.safeParse(str(fd, "name"));
  if (!id.success) return { error: "Onbekend ontwerp." };
  if (!name.success) return { fields: { name: name.error.issues[0]!.message } };
  const store = await requireStore();
  try {
    await store.rename(id.data, name.data);
  } catch (e) {
    return { error: messageOf(e) };
  }
  revalidatePath("/app");
  return {};
}

export async function duplicateProject(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = projectIdSchema.safeParse(str(fd, "id"));
  if (!id.success) return { error: "Onbekend ontwerp." };
  const store = await requireStore();
  try {
    await store.duplicate(id.data);
  } catch (e) {
    return { error: messageOf(e) };
  }
  revalidatePath("/app");
  return {};
}

export async function deleteProject(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = projectIdSchema.safeParse(str(fd, "id"));
  if (!id.success) return { error: "Onbekend ontwerp." };
  const store = await requireStore();
  try {
    await store.remove(id.data);
  } catch (e) {
    return { error: messageOf(e) };
  }
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
  const store = await getStore();
  if (!store) return { ok: false, reason: "unauthenticated", message: "Je sessie is verlopen. Log opnieuw in om op te slaan." };
  try {
    const r = await store.save(id, expectedRevision, parsed.data);
    return { ok: true, revision: r.revision, updatedAt: r.updatedAt };
  } catch (e) {
    const code = e instanceof StoreFailure ? e.code : "error";
    const reason = code === "conflict" ? "conflict" : code === "not_found" ? "not_found" : code === "invalid" ? "invalid" : "error";
    return { ok: false, reason, message: messageOf(e) };
  }
}

export async function deleteAccount(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (str(fd, "bevestiging").trim().toUpperCase() !== "VERWIJDER") {
    return { fields: { bevestiging: "Typ VERWIJDER om te bevestigen." } };
  }
  const store = await requireStore();
  try {
    await store.deleteAccount();
  } catch (e) {
    return { error: messageOf(e) };
  }
  if (isLocalMode()) {
    revalidatePath("/app");
    redirect("/app");
  }
  redirect("/inloggen?melding=account-verwijderd");
}
