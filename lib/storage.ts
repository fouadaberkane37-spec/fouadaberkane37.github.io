import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { blobToken } from "@/lib/env";

/**
 * Photo storage. Vercel Blob when BLOB_READ_WRITE_TOKEN is set; otherwise a local
 * folder (.data/uploads) for development and the end-to-end tests.
 */

const LOCAL_PREFIX = "local://";
const LOCAL_DIR = path.join(process.cwd(), ".data", "uploads");

export async function savePhoto(pathname: string, bytes: Buffer, contentType: string): Promise<{ url: string }> {
  const token = blobToken();
  if (token) {
    const blob = await put(pathname, bytes, {
      access: "public",
      contentType,
      addRandomSuffix: true, // unguessable URL
      token,
    });
    return { url: blob.url };
  }

  const ext = path.extname(pathname);
  const name = `${pathname.slice(0, pathname.length - ext.length)}-${randomBytes(8).toString("hex")}${ext}`;
  const file = path.join(LOCAL_DIR, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
  return { url: `${LOCAL_PREFIX}${name}` };
}

/** Only call with URLs whose signature was verified (see lib/signing.ts). */
export async function readPhoto(url: string): Promise<Buffer> {
  if (url.startsWith(LOCAL_PREFIX)) {
    const file = path.resolve(LOCAL_DIR, url.slice(LOCAL_PREFIX.length));
    if (!file.startsWith(LOCAL_DIR + path.sep)) throw new Error("Invalid local photo path");
    return readFile(file);
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Could not read photo (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}
