import { describe, expect, it } from "vitest";
import { distanceKm, getReviewReasons } from "@/lib/review";
import type { Analysis } from "@/lib/schemas";

const analysis: Analysis = {
  panes_per_side: { front: 10, back: 8, left: 3, right: 4 },
  patio_doors: 1,
  storeys: 2,
  walls: 4,
  obstructions: [],
  confidence: 0.9,
  notes: "",
};

describe("getReviewReasons", () => {
  it("allows an instant price for a clear, nearby, 2-storey house", () => {
    expect(getReviewReasons({ analysis, services: ["windows"], distanceKm: 10 })).toEqual([]);
  });

  it("flags a failed analysis", () => {
    expect(getReviewReasons({ analysis: null, services: ["windows"], distanceKm: null })).toEqual(["analysis_failed"]);
  });

  it("flags confidence below 0.8 but not exactly 0.8", () => {
    expect(getReviewReasons({ analysis: { ...analysis, confidence: 0.79 }, services: ["windows"], distanceKm: null })).toEqual([
      "low_confidence",
    ]);
    expect(getReviewReasons({ analysis: { ...analysis, confidence: 0.8 }, services: ["windows"], distanceKm: null })).toEqual([]);
  });

  it("flags 4 storeys or more", () => {
    expect(getReviewReasons({ analysis: { ...analysis, storeys: 3 }, services: ["gutters"], distanceKm: null })).toEqual([]);
    expect(getReviewReasons({ analysis: { ...analysis, storeys: 4 }, services: ["gutters"], distanceKm: null })).toEqual([
      "too_many_storeys",
    ]);
  });

  it("flags zero panes only when windows were requested", () => {
    const none = { ...analysis, panes_per_side: { front: 0, back: 0, left: 0, right: 0 }, patio_doors: 0 };
    expect(getReviewReasons({ analysis: none, services: ["windows"], distanceKm: null })).toEqual(["no_panes_detected"]);
    expect(getReviewReasons({ analysis: none, services: ["houseWash"], distanceKm: null })).toEqual([]);
  });

  it("flags addresses beyond the service radius", () => {
    expect(getReviewReasons({ analysis, services: ["windows"], distanceKm: 120 })).toEqual(["outside_service_area"]);
  });

  it("can report several reasons at once", () => {
    expect(
      getReviewReasons({ analysis: { ...analysis, confidence: 0.5, storeys: 5 }, services: ["windows"], distanceKm: 200 }),
    ).toEqual(["low_confidence", "too_many_storeys", "outside_service_area"]);
  });
});

describe("distanceKm", () => {
  it("measures Saint-Colomban → Rawdon at roughly 47 km", () => {
    const d = distanceKm({ lat: 45.7303, lng: -74.1338 }, { lat: 46.0446, lng: -73.7166 });
    expect(d).toBeGreaterThan(40);
    expect(d).toBeLessThan(55);
  });

  it("is zero for the same point", () => {
    expect(distanceKm({ lat: 45.7, lng: -74.1 }, { lat: 45.7, lng: -74.1 })).toBe(0);
  });
});
