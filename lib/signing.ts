import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * HMAC signatures so the browser can carry server data without being able to change it:
 *  - photo refs: prove a photo URL was issued by our own /api/photos route
 *  - quote tokens: the whole priced quote, so "Accepter" needs no database
 * Each use has its own prefix so a signature for one can never be replayed as the other.
 */

function hmac(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function signPhoto(secret: string, quoteId: string, side: string, url: string): string {
  return hmac(`photo:${quoteId}:${side}:${url}`, secret);
}

export function verifyPhoto(secret: string, quoteId: string, side: string, url: string, sig: string): boolean {
  return safeEqual(signPhoto(secret, quoteId, side, url), sig);
}

interface TokenEnvelope<T> {
  exp: number; // unix seconds
  data: T;
}

export function encodeToken<T>(secret: string, data: T, ttlSeconds: number, now = Date.now()): string {
  const envelope: TokenEnvelope<T> = { exp: Math.floor(now / 1000) + ttlSeconds, data };
  const body = Buffer.from(JSON.stringify(envelope)).toString("base64url");
  return `${body}.${hmac(`quote:${body}`, secret)}`;
}

export type DecodeResult<T> = { ok: true; data: T } | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

export function decodeToken<T>(secret: string, token: string, now = Date.now()): DecodeResult<T> {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "malformed" };
  const [body, sig] = parts;
  if (!safeEqual(hmac(`quote:${body}`, secret), sig)) return { ok: false, reason: "bad_signature" };
  let envelope: TokenEnvelope<T>;
  try {
    envelope = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (typeof envelope.exp !== "number" || envelope.exp * 1000 < now) return { ok: false, reason: "expired" };
  return { ok: true, data: envelope.data };
}
