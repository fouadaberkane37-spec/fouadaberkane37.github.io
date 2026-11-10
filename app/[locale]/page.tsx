import { getTranslations, setRequestLocale } from "next-intl/server";
import { ElevationGlyph } from "@/components/diagrams";
import { buttonStyles } from "@/components/ui";
import { BUSINESS } from "@/config/business";
import { Link } from "@/i18n/navigation";
import { SIDES } from "@/lib/schemas";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const services = [
    { name: t("services.windows"), text: t("home.windowsText") },
    { name: t("services.gutters"), text: t("home.guttersText") },
    { name: t("services.houseWash"), text: t("home.houseWashText") },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: BUSINESS.name,
    url: `https://${BUSINESS.domain}`,
    telephone: `+1-${BUSINESS.phone}`,
    email: BUSINESS.email,
    areaServed: ["Saint-Colomban", "Saint-Jérôme", "Laurentides", "Rawdon"].map((name) => ({ "@type": "Place", name })),
    address: { "@type": "PostalAddress", addressLocality: "Saint-Colomban", addressRegion: "QC", addressCountry: "CA" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero: the promise on the left, the four photos as a window on the right */}
      <section className="mx-auto grid max-w-5xl items-center gap-10 px-4 pt-10 pb-14 md:grid-cols-[1.1fr_1fr] md:gap-14 md:pt-20 md:pb-24">
        <div>
          <h1 className="text-[2.6rem] leading-[1.02] font-extrabold tracking-[-0.03em] text-balance sm:text-6xl">
            {t("home.heroTitle")}
          </h1>
          <p className="mt-5 max-w-[34rem] text-lg text-ink-soft sm:text-xl">{t("home.heroLead")}</p>
          <Link href="/soumission" className={`${buttonStyles.primary} mt-8 w-full sm:w-auto sm:px-10`}>
            {t("home.heroCta")}
          </Link>
          <p className="mt-5 flex items-start gap-2 text-ink-soft">
            <PinIcon />
            {t("home.heroArea")}
          </p>
        </div>

        <div className="window-frame mx-auto w-full max-w-[26rem] shadow-[0_30px_60px_-30px_rgba(11,59,143,0.55)]" aria-hidden="true">
          {SIDES.map((side) => (
            <div key={side} className="relative aspect-[4/3] bg-gradient-to-br from-glass to-glass-strong">
              <ElevationGlyph side={side} className="absolute inset-x-[16%] top-[12%] w-[68%]" />
              <span className="absolute bottom-2 left-2.5 text-sm font-semibold text-blue">{t(`sides.${side}`)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-3xl font-bold tracking-tight">{t("home.servicesTitle")}</h2>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {services.map((s) => (
            <li key={s.name} className="grid gap-1 py-5 sm:grid-cols-[16rem_1fr] sm:gap-8">
              <h3 className="text-lg font-semibold">{s.name}</h3>
              <p className="text-ink-soft">{s.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-soft">{t("home.minimum")}</p>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-[14px] bg-blue px-6 py-8 text-white sm:px-10">
          <h2 className="text-2xl font-bold">{t("home.planTitle")}</h2>
          <p className="mt-3 max-w-[38rem] text-lg text-white/90">
            {t("home.planText")}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="text-3xl font-bold tracking-tight">{t("home.howTitle")}</h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-3">
          {(["how1", "how2", "how3"] as const).map((key, i) => (
            <li key={key} className="flex gap-4 sm:block">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-blue font-bold text-blue tabular">
                {i + 1}
              </span>
              <p className="text-lg sm:mt-4">{t(`home.${key}`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-6">
        <h2 className="text-2xl font-bold">{t("home.areaTitle")}</h2>
        <p className="mt-3 max-w-[40rem] text-lg text-ink-soft">{t("home.areaText")}</p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pt-10">
        <div className="flex flex-col gap-4 border-t-2 border-blue pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xl font-semibold">{t("home.finalCta")}</p>
          <Link href="/soumission" className={`${buttonStyles.primary} w-full sm:w-auto sm:px-10`}>
            {t("home.heroCta")}
          </Link>
        </div>
      </section>
    </>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0" aria-hidden="true" fill="none" stroke="var(--color-blue)" strokeWidth="2">
      <path d="M10 18s6-5.4 6-10a6 6 0 10-12 0c0 4.6 6 10 6 10z" />
      <circle cx="10" cy="8" r="2.2" />
    </svg>
  );
}
