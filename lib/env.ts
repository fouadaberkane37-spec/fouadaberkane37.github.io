import "server-only";
import { AI_SETTINGS } from "@/config/business";

/**
 * Server-side environment, read lazily so tests can set variables before use.
 * Missing optional services degrade to local fallbacks in development only.
 */

const isProduction = () => process.env.NODE_ENV === "production";
const onVercel = () => Boolean(process.env.VERCEL);

export function anthropicModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || AI_SETTINGS.defaultModel;
}

export function makeWebhookUrl(): string | null {
  return process.env.MAKE_WEBHOOK_URL?.trim() || null;
}

export function blobToken(): string | null {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim() || null;
  if (!token && onVercel()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is required on Vercel (photos cannot be stored on local disk).");
  }
  return token;
}

export function upstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

const DEV_SECRET = "dev-only-insecure-secret-do-not-use-in-production";

export function signingSecret(): string {
  const secret = process.env.QUOTE_SIGNING_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (isProduction()) {
    throw new Error("QUOTE_SIGNING_SECRET must be set to at least 32 characters in production.");
  }
  return DEV_SECRET;
}
