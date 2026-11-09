import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AI_SETTINGS } from "@/config/business";
import { anthropicModel } from "@/lib/env";
import { AnalysisSchema } from "@/lib/schemas";
import type { ModelCall } from "./analyze";
import { FINAL_INSTRUCTION, SIDE_LABELS, SYSTEM_PROMPT } from "./prompt";

/** Models that accept the API's server-side refusal fallback (`fallbacks: "default"`). */
const FALLBACK_MODELS = new Set(["claude-sonnet-5-5", "claude-opus-5-5", "claude-opus-5", "claude-fable-5-1"]);

let client: Anthropic | null = null;
// Reads ANTHROPIC_API_KEY (and ANTHROPIC_BASE_URL, used by the e2e mock) from the environment.
const getClient = () => (client ??= new Anthropic({ timeout: AI_SETTINGS.timeoutMs, maxRetries: 1 }));

/** One call to Claude with the four photos. Returns the structured JSON, or throws. */
export const callClaude: ModelCall = async (photos) => {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  photos.forEach((photo, i) => {
    content.push({ type: "text", text: `Photo ${i + 1} — ${SIDE_LABELS[photo.side]}:` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: photo.mediaType, data: photo.data.toString("base64") },
    });
  });
  content.push({ type: "text", text: FINAL_INSTRUCTION });

  const model = anthropicModel();
  const fallback = FALLBACK_MODELS.has(model);

  const response = await getClient().beta.messages.parse({
    model,
    max_tokens: 16_000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(AnalysisSchema), effort: AI_SETTINGS.effort },
    ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
  });

  if (response.stop_reason === "refusal") throw new Error("refusal");
  if (response.stop_reason === "max_tokens") throw new Error("max_tokens");
  return response.parsed_output;
};
