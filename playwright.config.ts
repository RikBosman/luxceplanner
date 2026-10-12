import { existsSync, readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// E2E_LOCAL=1: test de lokale modus (zonder Supabase, opslag in een tijdelijke map).
const localMode = process.env.E2E_LOCAL === "1";

// Anders: laad de omgevingsvariabelen van de lokale teststack (tests/stack/start.sh) als die bestaat.
const stackEnvFile = ".stack/env";
const stackEnv: Record<string, string> = !localMode && existsSync(stackEnvFile)
  ? Object.fromEntries(
      readFileSync(stackEnvFile, "utf8")
        .split("\n")
        .filter((l) => l.includes("="))
        .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
    )
  : {};
Object.assign(process.env, stackEnv, { E2E_STACK: stackEnv.NEXT_PUBLIC_SUPABASE_URL ? "1" : "" });

const PORT = localMode ? 3200 : 3100;
const chromiumPath = process.env.PW_CHROMIUM_PATH ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      ...stackEnv,
      ...(localMode ? { RUIMTE_MODE: "local", RUIMTE_DATA_DIR: `.data/e2e-${Date.now()}` } : {}),
      NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
    },
  },
});
