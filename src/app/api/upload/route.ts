/**
 * Image upload endpoint. Accepts a single file (multipart form field "file"),
 * stores it, records an UploadedFile row, and returns the public URL the
 * listing / condition forms then attach.
 */
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStorageConfigured, uploadToStorage, buildStorageKey } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/avif"]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }
  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "Uploads aren't configured. Paste an image URL instead, or set SUPABASE_URL." },
      { status: 501 },
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Unsupported image type." }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is larger than 10MB." }, { status: 413 });
  }

  const bytes = await file.arrayBuffer();
  const key = buildStorageKey(`listings/${session.user.id}/${randomUUID()}`, file.name || "image");

  try {
    const stored = await uploadToStorage(key, bytes, file.type);
    const record = await prisma.uploadedFile.create({
      data: {
        uploaderId: session.user.id,
        url: stored.url,
        storageKey: stored.storageKey,
        mimeType: file.type,
        sizeBytes: file.size,
        kind: "LISTING_IMAGE",
      },
      select: { id: true, url: true },
    });
    return NextResponse.json(record);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
