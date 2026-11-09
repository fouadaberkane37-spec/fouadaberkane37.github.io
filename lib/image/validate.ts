/** Server-side check of an uploaded photo: real file type from its first bytes, and size. */

export const MAX_PHOTO_BYTES = 4 * 1024 * 1024; // Vercel functions reject bodies over 4.5 MB
export const MIN_PHOTO_BYTES = 1024;

export type ImageType = "image/jpeg" | "image/png" | "image/webp";

export function sniffImageType(bytes: Uint8Array): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export type PhotoCheck =
  | { ok: true; type: ImageType }
  | { ok: false; error: "too_large" | "too_small" | "unsupported_type" };

export function checkPhoto(bytes: Uint8Array): PhotoCheck {
  if (bytes.length > MAX_PHOTO_BYTES) return { ok: false, error: "too_large" };
  if (bytes.length < MIN_PHOTO_BYTES) return { ok: false, error: "too_small" };
  const type = sniffImageType(bytes);
  return type ? { ok: true, type } : { ok: false, error: "unsupported_type" };
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

export const EXTENSIONS: Record<ImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
