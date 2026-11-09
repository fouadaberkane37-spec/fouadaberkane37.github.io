"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LocaleToggle() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const other = locale === "fr" ? "en" : "fr";

  return (
    <button
      type="button"
      lang={other}
      aria-label={t("switchLabel")}
      onClick={() => router.replace(pathname, { locale: other })}
      className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 font-semibold text-blue hover:bg-glass"
    >
      {t("otherLanguage")}
    </button>
  );
}
