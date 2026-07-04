/**
 * Storage — uploads image/document bytes to Supabase Storage (default) or S3.
 *
 * Kept dependency-free: talks to the Supabase Storage REST API with the service
 * role key rather than pulling in the full SDK. If no storage backend is
 * configured, `isStorageConfigured()` returns false and callers fall back to
 * accepting image URLs directly, so the app still works in a bare dev setup.
 */

export function isStorageConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export interface StoredObject {
  url: string;
  storageKey: string;
}

const SAFE = /[^a-zA-Z0-9._-]/g;

export function buildStorageKey(prefix: string, filename: string) {
  const clean = filename.replace(SAFE, "-").slice(-80);
  // No Date.now()/random needed here — callers pass a unique prefix (e.g. a cuid).
  return `${prefix}/${clean}`;
}

export async function uploadToStorage(
  key: string,
  bytes: ArrayBuffer,
  contentType: string,
): Promise<StoredObject> {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "revio";

  if (!url || !serviceKey) {
    throw new Error("Storage is not configured (set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).");
  }

  const endpoint = `${url.replace(/\/$/, "")}/storage/v1/object/${bucket}/${key}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": contentType,
      "x-upsert": "true",
      "cache-control": "3600",
    },
    body: bytes,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`Upload failed (${res.status}): ${detail}`);
  }

  const publicUrl = `${url.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${key}`;
  return { url: publicUrl, storageKey: `${bucket}/${key}` };
}
