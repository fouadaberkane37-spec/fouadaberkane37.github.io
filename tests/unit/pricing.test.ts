import { describe, expect, it } from "vitest";
import { PRICING, type PricingConfig } from "@/config/pricing";
import { priceQuote, totalPanes } from "@/lib/pricing";

describe("priceQuote — spec example", () => {
  // 30 panes, 2 storeys, windows + gutters = $525; plan = $750/year = $62.50/month
  const quote = priceQuote({ panes: 30, storeys: 2, walls: 4, services: ["windows", "gutters"] });

  it("one-time price is $525 (windows at $7.50 because gutters are in the same visit)", () => {
    expect(quote.oneTime.totalCents).toBe(52_500);
    expect(quote.oneTime.lines).toEqual([
      { service: "windows", quantity: 30, unitCents: 750, totalCents: 22_500 },
      { service: "gutters", quantity: 2, unitCents: 15_000, totalCents: 30_000 },
    ]);
    expect(quote.oneTime.minimumApplied).toBe(false);
  });

  it("annual plan is $750/year and $62.50/month", () => {
    expect(quote.annualPlan).not.toBeNull();
    expect(quote.annualPlan!.annualCents).toBe(75_000);
    expect(quote.annualPlan!.monthlyCents).toBe(6_250);
    expect(quote.annualPlan!.visits.map((v) => v.totalCents)).toEqual([52_500, 22_500]);
  });
});

describe("priceQuote — windows", () => {
  it("charges $10/pane one-time when gutters are not booked", () => {
    const q = priceQuote({ panes: 30, storeys: 2, walls: 4, services: ["windows"] });
    expect(q.oneTime.totalCents).toBe(30_000);
    expect(q.oneTime.lines[0].unitCents).toBe(1_000);
  });

  it("still charges $10/pane when only house wash is added", () => {
    const q = priceQuote({ panes: 20, storeys: 1, walls: 4, services: ["windows", "houseWash"] });
    expect(q.oneTime.lines).toEqual([
      { service: "windows", quantity: 20, unitCents: 1_000, totalCents: 20_000 },
      { service: "houseWash", quantity: 4, unitCents: 20_000, totalCents: 80_000 },
    ]);
    expect(q.oneTime.totalCents).toBe(100_000);
  });
});

describe("priceQuote — gutters", () => {
  it.each([
    [1, 15_000],
    [2, 30_000],
    [3, 45_000],
  ])("%i storey(s) costs %i cents", (storeys, expected) => {
    const q = priceQuote({ panes: 0, storeys, walls: 4, services: ["gutters"] });
    expect(q.oneTime.totalCents).toBe(expected);
  });

  it("does not offer the annual plan without windows", () => {
    const q = priceQuote({ panes: 0, storeys: 2, walls: 4, services: ["gutters"] });
    expect(q.annualPlan).toBeNull();
  });
});

describe("priceQuote — house wash", () => {
  it("charges $200 per wall", () => {
    const q = priceQuote({ panes: 0, storeys: 2, walls: 4, services: ["houseWash"] });
    expect(q.oneTime.totalCents).toBe(80_000);
    expect(q.annualPlan).toBeNull();
  });
});

describe("priceQuote — $150 minimum per visit", () => {
  it("raises a small one-time visit to $150", () => {
    const q = priceQuote({ panes: 10, storeys: 1, walls: 4, services: ["windows"] });
    expect(q.oneTime.subtotalCents).toBe(10_000);
    expect(q.oneTime.totalCents).toBe(15_000);
    expect(q.oneTime.minimumApplied).toBe(true);
  });

  it("applies the minimum to each plan visit separately", () => {
    // visit 1: 10 × 7.50 + 150 gutters = 225 ; visit 2: 10 × 7.50 = 75 → 150
    const q = priceQuote({ panes: 10, storeys: 1, walls: 4, services: ["windows"] });
    const plan = q.annualPlan!;
    expect(plan.visits[0].totalCents).toBe(22_500);
    expect(plan.visits[1].subtotalCents).toBe(7_500);
    expect(plan.visits[1].totalCents).toBe(15_000);
    expect(plan.visits[1].minimumApplied).toBe(true);
    expect(plan.annualCents).toBe(37_500);
    expect(plan.monthlyCents).toBe(3_125);
  });

  it("does not touch totals already above the minimum", () => {
    const q = priceQuote({ panes: 16, storeys: 1, walls: 4, services: ["windows"] });
    expect(q.oneTime.totalCents).toBe(16_000);
    expect(q.oneTime.minimumApplied).toBe(false);
  });
});

describe("priceQuote — annual plan", () => {
  it("is a fixed package: gutters are included even if only windows were picked", () => {
    const q = priceQuote({ panes: 30, storeys: 2, walls: 4, services: ["windows"] });
    expect(q.annualPlan!.visits[0].lines.map((l) => l.service)).toEqual(["windows", "gutters"]);
    expect(q.annualPlan!.annualCents).toBe(75_000);
  });

  it("keeps house wash as a one-time add-on outside the monthly price", () => {
    const q = priceQuote({ panes: 20, storeys: 2, walls: 4, services: ["windows", "gutters", "houseWash"] });
    const plan = q.annualPlan!;
    expect(plan.annualCents).toBe(60_000); // (150 + 300) + 150
    expect(plan.monthlyCents).toBe(5_000);
    expect(plan.addOns).toEqual([{ service: "houseWash", quantity: 4, unitCents: 20_000, totalCents: 80_000 }]);
    expect(plan.addOnsCents).toBe(80_000);
  });

  it("rounds the monthly price to the nearest cent", () => {
    // visit 1: 7 × 7.50 + 150 = 202.50 ; visit 2: 52.50 → 150 ; annual 352.50 ; /12 = 29.375
    const q = priceQuote({ panes: 7, storeys: 1, walls: 4, services: ["windows"] });
    expect(q.annualPlan!.annualCents).toBe(35_250);
    expect(q.annualPlan!.monthlyCents).toBe(2_938);
  });
});

describe("priceQuote — config drives every number", () => {
  it("uses rates from the config passed in", () => {
    const config: PricingConfig = {
      ...PRICING,
      windows: { perPaneCents: 1_200, discountedPerPaneCents: 900 },
      gutters: { perStoreyCents: 17_500 },
      minimumPerVisitCents: 20_000,
    };
    const q = priceQuote({ panes: 30, storeys: 2, walls: 4, services: ["windows", "gutters"] }, config);
    expect(q.oneTime.totalCents).toBe(30 * 900 + 2 * 17_500);
    const small = priceQuote({ panes: 5, storeys: 1, walls: 4, services: ["windows"] }, config);
    expect(small.oneTime.totalCents).toBe(20_000);
  });
});

describe("priceQuote — input validation", () => {
  it("rejects an empty service list", () => {
    expect(() => priceQuote({ panes: 10, storeys: 1, walls: 4, services: [] })).toThrow(RangeError);
  });

  it.each([
    { panes: -1, storeys: 1, walls: 4 },
    { panes: 1.5, storeys: 1, walls: 4 },
    { panes: 10, storeys: -2, walls: 4 },
    { panes: 10, storeys: 1, walls: Number.NaN },
  ])("rejects invalid measurements %o", (m) => {
    expect(() => priceQuote({ ...m, services: ["windows"] })).toThrow(RangeError);
  });
});

describe("totalPanes", () => {
  it("adds every side plus 2 panes per patio door", () => {
    expect(totalPanes({ front: 10, back: 8, left: 3, right: 4 }, 1)).toBe(27);
    expect(totalPanes({ front: 0, back: 0, left: 0, right: 0 }, 2)).toBe(4);
  });
});
