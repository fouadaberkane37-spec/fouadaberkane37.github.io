/**
 * Shrinks a phone photo in the browser before it is stored or sent:
 * longest side ≤ 2000 px, JPEG, under ~3.5 MB (the server accepts up to 4 MB).
 */

export const MAX_DIMENSION = 2000;
const TARGET_BYTES = 3.5 * 1024 * 1024;
const QUALITIES = [0.82, 0.72, 0.6, 0.5];

export async function compressPhoto(file: Blob): Promise<Blob> {
  const source = await decode(file);
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_unavailable");
    ctx.drawImage(source.image, 0, 0, width, height);

    let blob: Blob | null = null;
    for (const quality of QUALITIES) {
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= TARGET_BYTES) return blob;
    }
    if (!blob) throw new Error("encode_failed");
    return blob;
  } finally {
    source.release();
  }
}

interface Decoded {
  image: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
}

/** createImageBitmap applies the EXIF rotation; <img> is the fallback for older Safari. */
async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { image: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // fall through
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { image: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}
