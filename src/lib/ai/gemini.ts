/**
 * Aanroep van Google Gemini (beeldbewerking, "Nano Banana") via de REST-API, zonder SDK.
 * Alleen op de server gebruiken: de API-sleutel mag nooit naar de browser.
 */
export const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

export interface AiImage {
  mimeType: string;
  /** Base64 zonder data:-voorvoegsel. */
  data: string;
}

export class AiRenderError extends Error {
  constructor(
    readonly code: "not_configured" | "blocked" | "quota" | "timeout" | "bad_response" | "upstream",
    message: string,
  ) {
    super(message);
  }
}

export function buildGeminiRequest(prompt: string, image: AiImage, aspectRatio: string) {
  return {
    contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: image.mimeType, data: image.data } }] }],
    generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio } },
  };
}

interface GeminiPart {
  text?: string;
  thought?: boolean;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
}

/** Haalt het (eerste niet-"thought") beeld uit een Gemini-antwoord. */
export function parseGeminiImageResponse(json: unknown): AiImage {
  const res = json as {
    candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  };
  if (res?.promptFeedback?.blockReason) {
    throw new AiRenderError("blocked", "De AI heeft dit verzoek geweigerd. Pas je wens aan en probeer het opnieuw.");
  }
  for (const candidate of res?.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.thought) continue;
      const inline = part.inlineData ?? (part.inline_data ? { mimeType: part.inline_data.mime_type, data: part.inline_data.data } : undefined);
      if (inline?.data) return { mimeType: inline.mimeType ?? "image/png", data: inline.data };
    }
    if (candidate.finishReason && /SAFETY|PROHIBITED|BLOCK/i.test(candidate.finishReason)) {
      throw new AiRenderError("blocked", "De AI heeft dit verzoek geweigerd. Pas je wens aan en probeer het opnieuw.");
    }
  }
  throw new AiRenderError("bad_response", "De AI gaf geen afbeelding terug. Probeer het opnieuw.");
}

export async function generateWithGemini(
  opts: { apiKey: string; model: string; prompt: string; image: AiImage; aspectRatio: string; timeoutMs?: number },
  fetchImpl: typeof fetch = fetch,
): Promise<AiImage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 90_000);
  try {
    const res = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opts.model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": opts.apiKey },
      body: JSON.stringify(buildGeminiRequest(opts.prompt, opts.image, opts.aspectRatio)),
      signal: controller.signal,
    });
    if (res.status === 429) throw new AiRenderError("quota", "De AI-dienst is even overbelast of het tegoed is op. Probeer het later opnieuw.");
    if (res.status === 401 || res.status === 403) throw new AiRenderError("not_configured", "De AI-sleutel is ongeldig of heeft geen toegang tot dit model.");
    if (!res.ok) throw new AiRenderError("upstream", `De AI-dienst gaf een fout (${res.status}). Probeer het opnieuw.`);
    return parseGeminiImageResponse(await res.json());
  } catch (e) {
    if (e instanceof AiRenderError) throw e;
    if ((e as Error).name === "AbortError") throw new AiRenderError("timeout", "De AI deed er te lang over. Probeer het opnieuw.");
    throw new AiRenderError("upstream", "De AI-dienst is niet bereikbaar. Probeer het later opnieuw.");
  } finally {
    clearTimeout(timer);
  }
}
