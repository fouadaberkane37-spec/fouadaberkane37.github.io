import { BUSINESS, REVIEW_RULES } from "@/config/business";
import type { ServiceId } from "@/config/pricing";
import { totalPanes } from "@/lib/pricing";
import type { Analysis } from "@/lib/schemas";

export type ReviewReason =
  | "analysis_failed"
  | "low_confidence"
  | "too_many_storeys"
  | "no_panes_detected"
  | "outside_service_area";

interface ReviewInput {
  analysis: Analysis | null;
  services: ServiceId[];
  distanceKm: number | null;
}

/** Empty array = the price can be shown instantly. */
export function getReviewReasons(
  { analysis, services, distanceKm }: ReviewInput,
  rules = REVIEW_RULES,
  radiusKm = BUSINESS.serviceArea.radiusKm,
): ReviewReason[] {
  const reasons: ReviewReason[] = [];
  if (!analysis) {
    reasons.push("analysis_failed");
  } else {
    if (analysis.confidence < rules.minConfidence) reasons.push("low_confidence");
    if (analysis.storeys >= rules.manualReviewFromStoreys) reasons.push("too_many_storeys");
    if (services.includes("windows") && totalPanes(analysis.panes_per_side, analysis.patio_doors) === 0) {
      reasons.push("no_panes_detected");
    }
  }
  if (distanceKm !== null && distanceKm > radiusKm) reasons.push("outside_service_area");
  return reasons;
}

/** Great-circle distance in km (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
