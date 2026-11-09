import { analyzeHouse, type PhotoInput } from "@/lib/ai/analyze";
import { callClaude } from "@/lib/ai/claude";
import { makeWebhookUrl, signingSecret } from "@/lib/env";
import { sniffImageType } from "@/lib/image/validate";
import { buildQuoteRecord, toPublicQuote, type AnalysisOutcome } from "@/lib/quote";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { QuoteRequestSchema, SIDES, type QuoteRequest } from "@/lib/schemas";
import { encodeToken, verifyPhoto } from "@/lib/signing";
import { readPhoto } from "@/lib/storage";
import { buildWebhookPayload, sendWebhook } from "@/lib/webhook";

export const runtime = "nodejs";
export const maxDuration = 120; // two AI attempts of up to 50 s each

const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // a priced quote can be accepted for 30 days

export async function POST(req: Request) {
  const limit = await rateLimit("quote", req);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = QuoteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_request", fields: parsed.error.issues.map((i) => i.path.join(".")) },
      { status: 400 },
    );
  }
  const request = parsed.data;

  const secret = signingSecret();
  const forged = SIDES.some((side) => {
    const { url, sig } = request.photos[side];
    return !verifyPhoto(secret, request.quoteId, side, url, sig);
  });
  if (forged) return Response.json({ error: "invalid_photo" }, { status: 400 });

  const outcome = await analyze(request);
  const now = new Date();
  const record = buildQuoteRecord(request, outcome, now);
  console.info(
    `[quote] ${record.quoteId} analysis=${outcome.status} attempts=${outcome.attempts} review=${record.reviewReasons.join(",") || "no"}`,
  );

  // A lost webhook is a lost lead, so we wait for it; a failure is logged with the full payload.
  await sendWebhook(buildWebhookPayload("quote.submitted", record, null, now), { url: makeWebhookUrl() });

  const quote = toPublicQuote(record);
  const token = quote.status === "priced" ? encodeToken(secret, record, TOKEN_TTL_SECONDS) : null;
  return Response.json({ quote, token });
}

async function analyze(request: QuoteRequest): Promise<AnalysisOutcome> {
  let photos: PhotoInput[];
  try {
    photos = await Promise.all(
      SIDES.map(async (side) => {
        const data = await readPhoto(request.photos[side].url);
        const mediaType = sniffImageType(data);
        if (!mediaType) throw new Error(`unsupported image for ${side}`);
        return { side, data, mediaType };
      }),
    );
  } catch (err) {
    console.error("[quote] could not read photos", err);
    return { status: "failed", error: "photo_read_failed", attempts: 0 };
  }
  return analyzeHouse(photos, callClaude);
}
