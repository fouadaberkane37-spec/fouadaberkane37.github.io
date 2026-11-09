"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export interface ContactDraft {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export type ContactErrors = Partial<Record<keyof ContactDraft | "consent", string>>;

interface Props {
  value: ContactDraft;
  consent: boolean;
  honeypot: string;
  errors: ContactErrors;
  onChange: (value: ContactDraft) => void;
  onConsent: (consent: boolean) => void;
  onHoneypot: (value: string) => void;
}

const FIELDS: { name: keyof ContactDraft; type: string; autoComplete: string; inputMode?: "tel" | "email" }[] = [
  { name: "firstName", type: "text", autoComplete: "given-name" },
  { name: "lastName", type: "text", autoComplete: "family-name" },
  { name: "phone", type: "tel", autoComplete: "tel-national", inputMode: "tel" },
  { name: "email", type: "email", autoComplete: "email", inputMode: "email" },
];

export function StepContact({ value, consent, honeypot, errors, onChange, onConsent, onHoneypot }: Props) {
  const t = useTranslations("quote.contact");

  return (
    <div className="grid max-w-md gap-5">
      {FIELDS.map((f) => (
        <div key={f.name}>
          <label htmlFor={`contact-${f.name}`} className="mb-2 block text-base font-semibold">
            {t(f.name)}
          </label>
          <input
            id={`contact-${f.name}`}
            name={f.name}
            type={f.type}
            inputMode={f.inputMode}
            autoComplete={f.autoComplete}
            value={value[f.name]}
            onChange={(e) => onChange({ ...value, [f.name]: e.target.value })}
            aria-invalid={Boolean(errors[f.name])}
            aria-describedby={errors[f.name] ? `contact-${f.name}-error` : undefined}
            className="block h-14 w-full rounded-[var(--radius-control)] border-2 border-line bg-paper px-4 text-lg outline-none transition-colors focus:border-blue aria-[invalid=true]:border-danger"
          />
          {errors[f.name] && (
            <p id={`contact-${f.name}-error`} className="mt-2 text-sm font-medium text-danger">
              {errors[f.name]}
            </p>
          )}
        </div>
      ))}

      {/* Honeypot: hidden from people, filled in by bots */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">{t("honeypot")}</label>
        <input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => onHoneypot(e.target.value)}
        />
      </div>

      <div>
        <label className="flex cursor-pointer gap-3 rounded-[var(--radius-control)] bg-glass p-4">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => onConsent(e.target.checked)}
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? "contact-consent-error" : undefined}
            className="mt-0.5 size-6 shrink-0 accent-[var(--color-blue)]"
            data-testid="consent"
          />
          <span className="text-base leading-snug">
            {t.rich("consent", {
              link: (chunks) => (
                <Link href="/confidentialite" target="_blank" className="font-semibold text-blue underline underline-offset-2">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        {errors.consent && (
          <p id="contact-consent-error" className="mt-2 text-sm font-medium text-danger">
            {errors.consent}
          </p>
        )}
      </div>
    </div>
  );
}
