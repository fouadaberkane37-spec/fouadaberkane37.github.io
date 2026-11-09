import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run the real production build against two fakes:
 *  - a fake Anthropic API (via ANTHROPIC_BASE_URL) so the real parsing/retry code runs
 *  - a fake Make webhook that records every payload for assertions
 * Photos go to a local folder (no Blob token), the address field is plain text (no Google key).
 */

const PORT = 3100;
const MOCK_PORT = 4010;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1, // tests share the fake servers' state
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: [
    {
      command: "node tests/e2e/mock-server.mjs",
      url: `http://localhost:${MOCK_PORT}/__health`,
      reuseExistingServer: !process.env.CI,
      env: { MOCK_PORT: String(MOCK_PORT) },
    },
    {
      command: `npm run build && npm run start -- -p ${PORT}`,
      url: `http://localhost:${PORT}`,
      timeout: 300_000,
      reuseExistingServer: !process.env.CI,
      env: {
        ANTHROPIC_API_KEY: "test-key",
        ANTHROPIC_BASE_URL: `http://localhost:${MOCK_PORT}`,
        ANTHROPIC_MODEL: "claude-sonnet-5-5",
        MAKE_WEBHOOK_URL: `http://localhost:${MOCK_PORT}/webhook`,
        QUOTE_SIGNING_SECRET: "e2e-secret-e2e-secret-e2e-secret-0123456789",
        NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "",
        NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
        BLOB_READ_WRITE_TOKEN: "",
        ALLOW_LOCAL_PHOTO_STORAGE: "1", // production build, photos in .data/uploads
        UPSTASH_REDIS_REST_URL: "",
        UPSTASH_REDIS_REST_TOKEN: "",
      },
    },
  ],
});
