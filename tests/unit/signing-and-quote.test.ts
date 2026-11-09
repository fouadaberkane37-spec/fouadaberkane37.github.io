import { describe, expect, it } from "vitest";
import { buildQuoteRecord, toPublicQuote } from "@/lib/quote";
import { ContactSchema, normalizePhone, QuoteRequestSchema, type QuoteRequest } from "@/lib/schemas";
import { decodeToken, encodeToken, signPhoto, verifyPhoto } from "@/lib/signing";

const SECRET = "test-secret-test-secret-test-secret-123";

describe("photo signatures", () => {
  it("accepts the URL it signed and rejects any change", () => {
    const sig = signPhoto(SECRET, "q1", "front", "https://x/a.jpg");
    expect(verifyPhoto(SECRET, "q1", "front", "https://x/a.jpg", sig)).toBe(true);
    expect(verifyPhoto(SECRET, "q1", "back", "https://x/a.jpg", sig)).toBe(false);
    expect(verifyPhoto(SECRET, "q2", "front", "https://x/a.jpg", sig)).toBe(false);
    expect(verifyPhoto(SECRET, "q1", "front", "https://evil/a.jpg", sig)).toBe(false);
    expect(verifyPhoto("another-secret-another-secret-12345", "q1", "front", "https://x/a.jpg", sig)).toBe(false);
  });
});

describe("quote tokens", () => {
  const now = Date.UTC(2026, 10, 9);

  it("round-trips data", () => {
    const token = encodeToken(SECRET, { price: 52_500 }, 3600, now);
    expect(decodeToken(SECRET, token, now)).toEqual({ ok: true, data: { price: 52_500 } });
  });

  it("rejects a token whose content was edited", () => {
    const token = encodeToken(SECRET, { price: 52_500 }, 3600, now);
    const [, sig] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ exp: 9e9, data: { price: 1 } })).toString("base64url")}.${sig}`;
    expect(decodeToken(SECRET, forged, now)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects expired and malformed tokens", () => {
    const token = encodeToken(SECRET, {}, 60, now);
    expect(decodeToken(SECRET, token, now + 61_000)).toEqual({ ok: false, reason: "expired" });
    expect(decodeToken(SECRET, "nope", now)).toEqual({ ok: false, reason: "malformed" });
  });

  it("does not accept a photo signature as a quote token", () => {
    const body = Buffer.from(JSON.stringify({ exp: 9e9, data: {} })).toString("base64url");
    const photoSig = signPhoto(SECRET, "q", "s", body);
    expect(decodeToken(SECRET, `${body}.${photoSig}`, now).ok).toBe(false);
  });
});

describe("contact validation", () => {
  it.each([
    ["450-555-1234", "4505551234"],
    ["(450) 555 1234", "4505551234"],
    ["+1 450 555-1234", "4505551234"],
  ])("normalizes %s", (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected);
  });

  it.each(["555-1234", "123-456-7890", "abc"])("rejects %s", (raw) => {
    expect(normalizePhone(raw)).toBeNull();
  });

  it("lower-cases emails and rejects bad ones", () => {
    const ok = ContactSchema.parse({ firstName: "Marie", lastName: "Tremblay", phone: "450 555 1234", email: " Marie@Exemple.CA " });
    expect(ok.email).toBe("marie@exemple.ca");
    expect(ok.phone).toBe("4505551234");
    expect(ContactSchema.safeParse({ ...ok, email: "pas-un-courriel" }).success).toBe(false);
  });
});

const photo = (side: string) => ({ url: `https://store/quotes/q/${side}.jpg`, sig: "s" });
const request: QuoteRequest = QuoteRequestSchema.parse({
  quoteId: "8f1c7a1e-6a8e-4c43-9a7e-2f6f0f3f1b11",
  locale: "fr",
  address: { formatted: "123 rue Principale, Saint-Colomban, QC", placeId: "abc", lat: 45.73, lng: -74.13 },
  services: ["windows", "gutters"],
  photos: { front: photo("front"), back: photo("back"), left: photo("left"), right: photo("right") },
  contact: { firstName: "Marie", lastName: "Tremblay", phone: "450-555-1234", email: "marie@exemple.ca" },
  consent: true,
});

describe("QuoteRequestSchema", () => {
  it("requires consent", () => {
    expect(QuoteRequestSchema.safeParse({ ...request, consent: false }).success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    expect(QuoteRequestSchema.safeParse({ ...request, website: "spam.com" }).success).toBe(false);
  });
});

describe("buildQuoteRecord", () => {
  const now = new Date("2026-11-09T15:00:00Z");
  const analysis = {
    panes_per_side: { front: 10, back: 8, left: 4, right: 4 },
    patio_doors: 2,
    storeys: 2,
    walls: 4,
    obstructions: [],
    confidence: 0.92,
    notes: "",
  };

  it("prices a confident analysis and exposes the price", () => {
    const record = buildQuoteRecord(request, { status: "ok", analysis, attempts: 1 }, now);
    expect(record.measurements).toEqual({ panes: 30, storeys: 2, walls: 4 });
    expect(record.pricing!.oneTime.totalCents).toBe(52_500);
    expect(record.needsReview).toBe(false);
    expect(record.address.distanceKm).toBeLessThan(5);
    expect(record.photos.front).toBe("https://store/quotes/q/front.jpg");
    expect(record.consent).toEqual({ acceptedAt: "2026-11-09T15:00:00.000Z", policyVersion: expect.any(String) });
    expect(toPublicQuote(record).status).toBe("priced");
  });

  it("hides the price from the customer when review is needed, but keeps a draft for the owner", () => {
    const record = buildQuoteRecord(request, { status: "ok", analysis: { ...analysis, confidence: 0.6 }, attempts: 1 }, now);
    expect(record.needsReview).toBe(true);
    expect(record.pricing).not.toBeNull();
    expect(toPublicQuote(record)).toEqual({ status: "manual_review", quoteId: request.quoteId });
  });

  it("goes to manual review with no price when analysis failed", () => {
    const record = buildQuoteRecord(request, { status: "failed", error: "boom", attempts: 2 }, now);
    expect(record).toMatchObject({ analysisStatus: "failed", analysisError: "boom", pricing: null, needsReview: true });
    expect(record.reviewReasons).toEqual(["analysis_failed"]);
  });
});
