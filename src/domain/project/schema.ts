/**
 * Het bewerkbare projectdocument: één bron van waarheid voor zowel 2D als 3D.
 *
 * Afspraken:
 * - Alle lengtes zijn in millimeters (mm), als getallen met decimalen. Afronden gebeurt alleen bij weergave.
 * - Het assenstelsel is een plattegrond van bovenaf: x naar rechts, y naar "beneden" (zuid) op het scherm.
 *   In 3D wordt x → x, y → z en hoogte → y (zie later de 3D-module).
 * - Rotaties zijn in graden, met de klok mee gezien van bovenaf, genormaliseerd naar [0, 360).
 * - Elk element heeft een stabiele string-ID die nooit wordt hergebruikt.
 */
import { z } from "zod";

export const CURRENT_SCHEMA_VERSION = 1 as const;

/** Bovengrens voor coördinaten (±1 km) om onzinnige of kwaadwillige data af te vangen. */
export const MAX_COORDINATE_MM = 1_000_000;
/** Bovengrens voor afmetingen van een enkel element (100 m). */
export const MAX_DIMENSION_MM = 100_000;

const id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, "Ongeldige ID");
const coordinate = z.number().finite().min(-MAX_COORDINATE_MM).max(MAX_COORDINATE_MM);
const length = z.number().finite().positive().max(MAX_DIMENSION_MM);
const nonNegativeLength = z.number().finite().min(0).max(MAX_DIMENSION_MM);
const rotation = z.number().finite().min(0).lt(360);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Kleur moet een hexcode zijn, bijv. #a1b2c3");
const name = z.string().trim().min(1).max(120);

export const pointSchema = z.object({ x: coordinate, y: coordinate });

export const wallSchema = z.object({
  id,
  start: pointSchema,
  end: pointSchema,
  thickness: length,
  height: length,
  materialId: id.optional(),
});

export const openingSchema = z.object({
  id,
  type: z.enum(["door", "window"]),
  wallId: id,
  /** Afstand van het begin van de muur tot het midden van de opening, langs de muur. */
  offset: nonNegativeLength,
  width: length,
  height: length,
  /** Hoogte van de onderkant boven de vloer (0 voor deuren). */
  sillHeight: nonNegativeLength,
  /** Draairichting van een deur; genegeerd voor ramen. */
  swing: z.enum(["left", "right"]).default("left"),
  /** Of de deur naar de andere kant van de muur opendraait. */
  flipped: z.boolean().default(false),
});

export const roomSchema = z.object({
  id,
  name,
  /** Hoekpunten van de vloer, in volgorde. */
  polygon: z.array(pointSchema).min(3).max(500),
  floorMaterialId: id.optional(),
});

export const furnitureSchema = z.object({
  id,
  /** Verwijzing naar een item in de objectbibliotheek (bijv. "sofa-3"). */
  catalogId: z.string().min(1).max(64),
  name,
  kind: z.string().min(1).max(64),
  /** Middelpunt van het object op de plattegrond. */
  position: pointSchema,
  rotation,
  width: length,
  depth: length,
  height: length,
  /** Hoogte van de onderkant boven de vloer (bijv. voor wandkastjes). */
  elevation: nonNegativeLength.default(0),
  materialId: id.optional(),
});

export const materialSchema = z.object({
  id,
  name,
  color: hexColor,
});

export const floorSchema = z.object({
  id,
  name,
  /** Hoogte van de vloer boven het maaiveld; voorbereid op meerdere verdiepingen. */
  elevation: z.number().finite().min(-MAX_DIMENSION_MM).max(MAX_DIMENSION_MM),
  walls: z.array(wallSchema).max(5_000),
  openings: z.array(openingSchema).max(5_000),
  rooms: z.array(roomSchema).max(1_000),
  furniture: z.array(furnitureSchema).max(5_000),
});

export const projectSettingsSchema = z.object({
  gridSize: length.default(100),
  snapToGrid: z.boolean().default(true),
  defaultWallHeight: length.default(2600),
  defaultWallThickness: length.default(100),
});

export const projectDocumentSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    units: z.literal("mm"),
    settings: projectSettingsSchema,
    floors: z.array(floorSchema).min(1).max(20),
    materials: z.array(materialSchema).max(500),
  })
  .superRefine((doc, ctx) => {
    const seen = new Set<string>();
    const materialIds = new Set(doc.materials.map((m) => m.id));
    const checkUnique = (value: string, path: (string | number)[]) => {
      if (seen.has(value)) ctx.addIssue({ code: "custom", message: `Dubbele ID: ${value}`, path });
      seen.add(value);
    };
    const checkMaterial = (value: string | undefined, path: (string | number)[]) => {
      if (value !== undefined && !materialIds.has(value)) {
        ctx.addIssue({ code: "custom", message: `Onbekend materiaal: ${value}`, path });
      }
    };

    doc.materials.forEach((m, i) => checkUnique(m.id, ["materials", i, "id"]));
    doc.floors.forEach((floor, f) => {
      checkUnique(floor.id, ["floors", f, "id"]);
      const wallIds = new Set<string>();
      floor.walls.forEach((w, i) => {
        checkUnique(w.id, ["floors", f, "walls", i, "id"]);
        checkMaterial(w.materialId, ["floors", f, "walls", i, "materialId"]);
        wallIds.add(w.id);
        if (w.start.x === w.end.x && w.start.y === w.end.y) {
          ctx.addIssue({ code: "custom", message: "Muur heeft lengte 0", path: ["floors", f, "walls", i] });
        }
      });
      floor.openings.forEach((o, i) => {
        checkUnique(o.id, ["floors", f, "openings", i, "id"]);
        if (!wallIds.has(o.wallId)) {
          ctx.addIssue({ code: "custom", message: `Opening verwijst naar onbekende muur`, path: ["floors", f, "openings", i, "wallId"] });
        }
      });
      floor.rooms.forEach((r, i) => {
        checkUnique(r.id, ["floors", f, "rooms", i, "id"]);
        checkMaterial(r.floorMaterialId, ["floors", f, "rooms", i, "floorMaterialId"]);
      });
      floor.furniture.forEach((o, i) => {
        checkUnique(o.id, ["floors", f, "furniture", i, "id"]);
        checkMaterial(o.materialId, ["floors", f, "furniture", i, "materialId"]);
      });
    });
  });

export type Point = z.infer<typeof pointSchema>;
export type Wall = z.infer<typeof wallSchema>;
export type Opening = z.infer<typeof openingSchema>;
export type Room = z.infer<typeof roomSchema>;
export type Furniture = z.infer<typeof furnitureSchema>;
export type Material = z.infer<typeof materialSchema>;
export type Floor = z.infer<typeof floorSchema>;
export type ProjectSettings = z.infer<typeof projectSettingsSchema>;
export type ProjectDocument = z.infer<typeof projectDocumentSchema>;

/** Toegestane projectnaam (los van het document, opgeslagen in een eigen kolom). */
export const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Geef je ontwerp een naam.")
  .max(120, "De naam mag maximaal 120 tekens zijn.");
