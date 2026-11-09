"use client";

import { useLocale, useTranslations } from "next-intl";
import { PRICING, type ServiceId } from "@/config/pricing";
import { formatMoney } from "@/lib/format";
import { SERVICES } from "@/lib/schemas";

interface Props {
  value: ServiceId[];
  onChange: (services: ServiceId[]) => void;
  error?: string;
}

export function StepServices({ value, onChange, error }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const money = (cents: number) => formatMoney(cents, locale);

  const hints: Record<ServiceId, string> = {
    windows: t("quote.services.windowsHint", {
      regular: money(PRICING.windows.perPaneCents),
      discounted: money(PRICING.windows.discountedPerPaneCents),
    }),
    gutters: t("quote.services.guttersHint", { price: money(PRICING.gutters.perStoreyCents) }),
    houseWash: t("quote.services.houseWashHint", { price: money(PRICING.houseWash.perWallCents) }),
  };

  function toggle(service: ServiceId) {
    onChange(value.includes(service) ? value.filter((s) => s !== service) : [...value, service]);
  }

  return (
    <fieldset aria-describedby={error ? "services-error" : undefined}>
      <legend className="sr-only">{t("quote.services.title")}</legend>
      <div className="grid gap-3">
        {SERVICES.map((service) => {
          const checked = value.includes(service);
          return (
            <label
              key={service}
              className={`flex min-h-20 cursor-pointer items-center gap-4 rounded-[var(--radius-control)] border-2 px-4 py-4 transition-colors ${
                checked ? "border-blue bg-glass" : "border-line bg-paper hover:border-ink-soft"
              }`}
            >
              <input
                type="checkbox"
                name="services"
                value={service}
                checked={checked}
                onChange={() => toggle(service)}
                className="size-6 shrink-0 accent-[var(--color-blue)]"
              />
              <span>
                <span className="block text-lg font-semibold">{t(`services.${service}`)}</span>
                <span className="block text-ink-soft">{hints[service]}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id="services-error" role="alert" className="mt-3 font-medium text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}
