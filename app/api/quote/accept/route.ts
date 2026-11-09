import { makeWebhookUrl, signingSecret } from "@/lib/env";
import type { QuoteRecord } from "@/lib/quote";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { AcceptRequestSchema } from "@/lib/schemas";
import { decodeToken } from "@/lib/signing";
import { buildWebhookPayload, sendWebhook } from "@/lib/webhook";

export const runtime = "nodejs";

/** The customer clicked "Accepter". The signed token guarantees the price was not altered in the browser. */
export async function POST(req: Request) {
  const limit = await rateLimit("accept", req);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = AcceptRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });

  const decoded = decodeToken<QuoteRecord>(signingSecret(), parsed.data.token);
  if (!decoded.ok) {
    return Response.json({ error: decoded.reason }, { status: decoded.reason === "expired" ? 410 : 400 });
  }
  const record = decoded.data;
  const { option } = parsed.data;
  if (record.needsReview || !record.pricing || (option === "annual_plan" && !record.pricing.annualPlan)) {
    return Response.json({ error: "option_unavailable" }, { status: 409 });
  }

  const result = await sendWebhook(buildWebhookPayload("quote.accepted", record, option, new Date()), {
    url: makeWebhookUrl(),
  });
  if (!result.ok && !result.skipped) {
    return Response.json({ error: "delivery_failed" }, { status: 502 });
  }
  console.info(`[accept] ${record.quoteId} option=${option}`);
  return Response.json({ ok: true });
}
