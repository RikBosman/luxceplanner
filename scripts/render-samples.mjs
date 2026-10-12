// Maakt de 3D-renders van de voorbeeldontwerpen voor de website (public/renders/<slug>.jpg).
//
// Gebruik:
//   1. Start de app: pnpm dev
//   2. In een tweede terminal: pnpm render:samples
// Opnieuw draaien na het aanpassen van voorbeeldontwerpen, meubelvormen of materialen.
// Vereist Chromium voor Playwright (eenmalig: pnpm exec playwright install chromium).
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.RENDER_BASE_URL ?? "http://localhost:3000";
const slugs = (process.env.RENDER_SLUGS ?? "woonkamer,slaapkamer,keuken").split(",");
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
// Resolutie en aantal samples (meer samples = minder ruis, maar langer renderen). Met een videokaart duurt
// 1600×1000 bij 512 samples enkele minuten per beeld; zonder videokaart (software-rendering) veel langer.
const width = Number(process.env.RENDER_WIDTH ?? 1600);
const height = Number(process.env.RENDER_HEIGHT ?? 1000);
const samples = Number(process.env.RENDER_SAMPLES ?? 512);

await mkdir("public/renders", { recursive: true });
const browser = await chromium.launch({ executablePath, args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
for (const slug of slugs) {
  const response = await page.goto(`${base}/render/${slug}?w=${width}&h=${height}&samples=${samples}`);
  if (!response?.ok()) throw new Error(`Render-pagina voor "${slug}" gaf status ${response?.status()}`);
  await page.waitForFunction(() => document.body.dataset.renderReady === "1", null, { timeout: 0, polling: 2000 });
  await page.getByTestId("photo-output").screenshot({ path: `public/renders/${slug}.jpg`, type: "jpeg", quality: 90 });
  console.log(`✓ public/renders/${slug}.jpg`);
}
await browser.close();
