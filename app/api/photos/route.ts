import { signingSecret } from "@/lib/env";
import { checkPhoto, EXTENSIONS, MAX_PHOTO_BYTES } from "@/lib/image/validate";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { UploadFieldsSchema } from "@/lib/schemas";
import { signPhoto } from "@/lib/signing";
import { savePhoto } from "@/lib/storage";

export const runtime = "nodejs";

/** Receives ONE photo (multipart: quoteId, side, photo), validates it, stores it, returns a signed reference. */
export async function POST(req: Request) {
  const limit = await rateLimit("photos", req);
  if (!limit.ok) return tooManyRequests(limit.retryAfterSeconds);

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_PHOTO_BYTES + 64 * 1024) return error("too_large", 413);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return error("invalid_form", 400);
  }

  const fields = UploadFieldsSchema.safeParse({ quoteId: form.get("quoteId"), side: form.get("side") });
  const file = form.get("photo");
  if (!fields.success || !(file instanceof File)) return error("invalid_fields", 400);
  if (file.size > MAX_PHOTO_BYTES) return error("too_large", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = checkPhoto(bytes);
  if (!check.ok) return error(check.error, check.error === "too_large" ? 413 : 415);

  const { quoteId, side } = fields.data;
  try {
    const { url } = await savePhoto(`quotes/${quoteId}/${side}.${EXTENSIONS[check.type]}`, Buffer.from(bytes), check.type);
    return Response.json({ url, sig: signPhoto(signingSecret(), quoteId, side, url) });
  } catch (err) {
    console.error("[photos] storage failed", err);
    return error("storage_failed", 502);
  }
}

const error = (code: string, status: number) => Response.json({ error: code }, { status });
