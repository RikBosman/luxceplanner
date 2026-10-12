import { expect, test } from "@playwright/test";
import { isLocal } from "./helpers";

const pages = [
  ["/", /Ontwerp je woning/],
  ["/functies", /Functies/],
  ["/hoe-het-werkt", /Hoe het werkt/],
  ["/prijzen", /Prijzen/],
  ["/inspiratie", /Inspiratie/],
  ["/veelgestelde-vragen", /Veelgestelde vragen/],
  ["/contact", /Contact/],
  ["/privacy", /Privacyverklaring/],
  ["/voorwaarden", /Gebruiksvoorwaarden/],
  ["/inloggen", /Inloggen/],
  ["/registreren", /account/i],
  ["/wachtwoord-vergeten", /Wachtwoord vergeten/],
] as const;

test.describe("marketingwebsite", () => {
  for (const [path, title] of pages) {
    test(`pagina ${path} laadt met eigen titel en één h1`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(title);
      await expect(page.locator("h1")).toHaveCount(1);
      const description = await page.locator('meta[name="description"]').getAttribute("content");
      expect(description?.length ?? 0).toBeGreaterThan(40);
    });
  }

  test("homepage leidt naar registreren en toont 2D- en 3D-voorbeeld", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("img", { name: /Plattegrond:/ }).first()).toBeVisible();
    await expect(page.getByRole("img", { name: /3D-voorvertoning:/ }).first()).toBeVisible();
    await page.getByRole("main").getByRole("link", { name: "Gratis beginnen" }).first().click();
    await expect(page).toHaveURL(/\/registreren$/);
  });

  test("inhoud is zichtbaar zonder JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Teken je kamer");
    await expect(page.getByText("In drie stappen")).toBeVisible();
    await context.close();
  });

  test("sitemap en robots.txt bestaan", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBe(true);
    expect(await sitemap.text()).toContain("/functies");
    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toContain("Disallow: /app");
  });

  test("beveiligde app stuurt niet-ingelogde bezoekers naar inloggen", async ({ page }) => {
    test.skip(isLocal(), "In lokale modus is er geen inloggen");
    await page.goto("/app/projecten/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/inloggen\?volgende=/);
  });
});
