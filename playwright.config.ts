import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium",
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
  webServer: {
    command: "npm run build && npm run start -- -p 3100",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      LESSON_SIGNING_SECRET: "chalk-e2e-only-signing-secret",
      // Override inherited provider credentials; every AI endpoint is mocked.
      ANTHROPIC_API_KEY: "",
      ELEVENLABS_API_KEY: "",
      RUNWAYML_API_SECRET: "",
      BBANANA_API_KEY: "",
      // The e2e suite runs without sign-in (lessons in IndexedDB).
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
    },
  },
});
