import type { Metadata, Viewport } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer, Header } from "@/components/SiteChrome";
import { routing } from "@/i18n/routing";
import "../globals.css";

const font = Schibsted_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-schibsted",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zfentretien.ca";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: locale === "fr" ? "/" : "/en",
      languages: { "fr-CA": "/", "en-CA": "/en" },
    },
    openGraph: { title: t("title"), description: t("description"), locale: locale === "fr" ? "fr_CA" : "en_CA", type: "website" },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b3b8f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale === "fr" ? "fr-CA" : "en-CA"} className={font.variable}>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
