# HANDOFF — ZF Entretien instant-quote site

Read this first. It is the project guideline for whoever (human or Claude) continues this work.

## Status

All source code is written but **has never been installed, compiled or run**: the machine it was written on had no Node.js. Nothing below is verified until you run it. Expect a few type errors to fix, mostly where third-party APIs (listed under "Verify first") may differ from what the code assumes.

## The product (spec, already agreed with the owner)

ZF Entretien cleans windows, gutters and houses in Saint-Colomban, Saint-Jérôme and the Laurentides up to Rawdon, Québec (zfentretien.ca). Customers get a price from 4 photos of their house, with no site visit.

- Stack: Next.js App Router + TypeScript + Tailwind v4, deploy on Vercel. French (Québec) first at `/`, English at `/en`. Mobile-first.
- Flow: 1 address (Google Places autocomplete for typing only; **never fetch or analyze Maps/Satellite/Street View imagery**: Google's terms forbid it) → 2 services (windows/gutters/house wash) → 3 four guided photos (front, back, left, right; `<input accept="image/*" capture="environment">`, compressed in the browser to ≤ 2000 px) → 4 contact + Law 25 consent checkbox linking to the privacy policy → 5 result.
- AI: photos stored in Vercel Blob, all 4 sent to the Anthropic API (model from `ANTHROPIC_MODEL`, default `claude-sonnet-5-5`), strict JSON validated with zod: `{ panes_per_side: {front, back, left, right}, patio_doors, storeys, walls, obstructions: string[], confidence: 0–1, notes }`. Every piece of glass = 1 pane; a patio door = 2 panes. Invalid output → retry once → manual review.
- Pricing (pure function, unit tested, all rates in `config/pricing.ts`): windows $10/pane, or $7.50 with the annual plan or gutters in the same visit; gutters $150 × storeys; house wash $200 × walls; $150 minimum per visit; annual plan = windows twice a year at $7.50 + gutters once a year, shown as annual total and monthly (÷ 12). Check: 30 panes, 2 storeys, windows + gutters = $525; plan $750/year = $62.50/month.
- Result: confidence ≥ 0.8 → instant price, **annual plan first** (monthly price, "best value"), one-time second, an "Accepter" button on each, plus a breakdown (panes, storeys, services) so the customer can spot errors. Confidence < 0.8, ≥ 4 storeys, or analysis failed → "Nous confirmons votre prix d'ici 2 heures" and a manual-review flag.
- Integration: POST a JSON payload to the Make.com webhook (`MAKE_WEBHOOK_URL`) on submit and on acceptance. **No direct CRM integration**; Make handles it.
- Quality: `.env.example`, no secrets in code, rate limiting, file type/size validation, unit tests for pricing, a Playwright test of the full flow with mocked AI, a white/deep-blue trustworthy design with large tap targets, a logo placeholder, and a README.

## Decisions made (do not undo without asking the owner)

1. **Photos stay on the phone (IndexedDB) until consent.** They upload only after the Law 25 box is checked, one request per photo (Vercel rejects bodies over 4.5 MB).
2. **No database.** `/api/photos` returns an HMAC-signed photo link; `/api/quote` analyzes only signed links and returns the whole quote as an HMAC-signed token; `/api/quote/accept` verifies the token, so prices can't be edited in the browser. Secret: `QUOTE_SIGNING_SECRET`.
3. Patio doors are **not** in `panes_per_side`; total panes = sides + 2 × patio_doors.
4. Extra manual-review triggers: windows selected but 0 panes counted; address more than 75 km from Saint-Colomban.
5. Annual plan = a fixed package (windows ×2 + gutters ×1), offered whenever windows are selected; house wash stays a one-time add-on. The $150 minimum applies to each plan visit.
6. Prices are shown before taxes ("TPS et TVQ en sus").
7. Manual-review quotes still carry a draft price to Make; the customer sees none.
8. Rate limiting: Upstash Redis in production, in-memory fallback in dev.
9. i18n: next-intl, `localeDetection: false` (everyone lands in French), localized paths `/soumission` ↔ `/en/quote`, `/confidentialite` ↔ `/en/privacy`.
10. Design: one typeface (Schibsted Grotesk), white + deep blue `#0b3b8f` + pale "glass" `#eaf2fb`. The single bold motif is the four-pane window: the hero and the photo step show the 4 photos as the 4 panes of a window.
11. The AI call enables the API's server-side refusal fallback (`fallbacks: "default"`) for models that support it.

## Verify first (most likely to need fixes)

1. `npm install`. `@anthropic-ai/sdk` is set to `"latest"` in package.json; after install, pin it (`npm install @anthropic-ai/sdk@<installed version>`).
2. **`lib/ai/claude.ts`** against the installed SDK:
   - `client.beta.messages.parse(...)` exists and accepts `output_config: { format: zodOutputFormat(schema), effort }`, `betas: ["server-side-fallback-2026-07-01"]` and `fallbacks: "default"`.
   - `zodOutputFormat` (from `@anthropic-ai/sdk/helpers/zod`) works with **zod v4** and with the schema's `.int().min().max()` constraints. If the API rejects those constraints, pass a constraint-free copy of the schema to `zodOutputFormat` and keep `AnalysisSchema.safeParse` in `lib/ai/analyze.ts` as the real validation (it already re-validates).
   - If `beta.messages.parse` does not exist, use `client.messages.parse` without `betas`/`fallbacks`.
3. **Next.js major version**: `proxy.ts` is the Next 16 name. On Next 15, rename it to `middleware.ts`.
4. **next-intl v4** APIs used: `defineRouting` with `pathnames`, `createNavigation`, `hasLocale`, `getRequestConfig`, `NextIntlClientProvider` without a `messages` prop, `t.rich`.
5. **`@types/google.maps`**: `AutocompleteSuggestion.fetchAutocompleteSuggestions`, `PlacePrediction.toPlace()`, `place.fetchFields`, the `locationBias` circle literal (`lib/client/places.ts`).
6. **`@vercel/blob` `put()`** options: `access: "public"`, `addRandomSuffix`, `contentType`, `token` (`lib/storage.ts`).

## Order of checks

```bash
npm install
npm run typecheck          # fix errors
npm test                   # unit tests; must all pass (tests/unit/*)
npx playwright install chromium
npm run test:e2e           # builds the app, runs the flow on a Pixel 7 viewport against tests/e2e/mock-server.mjs
npm run dev                # then look at /, /soumission, /en/quote on a 390 px wide viewport
```

The e2e suite covers: instant price (plan shown before one-time, $62.50/month, $525), photos surviving a reload, consent required, plan acceptance, exact Make payloads, low-confidence → manual review, invalid AI output → 1 retry → manual review, non-image upload refused (415), forged photo link refused, tampered quote token refused, and the FR/EN switch.

## Where things are

| What | File |
| --- | --- |
| Rates | `config/pricing.ts` |
| Business info, review thresholds, AI effort, rate limits | `config/business.ts` |
| Pricing engine | `lib/pricing.ts` (+ `tests/unit/pricing.test.ts`) |
| Review rules + distance | `lib/review.ts` |
| AI prompt / call / retry | `lib/ai/prompt.ts`, `lib/ai/claude.ts`, `lib/ai/analyze.ts` |
| Quote record, public view | `lib/quote.ts` |
| Make payload + retries | `lib/webhook.ts` |
| Signatures | `lib/signing.ts` |
| API routes | `app/api/photos`, `app/api/quote`, `app/api/quote/accept` |
| Wizard UI | `components/quote/*` (`QuoteWizard.tsx` is the state machine) |
| Texts | `messages/fr.json`, `messages/en.json` |
| Privacy policy (Law 25 template) | `app/[locale]/confidentialite/page.tsx` |

## Open TODOs for the owner

See "Before launch" and the Law 25 checklist in README.md (real phone/emails, privacy officer, logo, retention period, privacy impact assessment for transfers outside Québec, copy review, calibrating the AI on real houses).
