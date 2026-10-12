import { expect, type Page } from "@playwright/test";

const GATEWAY = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";

export const hasStack = () => process.env.E2E_STACK === "1";
export const isLocal = () => process.env.E2E_LOCAL === "1";

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

function decodeQuotedPrintable(raw: string) {
  return raw.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));
}

/** Wacht op een e-mail aan `to` in de lokale SMTP-opvang en geeft de eerste link naar de Auth-server terug. */
export async function waitForEmailLink(to: string, after = 0): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${GATEWAY}/_mail`);
    const mails = (await res.json()) as { to: string[]; raw: string }[];
    const matching = mails.filter((m) => m.to.includes(to));
    const mail = matching[after];
    if (mail) {
      const body = decodeQuotedPrintable(mail.raw).replace(/&amp;/g, "&");
      const link = body.match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify\?[^\s"'<>]+/)?.[0];
      if (link) return link;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Geen e-mail ontvangen voor ${to}`);
}

export async function registerAndConfirm(page: Page, email: string, password: string) {
  await page.goto("/registreren");
  await page.getByLabel("E-mailadres").fill(email);
  await page.getByLabel("Wachtwoord", { exact: true }).fill(password);
  await page.getByLabel("Herhaal wachtwoord").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Account aanmaken" }).click();
  await expect(page.getByText(/We hebben je een e-mail gestuurd/)).toBeVisible();
  const link = await waitForEmailLink(email);
  await page.goto(link);
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Welkom in je ontwerpstudio" })).toBeVisible();
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/inloggen");
  await page.getByLabel("E-mailadres").fill(email);
  await page.getByLabel("Wachtwoord").fill(password);
  await page.getByRole("button", { name: "Inloggen" }).click();
}

export async function logout(page: Page) {
  await page.locator("summary[aria-label^=Accountmenu]").click();
  await page.getByRole("button", { name: "Uitloggen" }).click();
  await expect(page).toHaveURL(/\/$/);
}
