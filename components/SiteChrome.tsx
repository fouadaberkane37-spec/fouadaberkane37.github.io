import { getTranslations } from "next-intl/server";
import { BUSINESS } from "@/config/business";
import { Link } from "@/i18n/navigation";
import { formatPhone } from "@/lib/format";
import { LocaleToggle } from "./LocaleToggle";
import { Logo } from "./Logo";

export async function Header() {
  const t = await getTranslations("nav");
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label={t("home")} className="rounded-[var(--radius-control)]">
          <Logo />
        </Link>
        <LocaleToggle />
      </div>
    </header>
  );
}

export async function Footer() {
  const t = await getTranslations("footer");
  const phone = formatPhone(BUSINESS.phone);
  return (
    <footer className="mt-16 border-t border-line bg-glass">
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:grid-cols-[1fr_auto]">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-ink-soft">{BUSINESS.serviceArea.label}</p>
        </div>
        <div className="grid content-start gap-2">
          <p className="font-semibold">{t("contact")}</p>
          <a href={`tel:+1${BUSINESS.phone.replace(/\D/g, "")}`} className="text-blue underline-offset-4 hover:underline">
            {phone}
          </a>
          <a href={`mailto:${BUSINESS.email}`} className="text-blue underline-offset-4 hover:underline">
            {BUSINESS.email}
          </a>
          <Link href="/confidentialite" className="mt-2 text-ink-soft underline underline-offset-4">
            {t("privacy")}
          </Link>
        </div>
        <p className="text-sm text-ink-soft sm:col-span-2">{t("rights", { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
