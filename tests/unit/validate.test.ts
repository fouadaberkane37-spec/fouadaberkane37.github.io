import { describe, expect, it } from "vitest";
import { checkPhoto, MAX_PHOTO_BYTES, sniffImageType } from "@/lib/image/validate";

const pad = (head: number[], size = 2048) => {
  const bytes = new Uint8Array(size);
  bytes.set(head);
  return bytes;
};
const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP = [...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")];

describe("sniffImageType", () => {
  it("recognizes JPEG, PNG and WebP from their first bytes", () => {
    expect(sniffImageType(pad(JPEG))).toBe("image/jpeg");
    expect(sniffImageType(pad(PNG))).toBe("image/png");
    expect(sniffImageType(pad(WEBP))).toBe("image/webp");
  });

  it("does not trust anything else, whatever the file name says", () => {
    expect(sniffImageType(pad([...Buffer.from("<html>")]))).toBeNull();
    expect(sniffImageType(pad([...Buffer.from("%PDF-1.7")]))).toBeNull();
  });
});

describe("checkPhoto", () => {
  it("accepts a normal JPEG", () => {
    expect(checkPhoto(pad(JPEG, 500_000))).toEqual({ ok: true, type: "image/jpeg" });
  });

  it("rejects files over 4 MB", () => {
    expect(checkPhoto(pad(JPEG, MAX_PHOTO_BYTES + 1))).toEqual({ ok: false, error: "too_large" });
  });

  it("rejects empty or tiny files", () => {
    expect(checkPhoto(pad(JPEG, 10))).toEqual({ ok: false, error: "too_small" });
  });

  it("rejects non-images", () => {
    expect(checkPhoto(pad([...Buffer.from("hello world")]))).toEqual({ ok: false, error: "unsupported_type" });
  });
});
