"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Button, Spinner } from "@/components/ui";

interface Props {
  step: number; // 1-based
  total: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextBusy?: boolean;
  nextDisabled?: boolean;
}

/** One wizard step: progress, heading, content, and a thumb-reachable action bar. */
export function StepShell({ step, total, title, hint, children, onBack, onNext, nextLabel, nextBusy, nextDisabled }: Props) {
  const t = useTranslations("quote");
  const heading = useRef<HTMLHeadingElement>(null);

  // Move focus to the new step's heading so screen readers announce it.
  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!nextBusy) onNext();
      }}
      className="pb-36"
    >
      <div className="mb-6">
        <p className="text-sm font-semibold text-ink-soft">{t("progress", { current: step, total })}</p>
        <div className="mt-2 grid grid-cols-4 gap-1.5" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-1.5 rounded-full ${i < step ? "bg-blue" : "bg-line"}`} />
          ))}
        </div>
      </div>

      <h1 ref={heading} tabIndex={-1} className="text-[1.75rem] font-bold leading-tight tracking-tight outline-none sm:text-4xl">
        {title}
      </h1>
      {hint && <p className="mt-3 max-w-prose text-lg text-ink-soft">{hint}</p>}

      <div className="mt-8">{children}</div>

      <div data-step-bar className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-xl gap-3">
          {onBack && (
            <Button variant="secondary" onClick={onBack} className="shrink-0">
              {t("back")}
            </Button>
          )}
          <button
            type="submit"
            disabled={nextDisabled || nextBusy}
            className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-blue px-6 text-lg font-semibold text-white transition-colors hover:bg-blue-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            {nextBusy && <Spinner />}
            {nextLabel ?? t("continue")}
          </button>
        </div>
      </div>
    </form>
  );
}
