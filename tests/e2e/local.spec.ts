import { expect, test } from "@playwright/test";
import { isLocal } from "./helpers";

test.describe("lokale modus (zonder Supabase)", () => {
  test.skip(!isLocal(), "Alleen in lokale modus (pnpm test:e2e:local)");

  test("studio werkt zonder account; ontwerpen worden lokaal bewaard en beheerd", async ({ page }) => {
    await page.goto("/inloggen");
    await expect(page.getByRole("heading", { name: "Lokale modus" })).toBeVisible();
    await page.getByRole("link", { name: "Naar de ontwerpstudio" }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByText(/Lokale modus — geen account nodig/)).toBeVisible();

    await page.getByLabel("Naam van je ontwerp").fill("Lokale kamer");
    await page.getByRole("button", { name: "Ontwerp aanmaken" }).click();
    await expect(page.getByTestId("wall")).toHaveCount(4);
    await page.getByRole("button", { name: "Boekenkast" }).click();
    await expect(page.getByTestId("save-status")).toHaveAttribute("data-status", "saved", { timeout: 10_000 });

    await page.goto("/app");
    await expect(page.getByText(/^Lokaal plan · \d+ ontwerpen?$/)).toBeVisible();
    const card = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Lokale kamer", exact: true }) });
    await card.getByRole("button", { name: "Dupliceren" }).click();
    await expect(page.getByRole("heading", { name: "Lokale kamer (kopie)" })).toBeVisible();
    await page.getByRole("link", { name: "Lokale kamer (kopie) openen" }).click();
    await expect(page.getByTestId("furniture")).toHaveCount(1);

    await page.goto("/app/account");
    await page.getByLabel(/Typ "VERWIJDER"/).fill("VERWIJDER");
    await page.getByRole("button", { name: "Alle lokale ontwerpen wissen" }).click();
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByText("Je hebt nog geen ontwerpen")).toBeVisible();
  });
});
