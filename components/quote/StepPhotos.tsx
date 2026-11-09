"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { ElevationGlyph, PlanDiagram } from "@/components/diagrams";
import { Alert, buttonStyles, Spinner } from "@/components/ui";
import { compressPhoto } from "@/lib/client/compress";
import { loadPhotoLocally, savePhotoLocally } from "@/lib/client/photo-store";
import { SIDES, type Side } from "@/lib/schemas";

interface Props {
  taken: Record<Side, boolean>;
  onTaken: (side: Side) => void;
  error?: string;
}

/**
 * Guided capture. The four photos are shown as the four panes of a window;
 * the selected pane gets a "where to stand" diagram and the camera buttons.
 */
export function StepPhotos({ taken, onTaken, error }: Props) {
  const t = useTranslations();
  const id = useId();
  const [active, setActive] = useState<Side>(() => SIDES.find((s) => !taken[s]) ?? "front");
  const [previews, setPreviews] = useState<Partial<Record<Side, string>>>({});
  const [busy, setBusy] = useState<Side | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Rebuild thumbnails from the photos kept on the phone (e.g. after a reload).
  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    (async () => {
      for (const side of SIDES) {
        if (!taken[side]) continue;
        const blob = await loadPhotoLocally(side).catch(() => undefined);
        if (!blob || cancelled) continue;
        const url = URL.createObjectURL(blob);
        urls.push(url);
        setPreviews((p) => ({ ...p, [side]: url }));
      }
    })();
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
    // Only on mount: later photos create their own previews.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFile(side: Side, input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = ""; // allow picking the same file again
    if (!file) return;
    setFileError(null);
    if (file.type && !file.type.startsWith("image/")) {
      setFileError(t("quote.errors.notImage"));
      return;
    }
    setBusy(side);
    try {
      const blob = await compressPhoto(file);
      await savePhotoLocally(side, blob);
      setPreviews((p) => {
        if (p[side]) URL.revokeObjectURL(p[side]!);
        return { ...p, [side]: URL.createObjectURL(blob) };
      });
      onTaken(side);
      const next = SIDES.find((s) => s !== side && !taken[s]);
      if (next) setActive(next);
    } catch {
      setFileError(t("quote.errors.unreadable"));
    } finally {
      setBusy(null);
    }
  }

  const count = SIDES.filter((s) => taken[s]).length;
  const sideName = t(`sides.${active}`);

  return (
    <div>
      <p className="mb-3 font-semibold tabular" aria-live="polite">
        {t("quote.photos.count", { count })}
      </p>

      {/* The window: one pane per photo */}
      <div className="window-frame max-w-md">
        {SIDES.map((side) => {
          const isActive = side === active;
          return (
            <button
              key={side}
              type="button"
              onClick={() => setActive(side)}
              aria-current={isActive ? "step" : undefined}
              aria-label={t("quote.photos.paneLabel", {
                side: t(`sides.${side}`),
                state: taken[side] ? t("quote.photos.stateDone") : t("quote.photos.stateTodo"),
              })}
              data-testid={`pane-${side}`}
              className={`relative aspect-[4/3] overflow-hidden bg-glass text-left outline-offset-[-3px] ${
                isActive ? "outline outline-[3px] outline-white" : ""
              }`}
            >
              {previews[side] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previews[side]} alt="" className="absolute inset-0 size-full object-cover" />
              ) : (
                <ElevationGlyph side={side} className="absolute inset-x-[18%] top-[14%] w-[64%] opacity-70" />
              )}
              <span
                className={`absolute inset-x-0 bottom-0 flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-semibold ${
                  taken[side] ? "bg-blue text-white" : "bg-paper/85 text-ink"
                }`}
              >
                {taken[side] && <CheckIcon />}
                {t(`sides.${side}`)}
              </span>
              {busy === side && (
                <span className="absolute inset-0 grid place-items-center bg-paper/70 text-blue">
                  <Spinner />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Instructions for the selected side */}
      <section aria-labelledby={`${id}-side`} className="mt-8 max-w-md">
        <h2 id={`${id}-side`} className="text-2xl font-bold">
          {sideName}
        </h2>
        <div className="mt-4 grid grid-cols-[7.5rem_1fr] items-start gap-4">
          <PlanDiagram
            side={active}
            label={t("quote.photos.diagramLabel", { side: sideName })}
            streetLabel={t("quote.photos.street")}
            youLabel={t("quote.photos.you")}
            className="w-full"
          />
          <div className="text-lg">
            <p>{t(`quote.photos.tip_${active}`)}</p>
            <p className="mt-2 text-base text-ink-soft">{t("quote.photos.landscape")}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <label className={`${buttonStyles.primary} cursor-pointer`} aria-disabled={busy !== null}>
            <CameraIcon />
            {busy === active ? t("quote.photos.processing") : taken[active] ? t("quote.photos.retake") : t("quote.photos.take")}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={busy !== null}
              data-testid={`camera-${active}`}
              onChange={(e) => void handleFile(active, e.currentTarget)}
            />
          </label>
          <label className={`${buttonStyles.secondary} cursor-pointer`} aria-disabled={busy !== null}>
            {t("quote.photos.gallery")}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={busy !== null}
              data-testid={`gallery-${active}`}
              onChange={(e) => void handleFile(active, e.currentTarget)}
            />
          </label>
        </div>

        {(fileError || error) && (
          <div className="mt-4">
            <Alert>{fileError ?? error}</Alert>
          </div>
        )}
      </section>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M3 8.5l3.2 3L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
