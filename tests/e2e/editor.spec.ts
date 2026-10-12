import { expect, test, type Page } from "@playwright/test";
import { getCatalogItem } from "../../src/domain/project/catalog";
import { furnitureParts } from "../../src/domain/project/furniture-parts";
import { hasStack, isLocal, registerAndConfirm, uniqueEmail } from "./helpers";

const partCount = (catalogId: string) => {
  const c = getCatalogItem(catalogId)!;
  return furnitureParts(c.kind, c.width, c.depth, c.height).length;
};

async function newProject(page: Page, name = "Editor test") {
  if (isLocal()) await page.goto("/app");
  else await registerAndConfirm(page, uniqueEmail("editor"), "Geheim123!");
  await page.getByLabel("Naam van je ontwerp").fill(name);
  await page.getByLabel("Breedte").fill("4 m");
  await page.getByLabel("Lengte").fill("5 m");
  await page.getByRole("button", { name: "Ontwerp aanmaken" }).click();
  await expect(page.getByTestId("plan-canvas")).toBeVisible();
}

const saved = (page: Page) => expect(page.getByTestId("save-status")).toHaveAttribute("data-status", "saved", { timeout: 10_000 });

async function center(page: Page, locator: ReturnType<Page["locator"]>) {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe("2D-editor en 3D", () => {
  test.skip(!hasStack() && !isLocal(), "Start eerst tests/stack/start.sh, of draai in lokale modus (pnpm test:e2e:local)");

  test("kamer op maat, meubels plaatsen, draaien, ongedaan maken, opslaan en opnieuw openen", async ({ page }) => {
    await newProject(page);
    await expect(page.getByTestId("wall")).toHaveCount(4);
    // Binnenmaten van 4 × 5 m staan als maatlijnen in beeld.
    await expect(page.getByTestId("wall-dimension").filter({ hasText: /^4 m$/ })).toHaveCount(2);
    await expect(page.getByTestId("wall-dimension").filter({ hasText: /^5 m$/ })).toHaveCount(2);
    await expect(page.getByText("20,0 m²").first()).toBeVisible();

    // Meubel toevoegen en verslepen
    await page.getByRole("button", { name: "Bank (3-zits)" }).click();
    const sofa = page.getByTestId("furniture");
    await expect(sofa).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Bank (3-zits)" })).toBeVisible();
    const xField = page.getByLabel("Positie x");
    const before = Number(await xField.inputValue());
    const c = await center(page, sofa);
    await page.mouse.move(c.x, c.y);
    await page.mouse.down();
    await page.mouse.move(c.x + 40, c.y, { steps: 5 });
    await page.mouse.move(c.x + 80, c.y, { steps: 5 });
    await page.mouse.up();
    await expect.poll(async () => Number(await xField.inputValue())).toBeGreaterThan(before + 100);

    // Draaien met R, ongedaan maken en opnieuw uitvoeren
    const rotation = page.getByLabel("Draaiing");
    await page.keyboard.press("r");
    await expect(rotation).toHaveValue("90");
    await page.keyboard.press("Control+z");
    await expect(rotation).toHaveValue("0");
    await page.keyboard.press("Control+Shift+z");
    await expect(rotation).toHaveValue("90");

    // Exacte maat invoeren
    const props = page.getByRole("complementary", { name: "Eigenschappen" });
    await props.getByLabel("Breedte").fill("2,4 m");
    await props.getByLabel("Breedte").press("Enter");
    await expect(props.getByLabel("Breedte")).toHaveValue("2400");
    await props.getByLabel("Diepte").fill("onzin");
    await props.getByLabel("Diepte").press("Enter");
    await expect(page.getByText("Typ een maat, bijv. 4000, 400 cm of 4 m.")).toBeVisible();

    await saved(page);
    await page.reload();
    await expect(page.getByTestId("furniture")).toHaveCount(1);
    // Selecteren via de elementenlijst (ook met het toetsenbord bruikbaar)
    await page.getByRole("complementary", { name: "Eigenschappen" }).getByRole("button", { name: "Bank (3-zits)" }).click();
    await expect(page.getByLabel("Draaiing")).toHaveValue("90");
    await expect(page.getByRole("complementary", { name: "Eigenschappen" }).getByLabel("Breedte")).toHaveValue("2400");
  });

  test("muren, deuren en ramen bewerken en verwijderen", async ({ page }) => {
    await newProject(page);
    const topWall = page.getByTestId("wall").first();
    await page.mouse.click(...Object.values(await center(page, topWall)) as [number, number]);
    await expect(page.getByRole("heading", { name: "Muur" })).toBeVisible();
    const length = page.getByLabel("Lengte (binnenmaat)");
    await expect(length).toHaveValue("4000");
    await length.fill("450 cm");
    await length.press("Enter");
    await length.blur(); // Ctrl+Z binnen een tekstveld is tekst-undo; daarbuiten ontwerp-undo
    await expect(page.getByTestId("wall-dimension").filter({ hasText: /^4,5 m$/ })).toHaveCount(1);
    await expect(page.getByTestId("wall-dimension").filter({ hasText: /^4 m$/ })).toHaveCount(1);
    await page.keyboard.press("Control+z");
    await expect(length).toHaveValue("4000");

    // Deur plaatsen met het deurgereedschap
    await page.keyboard.press("Escape");
    await page.keyboard.press("d");
    const wallCenter = await center(page, page.getByTestId("wall").first());
    await page.mouse.click(wallCenter.x, wallCenter.y);
    await expect(page.getByTestId("opening-door")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Deur", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Draairichting omkeren" }).click();

    // Raam op de rechtermuur
    await page.getByRole("button", { name: "Raam", exact: true }).click();
    const right = await center(page, page.getByTestId("wall").nth(1));
    await page.mouse.click(right.x, right.y);
    await expect(page.getByTestId("opening-window")).toHaveCount(1);

    // Ongeldige opening geeft een begrijpelijke melding
    const props = page.getByRole("complementary", { name: "Eigenschappen" });
    await props.getByLabel("Hoogte", { exact: true }).fill("3000");
    await props.getByLabel("Hoogte", { exact: true }).press("Enter");
    await expect(page.getByRole("alert").filter({ hasText: "boven de muur" })).toBeVisible();

    // Muur tekenen in lege ruimte
    await props.getByLabel("Hoogte", { exact: true }).blur();
    await page.getByRole("button", { name: "Muur", exact: true }).click();
    const canvas = (await page.getByTestId("plan-canvas").boundingBox())!;
    await page.mouse.click(canvas.x + 60, canvas.y + 80);
    await page.mouse.click(canvas.x + 60, canvas.y + 300);
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("wall")).toHaveCount(5);

    // Muur verwijderen haalt ook de deur weg
    await page.getByRole("button", { name: "Selecteren", exact: true }).click();
    const top = await center(page, page.getByTestId("wall").first());
    await page.mouse.click(top.x - 60, top.y);
    await expect(page.getByRole("heading", { name: "Muur" })).toBeVisible();
    await page.keyboard.press("Delete");
    await expect(page.getByTestId("wall")).toHaveCount(4);
    await expect(page.getByTestId("opening-door")).toHaveCount(0);
    await saved(page);
  });

  test("opslagfouten worden zichtbaar en het werk wordt alsnog opgeslagen", async ({ page }) => {
    await newProject(page);
    await saved(page);
    // Netwerkstoring: alle server-actions mislukken.
    await page.route("**/app/projecten/**", (route) => (route.request().method() === "POST" ? route.abort("internetdisconnected") : route.continue()));
    await page.getByRole("button", { name: "Bureau" }).click();
    await expect(page.getByTestId("save-status")).toHaveAttribute("data-status", "error", { timeout: 10_000 });
    await expect(page.getByTestId("save-status")).toContainText("Opslaan mislukt");
    await page.unroute("**/app/projecten/**");
    await page.getByRole("button", { name: "Nu opnieuw" }).click();
    await saved(page);
    await page.reload();
    await expect(page.getByTestId("furniture")).toHaveCount(1);
  });

  test("een oudere versie overschrijft geen nieuwere (twee tabbladen)", async ({ page, context }) => {
    await newProject(page);
    await saved(page);
    const other = await context.newPage();
    await other.goto(page.url());
    await other.getByRole("button", { name: "Fauteuil" }).click();
    await expect(other.getByTestId("save-status")).toHaveAttribute("data-status", "saved", { timeout: 10_000 });

    await page.getByRole("button", { name: "Bureau" }).click();
    await expect(page.getByTestId("save-status")).toHaveAttribute("data-status", "conflict", { timeout: 10_000 });
    await page.getByRole("button", { name: "Laatste versie laden" }).click();
    await expect(page.getByTestId("furniture")).toHaveCount(1);
    await expect(page.getByTestId("furniture")).toHaveAttribute("data-name", "Fauteuil");
  });

  test("3D-weergave toont dezelfde kamer en blijft in sync met 2D", async ({ page }) => {
    await newProject(page);
    await page.getByRole("button", { name: "Tweepersoonsbed" }).click();
    await page.getByRole("button", { name: "3D", exact: true }).click();
    const view = page.getByTestId("view-3d");
    await expect(view).toBeVisible();
    await expect(view.locator("canvas")).toBeVisible();
    const boxesBefore = Number(await view.getAttribute("data-boxes"));
    expect(boxesBefore).toBe(4 + partCount("bed-double")); // 4 muren + alle onderdelen van het bed

    await page.getByRole("button", { name: /Muren: kleur #dfe6d6/ }).click();
    await expect(page.getByRole("button", { name: /Muren: kleur #dfe6d6/ })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Bovenaanzicht" }).click();

    await page.getByRole("button", { name: "2D", exact: true }).click();
    await page.getByRole("button", { name: "Bureau" }).click();
    await page.getByRole("button", { name: "3D", exact: true }).click();
    await expect(page.getByTestId("view-3d")).toHaveAttribute("data-boxes", String(boxesBefore + partCount("desk")));
    await saved(page);
  });
});
