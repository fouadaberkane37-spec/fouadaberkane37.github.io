"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Spinner } from "@/components/ui";

export type SubmitPhase = "upload" | "analyze";

/** Shown while photos upload and the AI counts. Phases reflect the real requests. */
export function Submitting({ phase }: { phase: SubmitPhase }) {
  const t = useTranslations("quote.submitting");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  const phases = ["upload", "analyze", "price"] as const;
  const current = phases.indexOf(phase);

  return (
    <div className="py-6" aria-busy="true">
      <h1 ref={heading} tabIndex={-1} className="text-[1.75rem] font-bold leading-tight outline-none sm:text-4xl">
        {t("title")}
      </h1>
      <ol className="mt-8 grid gap-4" aria-live="polite">
        {phases.map((p, i) => {
          const state = i < current ? "done" : i === current ? "current" : "todo";
          return (
            <li key={p} className={`flex items-center gap-3 text-lg ${state === "todo" ? "text-ink-soft" : "font-semibold"}`}>
              <span className="grid size-8 place-items-center rounded-full border-2 border-blue text-blue">
                {state === "done" ? (
                  <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M3 8.5l3.2 3L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : state === "current" ? (
                  <Spinner className="size-4 border-2" />
                ) : null}
              </span>
              {t(p)}
            </li>
          );
        })}
      </ol>
      <p className="mt-8 max-w-prose text-ink-soft">{t("note")}</p>
    </div>
  );
}
