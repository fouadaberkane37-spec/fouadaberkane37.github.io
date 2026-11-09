# ZF Entretien — soumission instantanée

Instant-quote website for **ZF Entretien** (window, gutter and house-wash services in Saint-Colomban, Saint-Jérôme and the Laurentides up to Rawdon). Customers enter their address, pick services, take 4 photos of their house, and get a price right away, with no site visit.

- Next.js (App Router) + TypeScript + Tailwind CSS v4, deployable on Vercel
- French (Québec) by default at `/`, English at `/en`
- Mobile-first; photos are compressed on the phone (≤ 2000 px JPEG)
- Claude vision counts panes, storeys and walls → strict JSON validated with zod
- Pure, unit-tested pricing engine; all rates in one config file
- Make.com webhook on submit and on acceptance (Make handles the CRM)

## How a quote works

```
1 Address (Google Places autocomplete — typing help only, no map imagery)
2 Services (windows / gutters / house wash)
3 Four guided photos (front, back, left, right) — kept on the phone until consent
4 Contact + Law 25 consent → submit
     POST /api/photos ×4      validate real file type + size, store in Vercel Blob, return signed link
     POST /api/quote          verify links, Claude analysis (1 retry), review rules, pricing,
                              signed quote token, Make webhook "quote.submitted"
5 Result
     confident (≥ 0.8), ≤ 3 storeys, in area → annual plan first (monthly price), one-time second
     otherwise → "Nous confirmons votre prix d'ici 2 heures" (needs_review = true)
     "Accepter" → POST /api/quote/accept (signature checked) → Make webhook "quote.accepted"
```

## Setup

Requirements: Node.js 20.9+ (LTS recommended).

```bash
npm install
cp .env.example .env.local   # then fill in the values you have
npm run dev                  # http://localhost:3000
```

Everything works locally without any key except the AI analysis:

| Missing variable | Local behaviour |
| --- | --- |
| `ANTHROPIC_API_KEY` | Every quote goes to manual review (analysis fails gracefully) |
| `MAKE_WEBHOOK_URL` | Payload is not sent; a warning is logged |
| `BLOB_READ_WRITE_TOKEN` | Photos saved in `./.data/uploads` |
| `UPSTASH_REDIS_*` | Rate limits kept in memory |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Address step is a plain text field |
| `QUOTE_SIGNING_SECRET` | A dev-only secret is used (refused in production) |

To test on your phone on the same Wi-Fi: `npm run dev -- -H 0.0.0.0`, then open `http://<your-computer-ip>:3000`.

## Environment variables

See [.env.example](.env.example). In production you need: `ANTHROPIC_API_KEY`, `MAKE_WEBHOOK_URL`, `QUOTE_SIGNING_SECRET` (≥ 32 chars), `BLOB_READ_WRITE_TOKEN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `NEXT_PUBLIC_SITE_URL`. Optional: `ANTHROPIC_MODEL` (default `claude-sonnet-5-5`).

## Deploy on Vercel

1. Push this folder to a GitHub repository and import it in Vercel (framework: Next.js, no build settings to change).
2. **Storage → Blob**: create a Blob store and connect it to the project (adds `BLOB_READ_WRITE_TOKEN`).
3. **Marketplace → Upstash Redis** (free plan): connect it (adds the `UPSTASH_REDIS_REST_*` variables).
4. Add the other variables from `.env.example` in **Settings → Environment Variables**.
5. **Google Cloud**: enable *Maps JavaScript API* and *Places API (New)*, create a browser key restricted to `zfentretien.ca/*`, `*.zfentretien.ca/*` and your Vercel preview domain.
6. **Make.com**: create a scenario starting with *Webhooks → Custom webhook*, paste its URL in `MAKE_WEBHOOK_URL`, submit one test quote so Make learns the payload structure, then branch on `event`.
7. Deploy, then add the domain `zfentretien.ca` in **Settings → Domains**.

The quote route allows up to 120 s (`maxDuration`) for two AI attempts; this fits Vercel's default limits with Fluid compute.

## Make.com payload

Both events share one shape (snake_case, amounts in dollars, before taxes):

```jsonc
{
  "event": "quote.submitted",            // or "quote.accepted"
  "quote_id": "uuid",
  "timestamp": "2026-11-09T15:00:00.000Z",
  "submitted_at": "2026-11-09T15:00:00.000Z",
  "locale": "fr",
  "contact": { "first_name": "", "last_name": "", "phone": "4505551234", "email": "" },
  "consent": { "accepted": true, "accepted_at": "", "policy_version": "2026-11-09" },
  "address": { "formatted": "", "place_id": "", "lat": 45.7, "lng": -74.1, "distance_km": 3.2 },
  "services": ["windows", "gutters"],
  "photos": { "front": "https://…", "back": "https://…", "left": "https://…", "right": "https://…" },
  "analysis_status": "ok",               // or "failed"
  "analysis": { "panes_per_side": { "front": 12, "back": 10, "left": 4, "right": 2 }, "patio_doors": 1,
                "storeys": 2, "walls": 4, "obstructions": [], "confidence": 0.93, "notes": "" },
  "analysis_error": null,
  "measurements": { "panes": 30, "storeys": 2, "walls": 4 },
  "pricing": { "one_time": { "lines": [], "subtotal": 525, "minimum_applied": false, "total": 525 },
               "annual_plan": { "visits": [], "annual_total": 750, "monthly": 62.5, "add_ons": [], "add_ons_total": 0 } },
  "price_summary": { "currency": "CAD", "taxes_included": false, "one_time_total": 525,
                     "annual_plan_total": 750, "annual_plan_monthly": 62.5,
                     "annual_plan_add_ons_total": 0, "chosen_total": null },
  "chosen_option": null,                 // "annual_plan" | "one_time" on acceptance
  "needs_review": false,
  "review_reasons": []                   // analysis_failed | low_confidence | too_many_storeys | no_panes_detected | outside_service_area
}
```

When `needs_review` is true the customer saw no price, but `pricing` still holds a draft (when the analysis succeeded) so you can start from it. If Make cannot be reached after 3 tries, the full payload is written to the Vercel logs (`[webhook] FAILED`) so the lead can be recovered.

## Changing prices and rules

- **Prices**: [config/pricing.ts](config/pricing.ts): per-pane rates, gutters per storey, house wash per wall, minimum per visit, panes per patio door, and what the annual plan contains.
- **Business info, review thresholds, AI effort, rate limits**: [config/business.ts](config/business.ts).
- **AI counting instructions**: [lib/ai/prompt.ts](lib/ai/prompt.ts).
- **Texts**: [messages/fr.json](messages/fr.json) and [messages/en.json](messages/en.json).

Pricing rules (in cents, before taxes):

- Windows: $10/pane, or $7.50/pane when gutters are done in the same visit.
- Gutters: $150 × storeys. House wash: $200 × walls. Minimum $150 per visit.
- Annual plan (offered when windows are selected): visit 1 = windows + gutters, visit 2 = windows, both at $7.50/pane, each with the $150 minimum. Annual total and monthly price (annual ÷ 12, rounded to the cent). House wash stays a one-time add-on.
- Example: 30 panes, 2 storeys, windows + gutters = **$525** one-time; plan **$750/year = $62.50/month**.

## Tests

```bash
npm run typecheck
npm test                       # unit tests (pricing, review rules, AI retry, signatures, webhook, validation)
npx playwright install chromium
npm run test:e2e               # full flow on a mobile viewport, with a fake Claude API and a fake Make webhook
```

The end-to-end tests build the app and start it with `ANTHROPIC_BASE_URL` pointing to `tests/e2e/mock-server.mjs`. The fake API can answer confidently, with low confidence, or with invalid output, so the instant-price, manual-review and retry-then-fallback paths are all covered, along with the exact webhook payloads.

## Security and privacy

- No secrets in code; all keys come from environment variables.
- Per-IP rate limits on every API route (Upstash in production).
- Uploaded photos: real file type checked from the first bytes (JPEG/PNG/WebP), max 4 MB.
- Photo links and quotes are HMAC-signed: the server only analyzes photos it stored itself, and "Accepter" cannot be sent with a modified price.
- Text inside photos is treated as part of the scene, never as instructions to the AI.
- Photos stay on the customer's phone until they check the consent box and submit.

### Law 25 checklist before launch (not legal advice)

- [ ] Fill in the person in charge of personal information in `config/business.ts` (name, title, email); it is published in the privacy policy.
- [ ] Confirm the photo retention period (`photoRetentionMonths`) and actually delete old photos (Vercel Blob dashboard or a scheduled job).
- [ ] Do the privacy impact assessment (EFVP) required before sending personal information outside Québec (Vercel, Anthropic, Make, Google, Upstash).
- [ ] Have the privacy policy text reviewed; bump `privacyPolicyVersion` whenever it changes.
- [ ] The price is decided by automated processing: the policy and result page tell customers so and give them a way to have a person review it. Keep that phone number answered.

## Before launch (TODO)

- Real phone number, emails and privacy officer in `config/business.ts`.
- Replace the logo placeholder in `components/Logo.tsx`.
- Review the marketing copy in `messages/*.json` (service descriptions, "we call you to set the date").
- Run a handful of real houses through the AI and adjust `lib/ai/prompt.ts` and `REVIEW_RULES.minConfidence` if needed.
- The service-area check is a 75 km radius around Saint-Colomban: it catches far-away addresses only (Montréal is about as close as Rawdon).
