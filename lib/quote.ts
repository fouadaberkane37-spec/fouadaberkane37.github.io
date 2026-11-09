import { BUSINESS } from "@/config/business";
import type { ServiceId } from "@/config/pricing";
import { priceQuote, totalPanes, type Measurements, type PriceQuote } from "@/lib/pricing";
import { distanceKm, getReviewReasons, type ReviewReason } from "@/lib/review";
import type { Address, Analysis, Contact, QuoteRequest, Side } from "@/lib/schemas";

export type AnalysisOutcome =
  | { status: "ok"; analysis: Analysis; attempts: number }
  | { status: "failed"; error: string; attempts: number };

/** Everything we know about one quote. Signed and handed to the browser; sent to Make. */
export interface QuoteRecord {
  quoteId: string;
  submittedAt: string;
  locale: "fr" | "en";
  address: Address & { distanceKm: number | null };
  services: ServiceId[];
  photos: Record<Side, string>;
  contact: Contact;
  consent: { acceptedAt: string; policyVersion: string };
  analysisStatus: "ok" | "failed";
  analysis: Analysis | null;
  analysisError: string | null;
  measurements: Measurements | null;
  pricing: PriceQuote | null;
  needsReview: boolean;
  reviewReasons: ReviewReason[];
}

export function buildQuoteRecord(req: QuoteRequest, outcome: AnalysisOutcome, now: Date): QuoteRecord {
  const { address } = req;
  const distance =
    address.lat !== null && address.lng !== null
      ? Math.round(distanceKm(BUSINESS.serviceArea.center, { lat: address.lat, lng: address.lng }) * 10) / 10
      : null;

  const analysis = outcome.status === "ok" ? outcome.analysis : null;
  const measurements: Measurements | null = analysis
    ? {
        panes: totalPanes(analysis.panes_per_side, analysis.patio_doors),
        storeys: analysis.storeys,
        walls: analysis.walls,
      }
    : null;
  const reviewReasons = getReviewReasons({ analysis, services: req.services, distanceKm: distance });

  return {
    quoteId: req.quoteId,
    submittedAt: now.toISOString(),
    locale: req.locale,
    address: { ...address, distanceKm: distance },
    services: req.services,
    photos: {
      front: req.photos.front.url,
      back: req.photos.back.url,
      left: req.photos.left.url,
      right: req.photos.right.url,
    },
    contact: req.contact,
    consent: { acceptedAt: now.toISOString(), policyVersion: BUSINESS.privacyPolicyVersion },
    analysisStatus: outcome.status,
    analysis,
    analysisError: outcome.status === "failed" ? outcome.error : null,
    measurements,
    // Priced even when a human must confirm, so the owner starts from a draft.
    pricing: measurements ? priceQuote({ ...measurements, services: req.services }) : null,
    needsReview: reviewReasons.length > 0,
    reviewReasons,
  };
}

/** What the browser shows. Manual-review quotes expose no price. */
export type PublicQuote =
  | {
      status: "priced";
      quoteId: string;
      services: ServiceId[];
      analysis: Pick<Analysis, "panes_per_side" | "patio_doors" | "storeys" | "walls">;
      measurements: Measurements;
      pricing: PriceQuote;
    }
  | { status: "manual_review"; quoteId: string };

export function toPublicQuote(record: QuoteRecord): PublicQuote {
  if (record.needsReview || !record.analysis || !record.measurements || !record.pricing) {
    return { status: "manual_review", quoteId: record.quoteId };
  }
  const { panes_per_side, patio_doors, storeys, walls } = record.analysis;
  return {
    status: "priced",
    quoteId: record.quoteId,
    services: record.services,
    analysis: { panes_per_side, patio_doors, storeys, walls },
    measurements: record.measurements,
    pricing: record.pricing,
  };
}
