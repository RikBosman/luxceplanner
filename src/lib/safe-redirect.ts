/** Staat alleen interne paden binnen de app toe als doorverwijzing (voorkomt open redirects). */
export function safeAppPath(value: unknown, fallback = "/app"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (!(value === "/app" || value.startsWith("/app/") || value.startsWith("/app?") || value === "/wachtwoord-herstellen")) return fallback;
  return value;
}
