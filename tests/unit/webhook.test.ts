import { describe, expect, it, vi } from "vitest";
import { buildQuoteRecord } from "@/lib/quote";
import { QuoteRequestSchema } from "@/lib/schemas";
import { buildWebhookPayload, sendWebhook } from "@/lib/webhook";

const photo = (side: string) => ({ url: `https://store/${side}.jpg`, sig: "s" });
const request = QuoteRequestSchema.parse({
  quoteId: "8f1c7a1e-6a8e-4c43-9a7e-2f6f0f3f1b11",
  locale: "fr",
  address: { formatted: "123 rue Principale, Saint-Colomban, QC", placeId: null, lat: null, lng: null },
  services: ["windows", "gutters"],
  photos: { front: photo("front"), back: photo("back"), left: photo("left"), right: photo("right") },
  contact: { firstName: "Marie", lastName: "Tremblay", phone: "450-555-1234", email: "marie@exemple.ca" },
  consent: true,
});
const analysis = {
  panes_per_side: { front: 12, back: 10, left: 4, right: 4 },
  patio_doors: 0,
  storeys: 2,
  walls: 4,
  obstructions: [],
  confidence: 0.9,
  notes: "",
};
const now = new Date("2026-11-09T15:00:00Z");
const record = buildQuoteRecord(request, { status: "ok", analysis, attempts: 1 }, now);

describe("buildWebhookPayload", () => {
  it("carries contact, address, photos, analysis, prices in dollars and the review flag", () => {
    const p = buildWebhookPayload("quote.submitted", record, null, now);
    expect(p).toMatchObject({
      event: "quote.submitted",
      quote_id: request.quoteId,
      timestamp: "2026-11-09T15:00:00.000Z",
      contact: { first_name: "Marie", last_name: "Tremblay", phone: "4505551234", email: "marie@exemple.ca" },
      address: { formatted: "123 rue Principale, Saint-Colomban, QC", distance_km: null },
      photos: { front: "https://store/front.jpg", back: "https://store/back.jpg" },
      analysis_status: "ok",
      measurements: { panes: 30, storeys: 2, walls: 4 },
      price_summary: { one_time_total: 525, annual_plan_total: 750, annual_plan_monthly: 62.5, chosen_total: null },
      chosen_option: null,
      needs_review: false,
      review_reasons: [],
    });
    expect(p.pricing!.one_time.lines[0]).toEqual({ service: "windows", quantity: 30, unit_price: 7.5, total: 225 });
  });

  it("records the chosen option and its total on acceptance", () => {
    expect(buildWebhookPayload("quote.accepted", record, "annual_plan", now).price_summary.chosen_total).toBe(750);
    expect(buildWebhookPayload("quote.accepted", record, "one_time", now).price_summary.chosen_total).toBe(525);
  });
});

describe("sendWebhook", () => {
  const payload = buildWebhookPayload("quote.submitted", record, null, now);

  it("posts JSON once when Make answers 200", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("Accepted", { status: 200 }));
    const result = await sendWebhook(payload, { url: "https://hook.make.com/x", fetchImpl });
    expect(result).toEqual({ ok: true, attempts: 1 });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://hook.make.com/x");
    expect(JSON.parse(init.body).quote_id).toBe(request.quoteId);
  });

  it("retries server errors and network failures", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 502 }))
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(new Response("", { status: 200 }));
    const result = await sendWebhook(payload, { url: "https://hook", fetchImpl, backoffMs: 1 });
    expect(result).toEqual({ ok: true, attempts: 3 });
  });

  it("gives up after 3 tries and logs the payload", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status: 500 }));
    const result = await sendWebhook(payload, { url: "https://hook", fetchImpl, backoffMs: 1 });
    expect(result).toMatchObject({ ok: false, attempts: 3 });
    expect(error.mock.calls.flat().join(" ")).toContain(request.quoteId);
    error.mockRestore();
  });

  it("does not retry a 4xx (bad URL or payload)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchImpl = vi.fn().mockResolvedValue(new Response("", { status: 404 }));
    await sendWebhook(payload, { url: "https://hook", fetchImpl, backoffMs: 1 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("skips quietly when no URL is configured", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await sendWebhook(payload, { url: null })).toMatchObject({ ok: false, skipped: true });
  });
});
