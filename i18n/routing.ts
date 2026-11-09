import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  // French lives at "/", English at "/en/…"
  localePrefix: "as-needed",
  // Everyone lands in French unless they pick English.
  localeDetection: false,
  pathnames: {
    "/": "/",
    "/soumission": { fr: "/soumission", en: "/quote" },
    "/confidentialite": { fr: "/confidentialite", en: "/privacy" },
  },
});

export type Locale = (typeof routing.locales)[number];
