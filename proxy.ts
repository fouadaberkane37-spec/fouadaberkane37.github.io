import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Locale routing: "/" → French, "/en/…" → English, localized paths (/soumission ↔ /en/quote).
// (Next 16 calls this file proxy.ts; it was middleware.ts in earlier versions.)
export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals and files with an extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
