import type { LineItem, PriceQuote, VisitPrice } from "@/lib/pricing";
import type { QuoteRecord } from "@/lib/quote";
import type { AcceptOption } from "@/lib/schemas";

/**
 * Payload sent to the Make.com webhook. snake_case and dollar amounts so it maps
 * cleanly onto CRM fields in Make. Make owns everything after this point.
 */

export type WebhookEvent = "quote.submitted" | "quote.accepted";

const dollars = (cents: number) => Math.round(cents) / 100;

const line = (l: LineItem) => ({
  service: l.service,
  quantity: l.quantity,
  unit_price: dollars(l.unitCents),
  total: dollars(l.totalCents),
});

const visit = (v: VisitPrice) => ({
  lines: v.lines.map(line),
  subtotal: dollars(v.subtotalCents),
  minimum_applied: v.minimumApplied,
  total: dollars(v.totalCents),
});

function pricingPayload(p: PriceQuote) {
  return {
    one_time: visit(p.oneTime),
    annual_plan: p.annualPlan
      ? {
          visits: p.annualPlan.visits.map(visit),
          annual_total: dollars(p.annualPlan.annualCents),
          monthly: dollars(p.annualPlan.monthlyCents),
          add_ons: p.annualPlan.addOns.map(line),
          add_ons_total: dollars(p.annualPlan.addOnsCents),
        }
      : null,
  };
}

export function buildWebhookPayload(
  event: WebhookEvent,
  record: QuoteRecord,
  chosenOption: AcceptOption | null,
  now: Date,
) {
  const p = record.pricing;
  const chosenTotal =
    !p || !chosenOption
      ? null
      : chosenOption === "one_time"
        ? dollars(p.oneTime.totalCents)
        : p.annualPlan
          ? dollars(p.annualPlan.annualCents)
          : null;

  return {
    event,
    quote_id: record.quoteId,
    timestamp: now.toISOString(),
    submitted_at: record.submittedAt,
    locale: record.locale,
    contact: {
      first_name: record.contact.firstName,
      last_name: record.contact.lastName,
      phone: record.contact.phone,
      email: record.contact.email,
    },
    consent: {
      accepted: true,
      accepted_at: record.consent.acceptedAt,
      policy_version: record.consent.policyVersion,
    },
    address: {
      formatted: record.address.formatted,
      place_id: record.address.placeId,
      lat: record.address.lat,
      lng: record.address.lng,
      distance_km: record.address.distanceKm,
    },
    services: record.services,
    photos: record.photos,
    analysis_status: record.analysisStatus,
    analysis: record.analysis,
    analysis_error: record.analysisError,
    measurements: record.measurements,
    pricing: p ? pricingPayload(p) : null,
    price_summary: {
      currency: "CAD",
      taxes_included: false,
      one_time_total: p ? dollars(p.oneTime.totalCents) : null,
      annual_plan_total: p?.annualPlan ? dollars(p.annualPlan.annualCents) : null,
      annual_plan_monthly: p?.annualPlan ? dollars(p.annualPlan.monthlyCents) : null,
      annual_plan_add_ons_total: p?.annualPlan ? dollars(p.annualPlan.addOnsCents) : null,
      chosen_total: chosenTotal,
    },
    chosen_option: chosenOption,
    needs_review: record.needsReview,
    review_reasons: record.reviewReasons,
  };
}
export type WebhookPayload = ReturnType<typeof buildWebhookPayload>;

interface SendOptions {
  url: string | null;
  fetchImpl?: typeof fetch;
  attempts?: number;
  timeoutMs?: number;
  backoffMs?: number;
}

export type SendResult = { ok: true; attempts: number } | { ok: false; attempts: number; skipped?: boolean; error: string };

/** POSTs to Make with retries. Never throws. On final failure the payload is logged so the lead can be recovered. */
export async function sendWebhook(payload: WebhookPayload, opts: SendOptions): Promise<SendResult> {
  const { url, fetchImpl = fetch, attempts = 3, timeoutMs = 8_000, backoffMs = 500 } = opts;
  if (!url) {
    console.warn(`[webhook] MAKE_WEBHOOK_URL not set — ${payload.event} for ${payload.quote_id} not sent`);
    return { ok: false, attempts: 0, skipped: true, error: "not_configured" };
  }

  let error = "";
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return { ok: true, attempts: attempt };
      error = `HTTP ${res.status}`;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) break; // not worth retrying
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
    if (attempt < attempts) await new Promise((r) => setTimeout(r, backoffMs * 3 ** (attempt - 1)));
  }

  console.error(`[webhook] FAILED ${payload.event} ${payload.quote_id}: ${error}. Payload follows.`);
  console.error(JSON.stringify(payload));
  return { ok: false, attempts, error };
}
