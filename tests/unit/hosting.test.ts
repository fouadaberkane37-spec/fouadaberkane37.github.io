import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { blobToken } = await import("@/lib/env");
const { clientIp } = await import("@/lib/rate-limit");

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("photo storage on the server (the server's disk is not kept)", () => {
  it("uses the Blob token when it is set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", " vercel_blob_rw_test ");
    expect(blobToken()).toBe("vercel_blob_rw_test");
  });

  it("refuses to keep photos on local disk in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    expect(() => blobToken()).toThrow(/BLOB_READ_WRITE_TOKEN/);
  });

  it("allows local disk in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    expect(blobToken()).toBeNull();
  });

  it("allows local disk for a production build only when explicitly asked (end-to-end tests)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.stubEnv("ALLOW_LOCAL_PHOTO_STORAGE", "1");
    expect(blobToken()).toBeNull();
  });
});

describe("client IP for rate limiting", () => {
  const req = (headers: Record<string, string>) => new Request("http://localhost/api/quote", { headers });

  it("prefers the single IP set by the hosting proxy", () => {
    expect(clientIp(req({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "1.2.3.4, 203.0.113.7" }))).toBe(
      "203.0.113.7",
    );
  });

  it("falls back to the first x-forwarded-for entry", () => {
    expect(clientIp(req({ "x-forwarded-for": "198.51.100.2, 10.0.0.1" }))).toBe("198.51.100.2");
  });

  it("returns 'unknown' without proxy headers", () => {
    expect(clientIp(req({}))).toBe("unknown");
  });
});
