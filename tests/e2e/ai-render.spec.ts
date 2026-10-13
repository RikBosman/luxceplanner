import { expect, test } from "@playwright/test";
import { hasStack, isLocal } from "./helpers";

const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test.describe("AI-render", () => {
  test("volledige flow in testmodus: 3D-weergave → AI-impressie → download", async ({ page }) => {
    test.skip(!isLocal(), "Testmodus (mock) draait in lokale modus");
    await page.goto("/app");
    await page.getByLabel("Naam van je ontwerp").fill("AI-test");
    await page.getByRole("button", { name: "Ontwerp aanmaken" }).click();
    await page.getByRole("button", { name: "Bank (3-zits)" }).click();
    await page.getByRole("button", { name: "3D", exact: true }).click();
    await expect(page.getByTestId("view-3d").locator("canvas")).toBeVisible();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "✦ AI-render" }).click();

    const dialog = page.getByTestId("ai-dialog");
    await expect(dialog.getByRole("img", { name: "Momentopname van de 3D-weergave" })).toBeVisible();
    await dialog.getByRole("button", { name: "Scandinavisch licht" }).click();
    await dialog.getByLabel("Eigen wens (optioneel)").fill("meer planten");
    await dialog.getByRole("button", { name: "Maak AI-render" }).click();
    await expect(dialog.getByTestId("ai-result")).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText(/nog 4 AI-renders vandaag/)).toBeVisible();
    const download = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Download" }).click();
    expect((await download).suggestedFilename()).toContain("AI-impressie");
  });

  test("weigert onbekende ontwerpen en ongeldige verzoeken", async ({ request }) => {
    test.skip(!isLocal(), "Testmodus (mock) draait in lokale modus");
    const unknown = await request.post("/api/ai-render", { data: { projectId: "00000000-0000-4000-8000-000000000000", style: "warm-gelaagd", image: tinyPng } });
    expect(unknown.status()).toBe(404);
    const bad = await request.post("/api/ai-render", { data: { projectId: "x", style: "onbekend", image: "geen-afbeelding" } });
    expect(bad.status()).toBe(400);
  });

  test("zonder inloggen geen toegang, en zonder sleutel een duidelijke melding", async ({ request }) => {
    test.skip(!hasStack(), "Vereist de Supabase-teststack");
    const res = await request.post("/api/ai-render", { data: {} });
    expect(res.status()).toBe(401);
    expect((await res.json()).error).toMatch(/Log in/);
  });
});
