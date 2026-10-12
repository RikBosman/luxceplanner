import { expect, test } from "@playwright/test";
import { hasStack, login, logout, registerAndConfirm, uniqueEmail, waitForEmailLink } from "./helpers";

test.describe("accounts en projecten (vereist lokale stack)", () => {
  test.skip(!hasStack(), "Start eerst tests/stack/start.sh");

  test("registreren, project aanmaken, beheren en isolatie tussen gebruikers", async ({ page, browser }) => {
    const anna = uniqueEmail("anna");
    const password = "Geheim123!";
    await registerAndConfirm(page, anna, password);

    // Lege toestand
    await expect(page.getByText("Je hebt nog geen ontwerpen")).toBeVisible();

    // Ongeldige maat geeft een duidelijke melding
    await page.getByLabel("Breedte").fill("vier meter");
    await page.getByRole("button", { name: "Ontwerp aanmaken" }).click();
    await expect(page.getByText(/Vul een breedte in/)).toBeVisible();

    // Project met echte afmetingen
    await page.getByLabel("Naam van je ontwerp").fill("Woonkamer Anna");
    await page.getByLabel("Breedte").fill("4 m");
    await page.getByLabel("Lengte").fill("5000");
    await page.getByRole("button", { name: "Ontwerp aanmaken" }).click();
    await expect(page).toHaveURL(/\/app\/projecten\/[0-9a-f-]{36}$/);
    const projectUrl = page.url();
    await expect(page.getByRole("heading", { name: "Woonkamer Anna" })).toBeVisible();

    // Hernoemen, dupliceren, verwijderen in het dashboard
    await page.goto("/app");
    await page.getByText("Hernoemen", { exact: true }).click();
    await page.getByLabel("Nieuwe naam").fill("Woonkamer");
    await page.getByRole("button", { name: "Naam opslaan" }).click();
    await expect(page.getByRole("heading", { name: "Woonkamer", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Dupliceren" }).click();
    await expect(page.getByRole("heading", { name: "Woonkamer (kopie)" })).toBeVisible();
    const copyCard = page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: "Woonkamer (kopie)" }) });
    await copyCard.getByText("Verwijderen", { exact: true }).click();
    await copyCard.getByRole("button", { name: "Ja, verwijder ontwerp" }).click();
    await expect(page.getByRole("heading", { name: "Woonkamer (kopie)" })).toHaveCount(0);
    await expect(page.getByText("Gratis plan · 1 van 3 ontwerpen")).toBeVisible();

    // Uitloggen: app niet meer bereikbaar
    await logout(page);
    await page.goto("/app");
    await expect(page).toHaveURL(/\/inloggen/);

    // Een andere gebruiker kan Anna's project niet openen
    const context = await browser.newContext();
    const other = await context.newPage();
    await registerAndConfirm(other, uniqueEmail("bram"), password);
    const res = await other.goto(projectUrl);
    expect(res?.status()).toBe(404);
    await expect(other.getByText("Deze pagina bestaat niet")).toBeVisible();
    await context.close();

    // Opnieuw inloggen: project is er nog
    await login(page, anna, "verkeerd-wachtwoord1");
    await expect(page.getByRole("alert").filter({ hasText: "E-mailadres of wachtwoord klopt niet" })).toBeVisible();
    await login(page, anna, password);
    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("heading", { name: "Woonkamer", exact: true })).toBeVisible();
  });

  test("wachtwoord vergeten en opnieuw instellen", async ({ page }) => {
    const email = uniqueEmail("reset");
    await registerAndConfirm(page, email, "Oudwachtwoord1");
    await logout(page);

    await page.goto("/wachtwoord-vergeten");
    await page.getByLabel("E-mailadres").fill(email);
    await page.getByRole("button", { name: "Stuur herstellink" }).click();
    await expect(page.getByText(/Als er een account bij dit e-mailadres hoort/)).toBeVisible();

    const link = await waitForEmailLink(email, 1);
    await page.goto(link);
    await expect(page).toHaveURL(/\/wachtwoord-herstellen$/);
    await page.getByLabel("Nieuw wachtwoord", { exact: true }).fill("Nieuwwachtwoord2");
    await page.getByLabel("Herhaal nieuw wachtwoord").fill("Nieuwwachtwoord2");
    await page.getByRole("button", { name: "Wachtwoord opslaan" }).click();
    await expect(page.getByText("Je wachtwoord is gewijzigd.")).toBeVisible();

    await logout(page);
    await login(page, email, "Nieuwwachtwoord2");
    await expect(page).toHaveURL(/\/app$/);
  });

  test("account verwijderen", async ({ page }) => {
    const email = uniqueEmail("weg");
    await registerAndConfirm(page, email, "Weggaan123");
    await page.goto("/app/account");
    await page.getByRole("button", { name: /Account en alle ontwerpen verwijderen/ }).click();
    await expect(page.getByText("Typ VERWIJDER om te bevestigen.")).toBeVisible();
    await page.getByLabel(/Typ "VERWIJDER"/).fill("VERWIJDER");
    await page.getByRole("button", { name: /Account en alle ontwerpen verwijderen/ }).click();
    await expect(page).toHaveURL(/\/inloggen\?melding=account-verwijderd/);
    await login(page, email, "Weggaan123");
    await expect(page.getByRole("alert").filter({ hasText: "klopt niet" })).toBeVisible();
  });
});
