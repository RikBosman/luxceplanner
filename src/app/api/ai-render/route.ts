import { z } from "zod";
import { parseProjectDocument } from "@/domain/project";
import { aiDailyLimit, getAiProvider } from "@/lib/ai/config";
import { AiRenderError, generateWithGemini } from "@/lib/ai/gemini";
import { AI_STYLES, buildAiRenderPrompt, type AiStyle } from "@/lib/ai/prompt";
import { DailyLimiter } from "@/lib/ai/rate-limit";
import { projectIdSchema } from "@/lib/projects/repository";
import { getStore } from "@/lib/projects/store";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const limiter = new DailyLimiter(aiDailyLimit());

const bodySchema = z.object({
  projectId: projectIdSchema,
  style: z.enum(Object.keys(AI_STYLES) as [AiStyle, ...AiStyle[]]),
  wish: z.string().max(300).optional(),
  image: z.string().regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Ongeldige afbeelding"),
  aspectRatio: z.enum(["16:9", "4:3", "3:2", "1:1"]).default("16:9"),
});

const json = (status: number, body: unknown) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** Maakt een AI-render (foto-echte impressie) van de 3D-weergave van een eigen ontwerp. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return json(401, { error: "Log in om een AI-render te maken." });

  const provider = getAiProvider();
  if (!provider) return json(503, { error: "AI-renders zijn nog niet ingesteld (GEMINI_API_KEY ontbreekt). Zie de README." });

  let parsed: z.infer<typeof bodySchema>;
  try {
    const raw = await request.text();
    if (raw.length > MAX_IMAGE_BYTES * 1.4) return json(413, { error: "De afbeelding is te groot." });
    const result = bodySchema.safeParse(JSON.parse(raw));
    if (!result.success) return json(400, { error: "Ongeldig verzoek." });
    parsed = result.data;
  } catch {
    return json(400, { error: "Ongeldig verzoek." });
  }

  // Alleen eigen ontwerpen; de beschrijving komt uit de opgeslagen projectdata, niet uit de browser.
  const store = await getStore();
  const project = store ? await store.get(parsed.projectId).catch(() => null) : null;
  const doc = project ? parseProjectDocument(project.document) : null;
  if (!project || !doc?.ok) return json(404, { error: "Ontwerp niet gevonden." });

  const quota = limiter.take(user.id);
  if (!quota.ok) return json(429, { error: `Je hebt het maximum van ${aiDailyLimit()} AI-renders voor vandaag bereikt. Morgen kun je weer verder.` });

  const [, mime, data] = parsed.image.match(/^data:(image\/[a-z]+);base64,(.*)$/)!;
  const prompt = buildAiRenderPrompt(doc.document, parsed.style, parsed.wish);

  try {
    if (provider.kind === "mock") {
      // Testmodus: geeft het invoerbeeld terug, zodat de hele flow zonder AI-dienst te testen is.
      return json(200, { image: parsed.image, provider: "mock", remaining: quota.remaining, prompt });
    }
    const result = await generateWithGemini({ apiKey: provider.apiKey, model: provider.model, prompt, image: { mimeType: mime!, data: data! }, aspectRatio: parsed.aspectRatio });
    return json(200, { image: `data:${result.mimeType};base64,${result.data}`, provider: provider.model, remaining: quota.remaining });
  } catch (e) {
    limiter.refund(user.id);
    if (e instanceof AiRenderError) {
      const status = e.code === "quota" ? 429 : e.code === "blocked" ? 422 : e.code === "not_configured" ? 503 : e.code === "timeout" ? 504 : 502;
      return json(status, { error: e.message });
    }
    console.error("AI-render mislukt:", (e as Error).name);
    return json(500, { error: "Er ging iets mis bij het maken van de AI-render." });
  }
}
