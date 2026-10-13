import { describe, expect, it, vi } from "vitest";
import { SAMPLE_DESIGNS } from "@/domain/project";
import { AiRenderError, buildGeminiRequest, generateWithGemini, parseGeminiImageResponse } from "./gemini";
import { buildAiRenderPrompt, describeDesign } from "./prompt";
import { DailyLimiter } from "./rate-limit";

const doc = SAMPLE_DESIGNS[0]!.document;

describe("AI-render prompt", () => {
  it("beschrijft de ruimte uit de projectdata", () => {
    const d = describeDesign(doc);
    expect(d).toContain("6 m × 4,2 m");
    expect(d).toContain("Loungebank");
    expect(d).toContain("4× Eetkamerstoel");
    expect(d).toContain("Kalkverf taupe");
  });

  it("vraagt om behoud van indeling en neemt stijl en wens op", () => {
    const p = buildAiRenderPrompt(doc, "scandinavisch", 'meer planten "graag"');
    expect(p).toMatch(/Keep the exact camera angle/);
    expect(p).toMatch(/Do not add or remove furniture/);
    expect(p).toContain("Scandinavian");
    expect(p).toContain("meer planten 'graag'");
    expect(buildAiRenderPrompt(doc, "zoals-ontworpen", "x".repeat(1000)).length).toBeLessThan(2200);
  });
});

describe("Gemini-koppeling", () => {
  const image = { mimeType: "image/jpeg", data: "QUJD" };

  it("bouwt een geldig verzoek met beeld en tekst", () => {
    const req = buildGeminiRequest("prompt", image, "16:9");
    expect(req.contents[0]!.parts[1]).toEqual({ inlineData: { mimeType: "image/jpeg", data: "QUJD" } });
    expect(req.generationConfig).toEqual({ responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "16:9" } });
  });

  it("haalt het beeld uit het antwoord en slaat 'thought'-delen over", () => {
    const img = parseGeminiImageResponse({
      candidates: [{ content: { parts: [{ text: "hier", thought: true }, { inlineData: { mimeType: "image/png", data: "eHl6" } }] } }],
    });
    expect(img).toEqual({ mimeType: "image/png", data: "eHl6" });
    expect(parseGeminiImageResponse({ candidates: [{ content: { parts: [{ inline_data: { mime_type: "image/webp", data: "cXE=" } }] } }] }).mimeType).toBe("image/webp");
  });

  it("geeft begrijpelijke fouten bij weigering, leeg antwoord en quotum", async () => {
    expect(() => parseGeminiImageResponse({ promptFeedback: { blockReason: "SAFETY" } })).toThrow(/geweigerd/);
    expect(() => parseGeminiImageResponse({ candidates: [{ content: { parts: [{ text: "sorry" }] } }] })).toThrow(/geen afbeelding/);
    const quota = vi.fn(async () => new Response("{}", { status: 429 }));
    await expect(generateWithGemini({ apiKey: "k", model: "m", prompt: "p", image, aspectRatio: "16:9" }, quota)).rejects.toMatchObject({ code: "quota" });
  });

  it("stuurt de sleutel in een header (niet in de URL)", async () => {
    const ok = vi.fn<typeof fetch>(async () => Response.json({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: "eHl6" } }] } }] }));
    const result = await generateWithGemini({ apiKey: "geheim", model: "gemini-2.5-flash-image", prompt: "p", image, aspectRatio: "16:9" }, ok);
    expect(result.data).toBe("eHl6");
    const [url, init] = ok.mock.calls[0]!;
    expect(String(url)).not.toContain("geheim");
    expect((init!.headers as Record<string, string>)["x-goog-api-key"]).toBe("geheim");
    expect(AiRenderError).toBeDefined();
  });
});

describe("daglimiet", () => {
  it("telt per gebruiker per dag en kan teruggeven", () => {
    let now = new Date("2026-10-13T10:00:00Z");
    const l = new DailyLimiter(2, () => now);
    expect(l.take("a").ok).toBe(true);
    expect(l.take("a").ok).toBe(true);
    expect(l.take("a").ok).toBe(false);
    expect(l.take("b").ok).toBe(true);
    l.refund("a");
    expect(l.take("a").ok).toBe(true);
    now = new Date("2026-10-14T00:01:00Z");
    expect(l.take("a")).toEqual({ ok: true, remaining: 1 });
  });
});
