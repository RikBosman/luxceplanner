import "server-only";
import { isLocalMode } from "@/lib/mode";
import { DEFAULT_GEMINI_IMAGE_MODEL } from "./gemini";

export type AiProvider = { kind: "gemini"; apiKey: string; model: string } | { kind: "mock" } | null;

/**
 * Welke AI-dienst er gebruikt wordt:
 * - GEMINI_API_KEY ingesteld → Google Gemini (model via GEMINI_IMAGE_MODEL);
 * - AI_RENDER_PROVIDER=mock → testmodus zonder AI (alleen lokaal of tijdens ontwikkeling);
 * - anders uitgeschakeld.
 */
export function getAiProvider(): AiProvider {
  const forced = process.env.AI_RENDER_PROVIDER?.trim().toLowerCase();
  if (forced === "mock" && (isLocalMode() || process.env.NODE_ENV !== "production")) return { kind: "mock" };
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (apiKey && forced !== "off") return { kind: "gemini", apiKey, model: process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_GEMINI_IMAGE_MODEL };
  return null;
}

export function aiDailyLimit(): number {
  const n = Number(process.env.AI_RENDER_DAILY_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 20;
}
