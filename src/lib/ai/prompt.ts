/**
 * Opbouw van de opdracht (prompt) voor een AI-render: het AI-model krijgt de 3D-weergave van de studio
 * plus een beschrijving uit de projectdata, met de strikte opdracht de indeling te behouden.
 */
import { formatLength, getCatalogItem, polygonArea, type ProjectDocument } from "@/domain/project";

export const AI_STYLES = {
  "zoals-ontworpen": {
    label: "Zoals ontworpen",
    prompt: "Keep the colors and materials exactly as they appear in the input image.",
  },
  "warm-gelaagd": {
    label: "Warm & gelaagd",
    prompt: "Warm, layered and calm: taupe limewash walls, smoked oak floor, cognac velvet, boucle, linen, black metal accents and dried branches in stoneware vases.",
  },
  scandinavisch: {
    label: "Scandinavisch licht",
    prompt: "Light Scandinavian style: white walls, pale oak floor, light linen and wool textiles, simple wooden furniture, soft daylight.",
  },
  "modern-luxe": {
    label: "Modern luxe",
    prompt: "Modern luxury: warm greige walls, large-format natural stone and dark oak, brushed brass details, velvet upholstery, statement lighting.",
  },
} as const;

export type AiStyle = keyof typeof AI_STYLES;

/** Korte, feitelijke beschrijving van de ruimte uit de projectdata (afmetingen, meubels, kleuren). */
export function describeDesign(doc: ProjectDocument): string {
  const floor = doc.floors[0]!;
  const color = (id?: string) => doc.materials.find((m) => m.id === id);
  const rooms = floor.rooms.map((r) => {
    const xs = r.polygon.map((p) => p.x);
    const ys = r.polygon.map((p) => p.y);
    const w = Math.max(...xs) - Math.min(...xs);
    const l = Math.max(...ys) - Math.min(...ys);
    return `${r.name} of about ${formatLength(w)} × ${formatLength(l)} (${(polygonArea(r.polygon) / 1e6).toFixed(1)} m²)`;
  });
  const counts = new Map<string, number>();
  for (const f of floor.furniture) counts.set(f.name, (counts.get(f.name) ?? 0) + 1);
  const furniture = [...counts.entries()].map(([name, n]) => {
    const f = floor.furniture.find((x) => x.name === name)!;
    const mat = color(f.materialId)?.name ?? getCatalogItem(f.catalogId)?.name;
    return `${n > 1 ? `${n}× ` : ""}${name}${mat && mat !== name ? ` (${mat})` : ""}`;
  });
  const walls = color(floor.walls[0]?.materialId)?.name;
  const floorMat = color(floor.rooms[0]?.floorMaterialId)?.name;
  const windows = floor.openings.filter((o) => o.type === "window").length;
  const doors = floor.openings.filter((o) => o.type === "door").length;
  return [
    rooms.length ? `Room: ${rooms.join("; ")}, ceiling height ${formatLength(floor.walls[0]?.height ?? 2600)}.` : "",
    `Openings: ${windows} window(s), ${doors} door(s).`,
    furniture.length ? `Furniture (Dutch names): ${furniture.join(", ")}.` : "No furniture yet.",
    walls ? `Walls: ${walls}.` : "",
    floorMat ? `Floor: ${floorMat}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildAiRenderPrompt(doc: ProjectDocument, style: AiStyle, wish?: string): string {
  const extra = wish?.trim() ? ` Additional wish from the user: "${wish.trim().slice(0, 300).replace(/"/g, "'")}".` : "";
  return [
    "Turn this 3D interior visualisation into a photorealistic interior photograph.",
    "Keep the exact camera angle, room shape, wall positions, windows, doors and the position, size and type of every piece of furniture. Do not add or remove furniture, walls, windows or doors.",
    "Replace the simple 3D shapes with realistic, high-quality materials and furniture of the same shape and size. Natural daylight through the windows, soft realistic shadows and global illumination, professional architectural interior photography, sharp focus, 35 mm lens.",
    "No people, no text, no watermark, no logos.",
    AI_STYLES[style].prompt,
    describeDesign(doc),
  ].join(" ") + extra;
}
