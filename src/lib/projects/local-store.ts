import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProjectDocument } from "@/domain/project";
import { StoreFailure, type ProjectStore, type StoredProject } from "./store";

/**
 * Lokale opslag in één JSON-bestand (standaard .data/ruimte-lokaal.json in de projectmap).
 * Schrijven gebeurt atomair (eerst naar een tijdelijk bestand, dan hernoemen) en na elkaar,
 * zodat het bestand nooit half geschreven kan raken.
 */
interface LocalData {
  version: 1;
  projects: StoredProject[];
}

export function localDataFile(): string {
  const dir = process.env.RUIMTE_DATA_DIR?.trim() || path.join(process.cwd(), ".data");
  return path.join(dir, "ruimte-lokaal.json");
}

let queue: Promise<unknown> = Promise.resolve();

/** Voert bewerkingen strikt na elkaar uit (één schrijver tegelijk). */
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function load(): Promise<LocalData> {
  try {
    const parsed = JSON.parse(await readFile(localDataFile(), "utf8")) as LocalData;
    if (!parsed || !Array.isArray(parsed.projects)) throw new Error("ongeldig");
    return parsed;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, projects: [] };
    throw new StoreFailure("error", `Het lokale gegevensbestand (${localDataFile()}) kon niet worden gelezen. Het is niet gewijzigd.`);
  }
}

async function persist(data: LocalData): Promise<void> {
  const file = localDataFile();
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, file);
}

const now = () => new Date().toISOString();
const notFound = () => new StoreFailure("not_found", "Dit ontwerp bestaat niet (meer).");

export function getLocalStore(): ProjectStore {
  const mutate = <T>(fn: (data: LocalData) => T): Promise<T> =>
    serialized(async () => {
      const data = await load();
      const result = fn(data);
      await persist(data);
      return result;
    });

  return {
    async list() {
      const data = await load();
      return [...data.projects]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .map(({ id, name, updatedAt, document }) => ({ id, name, updatedAt, document }));
    },
    async get(id) {
      const data = await load();
      return data.projects.find((p) => p.id === id) ?? null;
    },
    create(name, document: ProjectDocument) {
      return mutate((data) => {
        const t = now();
        const id = randomUUID();
        data.projects.push({ id, name, document, revision: 1, createdAt: t, updatedAt: t });
        return { id };
      });
    },
    rename(id, name) {
      return mutate((data) => {
        const p = data.projects.find((x) => x.id === id);
        if (!p) throw notFound();
        p.name = name;
        p.revision += 1;
        p.updatedAt = now();
      });
    },
    duplicate(id) {
      return mutate((data) => {
        const p = data.projects.find((x) => x.id === id);
        if (!p) throw notFound();
        const t = now();
        data.projects.push({ id: randomUUID(), name: `${p.name} (kopie)`.slice(0, 120), document: structuredClone(p.document), revision: 1, createdAt: t, updatedAt: t });
      });
    },
    remove(id) {
      return mutate((data) => {
        const before = data.projects.length;
        data.projects = data.projects.filter((x) => x.id !== id);
        if (data.projects.length === before) throw notFound();
      });
    },
    save(id, expectedRevision, document) {
      return mutate((data) => {
        const p = data.projects.find((x) => x.id === id);
        if (!p) throw notFound();
        if (p.revision !== expectedRevision) {
          throw new StoreFailure("conflict", "Dit ontwerp is intussen ergens anders gewijzigd (bijvoorbeeld in een ander tabblad).");
        }
        p.document = document;
        p.revision += 1;
        p.updatedAt = now();
        return { revision: p.revision, updatedAt: p.updatedAt };
      });
    },
    async plan() {
      const data = await load();
      return { planName: "Lokaal", maxProjects: null, projectCount: data.projects.length };
    },
    deleteAccount() {
      return mutate((data) => {
        data.projects = [];
      });
    },
  };
}
