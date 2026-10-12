/**
 * Bewerkingen op een projectdocument. Elke functie is puur: ze geeft een nieuw document terug en laat het
 * origineel ongemoeid (nodig voor ongedaan maken/opnieuw). Ongeldige bewerkingen gooien een EditError met
 * een begrijpelijke melding voor de gebruiker.
 */
import { createFurniture, createRectangularRoom } from "./factory";
import { distance, normalizeDegrees, projectOntoWall, wallLength, withWallLength } from "./geometry";
import { createId } from "./ids";
import { MAX_DIMENSION_MM, type Floor, type Furniture, type Opening, type Point, type ProjectDocument, type Wall } from "./schema";

export class EditError extends Error {}

export const MIN_WALL_LENGTH = 100;
const ENDPOINT_TOLERANCE = 0.5; // mm: eindpunten die zo dicht bij elkaar liggen, zijn verbonden

type FloorUpdater = (floor: Floor) => Floor;

function updateFloor(doc: ProjectDocument, floorId: string, fn: FloorUpdater): ProjectDocument {
  let found = false;
  const floors = doc.floors.map((f) => {
    if (f.id !== floorId) return f;
    found = true;
    return fn(f);
  });
  if (!found) throw new EditError("Verdieping niet gevonden.");
  return { ...doc, floors };
}

function getWall(floor: Floor, wallId: string): Wall {
  const wall = floor.walls.find((w) => w.id === wallId);
  if (!wall) throw new EditError("Muur niet gevonden.");
  return wall;
}

function checkDimension(value: number, label: string, min = 1) {
  if (!Number.isFinite(value) || value < min) throw new EditError(`${label} moet minimaal ${min} mm zijn.`);
  if (value > MAX_DIMENSION_MM) throw new EditError(`${label} mag maximaal ${MAX_DIMENSION_MM / 1000} m zijn.`);
}

/** Houdt openingen binnen hun muur na een wijziging van de muurlengte; te brede openingen worden verwijderd. */
function refitOpenings(floor: Floor): Floor {
  const openings = floor.openings.flatMap((o) => {
    const wall = floor.walls.find((w) => w.id === o.wallId);
    if (!wall) return [];
    const len = wallLength(wall);
    if (o.width > len) return [];
    return [{ ...o, offset: clampOffset(o.offset, o.width, len) }];
  });
  return { ...floor, openings };
}

function clampOffset(offset: number, width: number, wallLen: number) {
  return Math.min(Math.max(offset, width / 2), wallLen - width / 2);
}

// ---------------------------------------------------------------------------- Muren

export function addRectangularRoom(doc: ProjectDocument, floorId: string, width: number, length: number, origin: Point = { x: 0, y: 0 }): ProjectDocument {
  let created: ReturnType<typeof createRectangularRoom>;
  try {
    created = createRectangularRoom({
      width, length, origin,
      wallThickness: doc.settings.defaultWallThickness,
      wallHeight: doc.settings.defaultWallHeight,
    });
  } catch (e) {
    throw new EditError(e instanceof Error ? e.message : "Ongeldige kamermaat.");
  }
  return updateFloor(doc, floorId, (f) => ({
    ...f,
    walls: [...f.walls, ...created.walls],
    rooms: [...f.rooms, { ...created.room, name: f.rooms.length ? `Kamer ${f.rooms.length + 1}` : "Kamer" }],
  }));
}

export function addWall(doc: ProjectDocument, floorId: string, start: Point, end: Point): { doc: ProjectDocument; wallId: string } {
  if (distance(start, end) < MIN_WALL_LENGTH) throw new EditError(`Een muur moet minimaal ${MIN_WALL_LENGTH / 10} cm lang zijn.`);
  const wall: Wall = {
    id: createId("wall"),
    start: { ...start },
    end: { ...end },
    thickness: doc.settings.defaultWallThickness,
    height: doc.settings.defaultWallHeight,
  };
  return { doc: updateFloor(doc, floorId, (f) => ({ ...f, walls: [...f.walls, wall] })), wallId: wall.id };
}

/**
 * Verplaatst één eindpunt van een muur. Eindpunten van andere muren die op dezelfde plek lagen, verhuizen mee,
 * zodat aansluitende muren verbonden blijven.
 */
export function moveWallEndpoint(doc: ProjectDocument, floorId: string, wallId: string, which: "start" | "end", to: Point): ProjectDocument {
  return updateFloor(doc, floorId, (f) => {
    const wall = getWall(f, wallId);
    const from = wall[which];
    const other = which === "start" ? wall.end : wall.start;
    if (distance(to, other) < MIN_WALL_LENGTH) throw new EditError(`Een muur moet minimaal ${MIN_WALL_LENGTH / 10} cm lang zijn.`);
    const walls = f.walls.map((w) => {
      let next = w;
      if (distance(w.start, from) <= ENDPOINT_TOLERANCE) next = { ...next, start: { ...to } };
      if (distance(w.end, from) <= ENDPOINT_TOLERANCE) next = { ...next, end: { ...to } };
      return next;
    });
    if (walls.some((w) => distance(w.start, w.end) < MIN_WALL_LENGTH)) {
      throw new EditError("Hierdoor zou een aansluitende muur te kort worden.");
    }
    return refitOpenings({ ...f, walls });
  });
}

/** Verschuift een hele muur; aansluitende muren rekken mee. */
export function translateWall(doc: ProjectDocument, floorId: string, wallId: string, dx: number, dy: number): ProjectDocument {
  const floor = doc.floors.find((f) => f.id === floorId);
  if (!floor) throw new EditError("Verdieping niet gevonden.");
  const wall = getWall(floor, wallId);
  const startFrom = wall.start;
  const endFrom = wall.end;
  return updateFloor(doc, floorId, (f) => {
    const move = (p: Point): Point => {
      if (distance(p, startFrom) <= ENDPOINT_TOLERANCE || distance(p, endFrom) <= ENDPOINT_TOLERANCE) return { x: p.x + dx, y: p.y + dy };
      return p;
    };
    const walls = f.walls.map((w) => ({ ...w, start: move(w.start), end: move(w.end) }));
    if (walls.some((w) => distance(w.start, w.end) < MIN_WALL_LENGTH)) throw new EditError("Hierdoor zou een aansluitende muur te kort worden.");
    return refitOpenings({ ...f, walls });
  });
}

/** Zet de lengte van een muur; het eindpunt (en aansluitende eindpunten) verschuift mee. */
export function setWallLength(doc: ProjectDocument, floorId: string, wallId: string, length: number): ProjectDocument {
  checkDimension(length, "De muurlengte", MIN_WALL_LENGTH);
  const floor = doc.floors.find((f) => f.id === floorId);
  if (!floor) throw new EditError("Verdieping niet gevonden.");
  const wall = getWall(floor, wallId);
  return moveWallEndpoint(doc, floorId, wallId, "end", withWallLength(wall, length).end);
}

export function updateWall(doc: ProjectDocument, floorId: string, wallId: string, patch: Partial<Pick<Wall, "thickness" | "height" | "materialId">>): ProjectDocument {
  if (patch.thickness !== undefined) checkDimension(patch.thickness, "De muurdikte", 20);
  if (patch.height !== undefined) checkDimension(patch.height, "De muurhoogte", 100);
  return updateFloor(doc, floorId, (f) => {
    getWall(f, wallId);
    return refitOpenings({ ...f, walls: f.walls.map((w) => (w.id === wallId ? { ...w, ...patch } : w)) });
  });
}

export function deleteWall(doc: ProjectDocument, floorId: string, wallId: string): ProjectDocument {
  return updateFloor(doc, floorId, (f) => {
    getWall(f, wallId);
    return { ...f, walls: f.walls.filter((w) => w.id !== wallId), openings: f.openings.filter((o) => o.wallId !== wallId) };
  });
}

// ---------------------------------------------------------------------------- Deuren en ramen

export const OPENING_DEFAULTS = {
  door: { width: 930, height: 2115, sillHeight: 0 },
  window: { width: 1200, height: 1400, sillHeight: 800 },
} as const;

export function addOpening(doc: ProjectDocument, floorId: string, wallId: string, type: Opening["type"], at: Point): { doc: ProjectDocument; openingId: string } {
  const floor = doc.floors.find((f) => f.id === floorId);
  if (!floor) throw new EditError("Verdieping niet gevonden.");
  const wall = getWall(floor, wallId);
  const len = wallLength(wall);
  const defaults = OPENING_DEFAULTS[type];
  const width = Math.min(defaults.width, len - 100);
  if (width < 300) throw new EditError(`Deze muur is te kort voor een ${type === "door" ? "deur" : "raam"}.`);
  if (defaults.height + defaults.sillHeight > wall.height) throw new EditError("De muur is te laag voor deze opening.");
  const opening: Opening = {
    id: createId(type),
    type,
    wallId,
    offset: clampOffset(Math.round(projectOntoWall(wall, at).offset / 10) * 10, width, len),
    width,
    height: defaults.height,
    sillHeight: defaults.sillHeight,
    swing: "left",
    flipped: false,
  };
  return { doc: updateFloor(doc, floorId, (f) => ({ ...f, openings: [...f.openings, opening] })), openingId: opening.id };
}

/** Schuift een opening langs zijn muur naar het punt dat het dichtst bij `at` ligt. */
export function moveOpening(doc: ProjectDocument, floorId: string, openingId: string, at: Point): ProjectDocument {
  return updateFloor(doc, floorId, (f) => {
    const o = f.openings.find((x) => x.id === openingId);
    if (!o) throw new EditError("Opening niet gevonden.");
    const wall = getWall(f, o.wallId);
    const offset = clampOffset(Math.round(projectOntoWall(wall, at).offset / 10) * 10, o.width, wallLength(wall));
    return { ...f, openings: f.openings.map((x) => (x.id === openingId ? { ...x, offset } : x)) };
  });
}

export function updateOpening(
  doc: ProjectDocument,
  floorId: string,
  openingId: string,
  patch: Partial<Pick<Opening, "width" | "height" | "sillHeight" | "offset" | "swing" | "flipped">>,
): ProjectDocument {
  return updateFloor(doc, floorId, (f) => {
    const o = f.openings.find((x) => x.id === openingId);
    if (!o) throw new EditError("Opening niet gevonden.");
    const wall = getWall(f, o.wallId);
    const next = { ...o, ...patch };
    checkDimension(next.width, "De breedte", 200);
    checkDimension(next.height, "De hoogte", 200);
    if (!Number.isFinite(next.sillHeight) || next.sillHeight < 0) throw new EditError("De borstwering kan niet negatief zijn.");
    const len = wallLength(wall);
    if (next.width > len) throw new EditError(`De opening past niet in deze muur (maximaal ${Math.floor(len)} mm).`);
    if (next.sillHeight + next.height > wall.height) throw new EditError("De opening komt boven de muur uit.");
    next.offset = clampOffset(next.offset, next.width, len);
    return { ...f, openings: f.openings.map((x) => (x.id === openingId ? next : x)) };
  });
}

export function deleteOpening(doc: ProjectDocument, floorId: string, openingId: string): ProjectDocument {
  return updateFloor(doc, floorId, (f) => {
    if (!f.openings.some((o) => o.id === openingId)) throw new EditError("Opening niet gevonden.");
    return { ...f, openings: f.openings.filter((o) => o.id !== openingId) };
  });
}

// ---------------------------------------------------------------------------- Meubels

export function addFurniture(doc: ProjectDocument, floorId: string, catalogId: string, position: Point): { doc: ProjectDocument; furnitureId: string } {
  let item: Furniture;
  try {
    item = createFurniture(catalogId, position);
  } catch {
    throw new EditError("Onbekend meubel.");
  }
  return { doc: updateFloor(doc, floorId, (f) => ({ ...f, furniture: [...f.furniture, item] })), furnitureId: item.id };
}

export function updateFurniture(
  doc: ProjectDocument,
  floorId: string,
  furnitureId: string,
  patch: Partial<Pick<Furniture, "position" | "rotation" | "width" | "depth" | "height" | "elevation" | "name" | "materialId">>,
): ProjectDocument {
  if (patch.width !== undefined) checkDimension(patch.width, "De breedte", 10);
  if (patch.depth !== undefined) checkDimension(patch.depth, "De diepte", 10);
  if (patch.height !== undefined) checkDimension(patch.height, "De hoogte", 10);
  if (patch.elevation !== undefined && (!Number.isFinite(patch.elevation) || patch.elevation < 0)) throw new EditError("De hoogte boven de vloer kan niet negatief zijn.");
  if (patch.name !== undefined && (patch.name.trim() === "" || patch.name.length > 120)) throw new EditError("Geef het object een naam (maximaal 120 tekens).");
  if (patch.position && (!Number.isFinite(patch.position.x) || !Number.isFinite(patch.position.y))) throw new EditError("Ongeldige positie.");
  const rotation = patch.rotation === undefined ? undefined : normalizeDegrees(patch.rotation);
  if (rotation !== undefined && !Number.isFinite(rotation)) throw new EditError("Ongeldige draaiing.");
  return updateFloor(doc, floorId, (f) => {
    if (!f.furniture.some((x) => x.id === furnitureId)) throw new EditError("Object niet gevonden.");
    return {
      ...f,
      furniture: f.furniture.map((x) =>
        x.id === furnitureId ? { ...x, ...patch, ...(rotation !== undefined ? { rotation } : {}), ...(patch.name ? { name: patch.name.trim() } : {}) } : x,
      ),
    };
  });
}

export function moveFurniture(doc: ProjectDocument, floorId: string, furnitureId: string, position: Point): ProjectDocument {
  return updateFurniture(doc, floorId, furnitureId, { position: { ...position } });
}

export function rotateFurniture(doc: ProjectDocument, floorId: string, furnitureId: string, deltaDegrees: number): ProjectDocument {
  const item = doc.floors.find((f) => f.id === floorId)?.furniture.find((x) => x.id === furnitureId);
  if (!item) throw new EditError("Object niet gevonden.");
  return updateFurniture(doc, floorId, furnitureId, { rotation: item.rotation + deltaDegrees });
}

export function deleteFurniture(doc: ProjectDocument, floorId: string, furnitureId: string): ProjectDocument {
  return updateFloor(doc, floorId, (f) => {
    if (!f.furniture.some((x) => x.id === furnitureId)) throw new EditError("Object niet gevonden.");
    return { ...f, furniture: f.furniture.filter((x) => x.id !== furnitureId) };
  });
}

export function duplicateFurniture(doc: ProjectDocument, floorId: string, furnitureId: string, offset = 300): { doc: ProjectDocument; furnitureId: string } {
  const item = doc.floors.find((f) => f.id === floorId)?.furniture.find((x) => x.id === furnitureId);
  if (!item) throw new EditError("Object niet gevonden.");
  const copy: Furniture = { ...item, id: createId("item"), position: { x: item.position.x + offset, y: item.position.y + offset } };
  return { doc: updateFloor(doc, floorId, (f) => ({ ...f, furniture: [...f.furniture, copy] })), furnitureId: copy.id };
}

// ---------------------------------------------------------------------------- Instellingen

export function updateSettings(doc: ProjectDocument, patch: Partial<ProjectDocument["settings"]>): ProjectDocument {
  if (patch.defaultWallHeight !== undefined) checkDimension(patch.defaultWallHeight, "De muurhoogte", 100);
  if (patch.defaultWallThickness !== undefined) checkDimension(patch.defaultWallThickness, "De muurdikte", 20);
  if (patch.gridSize !== undefined) checkDimension(patch.gridSize, "De rastermaat", 10);
  return { ...doc, settings: { ...doc.settings, ...patch } };
}

/** Zet de hoogte van alle muren op een verdieping (bijv. via het eigenschappenpaneel zonder selectie). */
export function setAllWallHeights(doc: ProjectDocument, floorId: string, height: number): ProjectDocument {
  checkDimension(height, "De muurhoogte", 1000);
  const floor = doc.floors.find((f) => f.id === floorId);
  const tooLow = floor?.openings.some((o) => o.sillHeight + o.height > height);
  if (tooLow) throw new EditError("Een deur of raam is hoger dan deze muurhoogte. Pas eerst de opening aan.");
  return updateSettings(
    updateFloor(doc, floorId, (f) => ({ ...f, walls: f.walls.map((w) => ({ ...w, height })) })),
    { defaultWallHeight: height },
  );
}

// ---------------------------------------------------------------------------- Kleuren en materialen

const HEX = /^#[0-9a-fA-F]{6}$/;

function upsertMaterial(doc: ProjectDocument, id: string, name: string, color: string): ProjectDocument {
  if (!HEX.test(color)) throw new EditError("Ongeldige kleur.");
  const exists = doc.materials.some((m) => m.id === id);
  return {
    ...doc,
    materials: exists ? doc.materials.map((m) => (m.id === id ? { ...m, color } : m)) : [...doc.materials, { id, name, color }],
  };
}

/** Geeft alle muren op de verdieping dezelfde kleur. */
export function setWallColor(doc: ProjectDocument, floorId: string, color: string): ProjectDocument {
  const withMaterial = upsertMaterial(doc, "mat_walls", "Muurkleur", color);
  return updateFloor(withMaterial, floorId, (f) => ({ ...f, walls: f.walls.map((w) => ({ ...w, materialId: "mat_walls" })) }));
}

/** Geeft alle vloeren op de verdieping dezelfde kleur. */
export function setFloorColor(doc: ProjectDocument, floorId: string, color: string): ProjectDocument {
  const withMaterial = upsertMaterial(doc, "mat_floors", "Vloerkleur", color);
  return updateFloor(withMaterial, floorId, (f) => ({ ...f, rooms: f.rooms.map((r) => ({ ...r, floorMaterialId: "mat_floors" })) }));
}

/** Kleur van één meubel. */
export function setFurnitureColor(doc: ProjectDocument, floorId: string, furnitureId: string, color: string): ProjectDocument {
  const materialId = `mat_${furnitureId}`.slice(0, 64);
  const withMaterial = upsertMaterial(doc, materialId, "Meubelkleur", color);
  return updateFurniture(withMaterial, floorId, furnitureId, { materialId });
}

// ---------------------------------------------------------------------------- Binnenmaten

/**
 * Hoeveel de hartlijnlengte van een muur langer is dan de vrije binnenmaat: per aangesloten uiteinde de halve
 * dikte van de aansluitende muur. Exact voor haakse hoeken (de gebruikelijke situatie); bij schuine hoeken
 * een benadering.
 */
export function wallLengthAdjustment(floor: Floor, wall: Wall): number {
  let adjust = 0;
  for (const end of [wall.start, wall.end]) {
    const neighbours = floor.walls.filter((w) => w.id !== wall.id && (distance(w.start, end) <= ENDPOINT_TOLERANCE || distance(w.end, end) <= ENDPOINT_TOLERANCE));
    if (neighbours.length > 0) adjust += Math.max(...neighbours.map((w) => w.thickness)) / 2;
  }
  return adjust;
}

/** Vrije binnenmaat van een muur (tussen de aansluitende muren). */
export function wallInnerLength(floor: Floor, wall: Wall): number {
  return wallLength(wall) - wallLengthAdjustment(floor, wall);
}

/** Zet de binnenmaat van een muur; het eindpunt verschuift en aansluitende muren rekken mee. */
export function setWallInnerLength(doc: ProjectDocument, floorId: string, wallId: string, innerLength: number): ProjectDocument {
  const floor = doc.floors.find((f) => f.id === floorId);
  if (!floor) throw new EditError("Verdieping niet gevonden.");
  const wall = getWall(floor, wallId);
  checkDimension(innerLength, "De muurlengte", MIN_WALL_LENGTH);
  return setWallLength(doc, floorId, wallId, innerLength + wallLengthAdjustment(floor, wall));
}
