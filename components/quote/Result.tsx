"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { BUSINESS } from "@/config/business";
import { PRICING } from "@/config/pricing";
import { Alert, Button, buttonStyles, Spinner } from "@/components/ui";
import { formatMoney, formatPhone } from "@/lib/format";
import type { LineItem } from "@/lib/pricing";
import type { PublicQuote } from "@/lib/quote";
import { SIDES, type AcceptOption } from "@/lib/schemas";

type Priced = Extract<PublicQuote, { status: "priced" }>;

function useFocusHeading() {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return ref;
}

const headingClass = "text-[1.75rem] font-bold leading-tight tracking-tight outline-none sm:text-4xl";

export function PricedResult({
  quote,
  accepting,
  acceptError,
  onAccept,
  onRestart,
}: {
  quote: Priced;
  accepting: AcceptOption | null;
  acceptError: string | null;
  onAccept: (option: AcceptOption) => void;
  onRestart: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const heading = useFocusHeading();
  const money = (cents: number) => formatMoney(cents, locale);
  const { oneTime, annualPlan } = quote.pricing;
  const phone = formatPhone(BUSINESS.phone);

  const lineText = (l: LineItem) =>
    l.service === "windows"
      ? t("quote.result.lineWindows", { count: l.quantity, rate: money(l.unitCents) })
      : l.service === "gutters"
        ? t("quote.result.lineGutters", { count: l.quantity, rate: money(l.unitCents) })
        : t("quote.result.lineHouseWash", { count: l.quantity, rate: money(l.unitCents) });

  return (
    <div className="pb-16">
      <h1 ref={heading} tabIndex={-1} className={headingClass}>
        {t("quote.result.title")}
      </h1>
      <p className="mt-2 text-ink-soft">{t("quote.result.taxes")}</p>

      {acceptError && (
        <div className="mt-6">
          <Alert>{acceptError}</Alert>
        </div>
      )}

      <div className="mt-8 grid gap-5">
        {annualPlan && (
          <section aria-labelledby="plan-title" className="rounded-[14px] bg-blue p-6 text-white" data-testid="plan-card">
            <p className="inline-block rounded-full bg-white px-3 py-1 text-sm font-bold text-blue">{t("quote.result.planBadge")}</p>
            <h2 id="plan-title" className="mt-4 text-xl font-semibold">
              {t("quote.result.planName")}
            </h2>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold tracking-tight tabular" data-testid="plan-monthly">
                {money(annualPlan.monthlyCents)}
              </span>
              <span className="text-lg">{t("quote.result.perMonth")}</span>
            </p>
            <p className="mt-1 text-white/85 tabular" data-testid="plan-annual">
              {t("quote.result.perYear", { amount: money(annualPlan.annualCents) })}
            </p>
            <ul className="mt-5 grid gap-2 border-t border-white/25 pt-4">
              <li>{t("quote.result.planWindows", { rate: money(PRICING.windows.discountedPerPaneCents) })}</li>
              <li>{t("quote.result.planGutters")}</li>
              {annualPlan.addOns.map((a) => (
                <li key={a.service} className="text-white/85">
                  {t("quote.result.planAddOn", { service: t(`services.${a.service}`), amount: money(a.totalCents) })}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onAccept("annual_plan")}
              disabled={accepting !== null}
              className={`${buttonStyles.inverse} mt-6 w-full`}
            >
              {accepting === "annual_plan" && <Spinner />}
              {accepting === "annual_plan" ? t("quote.result.accepting") : t("quote.result.planAccept")}
            </button>
          </section>
        )}

        <section aria-labelledby="onetime-title" className="rounded-[14px] border-2 border-line p-6" data-testid="onetime-card">
          <h2 id="onetime-title" className="text-xl font-semibold">
            {t("quote.result.oneTimeName")}
          </h2>
          <p className="mt-1 text-4xl font-extrabold tracking-tight tabular" data-testid="onetime-total">
            {money(oneTime.totalCents)}
          </p>
          <p className="text-ink-soft">{t("quote.result.oneTimeSub")}</p>
          <ul className="mt-4 grid gap-1.5 border-t border-line pt-4 tabular">
            {oneTime.lines.map((l) => (
              <li key={l.service} className="flex justify-between gap-4">
                <span>
                  {t(`services.${l.service}`)}
                  <span className="block text-sm text-ink-soft">{lineText(l)}</span>
                </span>
                <span className="font-semibold">{money(l.totalCents)}</span>
              </li>
            ))}
          </ul>
          {oneTime.minimumApplied && (
            <p className="mt-3 text-sm text-ink-soft">
              {t("quote.result.minimum", { amount: money(oneTime.totalCents) })}
            </p>
          )}
          <Button
            variant={annualPlan ? "secondary" : "primary"}
            onClick={() => onAccept("one_time")}
            disabled={accepting !== null}
            className="mt-6 w-full"
          >
            {accepting === "one_time" && <Spinner />}
            {accepting === "one_time" ? t("quote.result.accepting") : t("quote.result.oneTimeAccept")}
          </Button>
        </section>
      </div>

      <section aria-labelledby="counted-title" className="mt-10">
        <h2 id="counted-title" className="text-xl font-bold">
          {t("quote.result.breakdownTitle")}
        </h2>
        <p className="mt-2 max-w-prose text-ink-soft">{t("quote.result.breakdownIntro", { phone })}</p>
        <dl className="mt-5 grid gap-4 tabular" data-testid="breakdown">
          {quote.services.includes("windows") && (
            <div>
              <dt className="font-semibold">{t("quote.result.panes")}</dt>
              <dd>
                <span data-testid="panes-total">{t("quote.result.panesTotal", { count: quote.measurements.panes })}</span>
                <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-ink-soft sm:grid-cols-4">
                  {SIDES.map((side) => (
                    <li key={side} className="flex justify-between gap-3 sm:justify-start">
                      {t(`sides.${side}`)}
                      <span className="font-semibold text-ink">{quote.analysis.panes_per_side[side]}</span>
                    </li>
                  ))}
                </ul>
                {quote.analysis.patio_doors > 0 && (
                  <p className="mt-1 text-ink-soft">{t("quote.result.patioDoors", { count: quote.analysis.patio_doors })}</p>
                )}
              </dd>
            </div>
          )}
          <div className="flex gap-10">
            <div>
              <dt className="font-semibold">{t("quote.result.storeys")}</dt>
              <dd data-testid="storeys">{quote.measurements.storeys}</dd>
            </div>
            {quote.services.includes("houseWash") && (
              <div>
                <dt className="font-semibold">{t("quote.result.walls")}</dt>
                <dd>{quote.measurements.walls}</dd>
              </div>
            )}
          </div>
          <div>
            <dt className="font-semibold">{t("quote.result.servicesChosen")}</dt>
            <dd>{quote.services.map((s) => t(`services.${s}`)).join(", ")}</dd>
          </div>
        </dl>
      </section>

      <button type="button" onClick={onRestart} className="mt-10 font-semibold text-blue underline underline-offset-4">
        {t("quote.result.newQuote")}
      </button>
    </div>
  );
}

export function ReviewResult({ phone, email, onRestart }: { phone: string; email: string; onRestart: () => void }) {
  const t = useTranslations("quote");
  const heading = useFocusHeading();
  const businessPhone = formatPhone(BUSINESS.phone);
  return (
    <div className="py-4" data-testid="manual-review">
      <ClockIcon />
      <h1 ref={heading} tabIndex={-1} className={`${headingClass} mt-6`}>
        {t("review.title")}
      </h1>
      <p className="mt-4 max-w-prose text-lg">{t("review.body", { phone: formatPhone(phone), email })}</p>
      <p className="mt-3 max-w-prose text-ink-soft">{t("review.note", { phone: businessPhone })}</p>
      <button type="button" onClick={onRestart} className="mt-10 font-semibold text-blue underline underline-offset-4">
        {t("result.newQuote")}
      </button>
    </div>
  );
}

export function AcceptedResult({ option, firstName, onRestart }: { option: AcceptOption; firstName: string; onRestart: () => void }) {
  const t = useTranslations("quote");
  const heading = useFocusHeading();
  return (
    <div className="py-4" data-testid="accepted">
      <span className="grid size-14 place-items-center rounded-full bg-blue text-white">
        <svg viewBox="0 0 16 16" className="size-7" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M3 8.5l3.2 3L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <h1 ref={heading} tabIndex={-1} className={`${headingClass} mt-6`}>
        {t("accepted.title")}
      </h1>
      <p className="mt-4 max-w-prose text-lg">{t(`accepted.${option}`, { firstName })}</p>
      <button type="button" onClick={onRestart} className="mt-10 font-semibold text-blue underline underline-offset-4">
        {t("result.newQuote")}
      </button>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-14" aria-hidden="true" fill="none" stroke="var(--color-blue)" strokeWidth="3">
      <circle cx="24" cy="24" r="20" />
      <path d="M24 13v11l7 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
