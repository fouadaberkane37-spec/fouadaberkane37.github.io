import { AnalysisSchema, SIDES, type Side } from "@/lib/schemas";
import type { AnalysisOutcome } from "@/lib/quote";

export interface PhotoInput {
  side: Side;
  data: Buffer;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}

/** Calls the vision model once and returns its parsed JSON (or throws). */
export type ModelCall = (photos: PhotoInput[]) => Promise<unknown>;

export const MAX_ATTEMPTS = 2; // first try + one retry, then manual review

/**
 * Runs the photo analysis with one retry. Never throws: a failure comes back as
 * { status: "failed" } so the quote goes to manual review instead of erroring.
 */
export async function analyzeHouse(photos: PhotoInput[], callModel: ModelCall): Promise<AnalysisOutcome> {
  const ordered = SIDES.map((side) => photos.find((p) => p.side === side));
  if (ordered.some((p) => !p)) return { status: "failed", error: "missing_photo", attempts: 0 };

  let lastError = "unknown";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callModel(ordered as PhotoInput[]);
      const parsed = AnalysisSchema.safeParse(raw);
      if (parsed.success) return { status: "ok", analysis: parsed.data, attempts: attempt };
      lastError = `invalid_output: ${parsed.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join(".") || "(root)"} ${i.message}`)
        .join("; ")}`;
    } catch (err) {
      lastError = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    }
    console.warn(`[analyze] attempt ${attempt}/${MAX_ATTEMPTS} failed: ${lastError}`);
  }
  return { status: "failed", error: lastError.slice(0, 500), attempts: MAX_ATTEMPTS };
}
