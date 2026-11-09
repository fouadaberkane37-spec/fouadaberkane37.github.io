import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zfentretien.ca";

const PAGES: { fr: string; en: string; priority: number }[] = [
  { fr: "/", en: "/en", priority: 1 },
  { fr: "/soumission", en: "/en/quote", priority: 0.9 },
  { fr: "/confidentialite", en: "/en/privacy", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap(({ fr, en, priority }) =>
    [fr, en].map((path) => ({
      url: `${SITE_URL}${path}`,
      priority,
      alternates: { languages: { "fr-CA": `${SITE_URL}${fr}`, "en-CA": `${SITE_URL}${en}` } },
    })),
  );
}
