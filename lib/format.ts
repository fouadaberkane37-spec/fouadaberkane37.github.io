/** "62,50 $" in French, "$62.50" in English; whole dollars drop the decimals ("525 $"). */
export function formatMoney(cents: number, locale: string): string {
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat(locale === "fr" ? "fr-CA" : "en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** "4505551234" → "450 555-1234" */
export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "");
  return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)}-${d.slice(6)}` : digits;
}
