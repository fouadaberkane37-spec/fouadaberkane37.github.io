"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { BUSINESS } from "@/config/business";
import type { ServiceId } from "@/config/pricing";
import { Alert } from "@/components/ui";
import { deletePhotoLocally, loadPhotoLocally } from "@/lib/client/photo-store";
import { formatPhone } from "@/lib/format";
import type { PublicQuote } from "@/lib/quote";
import { ContactSchema, SIDES, type AcceptOption, type Address, type PhotoRef, type Side } from "@/lib/schemas";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { AcceptedResult, PricedResult, ReviewResult } from "./Result";
import { StepContact, type ContactDraft, type ContactErrors } from "./StepContact";
import { StepPhotos } from "./StepPhotos";
import { StepServices } from "./StepServices";
import { StepShell } from "./StepShell";
import { Submitting, type SubmitPhase } from "./Submitting";

type Step = "address" | "services" | "photos" | "contact" | "result";
const FORM_STEPS: Step[] = ["address", "services", "photos", "contact"];

interface Draft {
  v: 1;
  quoteId: string;
  step: Step;
  address: Address | null;
  services: ServiceId[];
  photos: Record<Side, boolean>;
  contact: ContactDraft;
  consent: boolean;
  result: { quote: PublicQuote; token: string | null } | null;
  accepted: AcceptOption | null;
}

const STORAGE_KEY = "zf-quote-draft";

function uuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // crypto.randomUUID is missing on plain-http LAN testing; build a v4 UUID by hand.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const newDraft = (): Draft => ({
  v: 1,
  quoteId: uuid(),
  step: "address",
  address: null,
  services: [],
  photos: { front: false, back: false, left: false, right: false },
  contact: { firstName: "", lastName: "", phone: "", email: "" },
  consent: false,
  result: null,
  accepted: null,
});

function loadDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Draft;
      if (parsed.v === 1 && parsed.quoteId) return parsed;
    }
  } catch {
    // storage unavailable (private mode) — start fresh
  }
  return newDraft();
}

type ErrorKey = "address" | "services" | "photos" | "submit";

export function QuoteWizard() {
  const t = useTranslations("quote");
  const locale = useLocale() as "fr" | "en";
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Partial<Record<ErrorKey, string>>>({});
  const [contactErrors, setContactErrors] = useState<ContactErrors>({});
  const [honeypot, setHoneypot] = useState("");
  const [phase, setPhase] = useState<SubmitPhase | null>(null);
  const [accepting, setAccepting] = useState<AcceptOption | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => setDraft(loadDraft()), []);

  useEffect(() => {
    if (!draft) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // ignore
    }
  }, [draft]);

  const update = useCallback((patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d)), []);

  const go = useCallback(
    (step: Step) => {
      setErrors({});
      update({ step });
      window.scrollTo({ top: 0 });
    },
    [update],
  );

  if (!draft) return <div className="min-h-[60vh]" aria-busy="true" />;

  const phone = formatPhone(BUSINESS.phone);
  const stepIndex = FORM_STEPS.indexOf(draft.step) + 1;

  async function restart() {
    await Promise.all(SIDES.map((s) => deletePhotoLocally(s).catch(() => undefined)));
    setAcceptError(null);
    setDraft(newDraft());
    window.scrollTo({ top: 0 });
  }

  async function submit(d: Draft) {
    const parsed = ContactSchema.safeParse(d.contact);
    const nextErrors: ContactErrors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof ContactDraft;
        nextErrors[field] ??= t(`errors.${field}`);
      }
    }
    if (!d.consent) nextErrors.consent = t("errors.consent");
    setContactErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !parsed.success) return;

    setErrors({});
    setPhase("upload");
    window.scrollTo({ top: 0 });
    try {
      // Photos leave the phone only now, after consent. One request per photo keeps each under Vercel's limit.
      const refs = await Promise.all(SIDES.map((side) => uploadPhoto(d.quoteId, side)));
      const photos = Object.fromEntries(refs) as Record<Side, PhotoRef>;

      setPhase("analyze");
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          quoteId: d.quoteId,
          locale,
          address: d.address,
          services: d.services,
          photos,
          contact: d.contact,
          consent: true,
          website: honeypot,
        }),
      });
      if (!res.ok) throw new SubmitError(res.status === 429 ? "rate_limited" : "generic");
      const result = (await res.json()) as Draft["result"];
      await Promise.all(SIDES.map((s) => deletePhotoLocally(s).catch(() => undefined)));
      update({ result, step: "result" });
    } catch (err) {
      const code = err instanceof SubmitError ? err.code : err instanceof TypeError ? "network" : "generic";
      setErrors({ submit: t(`errors.${code}`, { phone }) });
    } finally {
      setPhase(null);
      window.scrollTo({ top: 0 });
    }
  }

  async function accept(option: AcceptOption) {
    if (!draft?.result?.token) return;
    setAccepting(option);
    setAcceptError(null);
    try {
      const res = await fetch("/api/quote/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: draft.result.token, option }),
      });
      if (res.ok) {
        update({ accepted: option });
        window.scrollTo({ top: 0 });
      } else {
        setAcceptError(t(res.status === 410 ? "result.acceptExpired" : "result.acceptError", { phone }));
      }
    } catch {
      setAcceptError(t("result.acceptError", { phone }));
    } finally {
      setAccepting(null);
    }
  }

  // ----- screens -----

  if (phase) return <Submitting phase={phase} />;

  if (draft.step === "result" && draft.result) {
    const { quote } = draft.result;
    if (draft.accepted) {
      return <AcceptedResult option={draft.accepted} firstName={draft.contact.firstName.trim()} onRestart={restart} />;
    }
    if (quote.status === "manual_review") {
      return <ReviewResult phone={draft.contact.phone} email={draft.contact.email.trim()} onRestart={restart} />;
    }
    return (
      <PricedResult quote={quote} accepting={accepting} acceptError={acceptError} onAccept={accept} onRestart={restart} />
    );
  }

  switch (draft.step) {
    case "address":
      return (
        <StepShell
          step={1}
          total={4}
          title={t("address.title")}
          onNext={() => {
            if (!draft.address || draft.address.formatted.trim().length < 5) {
              setErrors({ address: t("errors.address") });
              return;
            }
            go("services");
          }}
        >
          <AddressAutocomplete value={draft.address} onChange={(address) => update({ address })} error={errors.address} />
        </StepShell>
      );

    case "services":
      return (
        <StepShell
          step={2}
          total={4}
          title={t("services.title")}
          hint={t("services.hint")}
          onBack={() => go("address")}
          onNext={() => (draft.services.length ? go("photos") : setErrors({ services: t("errors.services") }))}
        >
          <StepServices value={draft.services} onChange={(services) => update({ services })} error={errors.services} />
        </StepShell>
      );

    case "photos":
      return (
        <StepShell
          step={3}
          total={4}
          title={t("photos.title")}
          hint={t("photos.hint")}
          onBack={() => go("services")}
          onNext={async () => {
            const missing = await missingPhotos(draft.photos);
            if (missing.length) {
              // A photo marked as taken but no longer on the phone must be retaken.
              update({ photos: { ...draft.photos, ...Object.fromEntries(missing.map((s) => [s, false])) } });
              setErrors({ photos: t("errors.photosMissing", { count: missing.length }) });
              return;
            }
            go("contact");
          }}
        >
          <StepPhotos
            taken={draft.photos}
            onTaken={(side) => setDraft((d) => (d ? { ...d, photos: { ...d.photos, [side]: true } } : d))}
            error={errors.photos}
          />
        </StepShell>
      );

    case "contact":
      return (
        <StepShell
          step={stepIndex}
          total={4}
          title={t("contact.title")}
          onBack={() => go("photos")}
          onNext={() => void submit(draft)}
          nextLabel={t("contact.submit")}
        >
          {errors.submit && (
            <div className="mb-6">
              <Alert>{errors.submit}</Alert>
            </div>
          )}
          <StepContact
            value={draft.contact}
            consent={draft.consent}
            honeypot={honeypot}
            errors={contactErrors}
            onChange={(contact) => update({ contact })}
            onConsent={(consent) => update({ consent })}
            onHoneypot={setHoneypot}
          />
        </StepShell>
      );

    default:
      // A stale "result" step without a result: start over.
      return (
        <StepShell step={1} total={4} title={t("address.title")} onNext={() => go("services")}>
          <AddressAutocomplete value={draft.address} onChange={(address) => update({ address })} />
        </StepShell>
      );
  }
}

class SubmitError extends Error {
  constructor(public code: "rate_limited" | "too_large" | "generic") {
    super(code);
  }
}

async function missingPhotos(photos: Record<Side, boolean>): Promise<Side[]> {
  const checks = await Promise.all(
    SIDES.map(async (side) => (photos[side] && (await loadPhotoLocally(side).catch(() => undefined)) ? null : side)),
  );
  return checks.filter((s): s is Side => s !== null);
}

async function uploadPhoto(quoteId: string, side: Side): Promise<[Side, PhotoRef]> {
  const blob = await loadPhotoLocally(side);
  if (!blob) throw new SubmitError("generic");
  const form = new FormData();
  form.set("quoteId", quoteId);
  form.set("side", side);
  form.set("photo", blob, `${side}.jpg`);
  const res = await fetch("/api/photos", { method: "POST", body: form });
  if (res.status === 429) throw new SubmitError("rate_limited");
  if (res.status === 413) throw new SubmitError("too_large");
  if (!res.ok) throw new SubmitError("generic");
  return [side, (await res.json()) as PhotoRef];
}
