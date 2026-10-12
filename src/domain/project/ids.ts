/** Genereert een stabiele, unieke ID met een leesbaar voorvoegsel, bijv. "wall_3f9c…". */
export function createId(prefix: string): string {
  const random =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${random.slice(0, 20)}`;
}
