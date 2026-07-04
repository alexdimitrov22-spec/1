"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Collects listing image URLs. Tries the /api/upload endpoint first; if storage
 * isn't configured (501) it flips to "paste a URL" mode so the form still works.
 * Emits one hidden <input name="imageUrls"> per image for the server action.
 */
export function ImageUploader({ name = "imageUrls", initial = [] }: { name?: string; initial?: string[] }) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlMode, setUrlMode] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 501) setUrlMode(true);
          throw new Error(data.error ?? "Upload failed");
        }
        setUrls((prev) => [...prev, data.url]);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function addUrl() {
    const v = urlValue.trim();
    if (!/^https?:\/\//.test(v)) {
      setError("Enter a valid image URL (https://…)");
      return;
    }
    setUrls((prev) => [...prev, v]);
    setUrlValue("");
    setError(null);
  }

  return (
    <div className="space-y-3">
      {urls.map((u) => (
        <input key={u} type="hidden" name={name} value={u} />
      ))}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {urls.map((u, i) => (
          <div key={u} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-muted">
            <Image src={u} alt="" fill sizes="120px" className="object-cover" />
            {i === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/85 px-2 py-0.5 text-[10px] font-medium text-white">
                Cover
              </span>
            )}
            <button
              type="button"
              onClick={() => setUrls((prev) => prev.filter((x) => x !== u))}
              className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-ink/70 text-white opacity-0 transition group-hover:opacity-100"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {!urlMode && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-surface text-muted-fg transition hover:border-accent/50 hover:text-accent"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            <span className="text-xs">Add photo</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />

      {urlMode && (
        <div className="flex gap-2">
          <Input
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder="Paste an image URL (https://…)"
          />
          <Button type="button" variant="outline" onClick={addUrl}>
            <Link2 className="h-4 w-4" /> Add
          </Button>
        </div>
      )}

      {!urlMode && (
        <button
          type="button"
          onClick={() => setUrlMode(true)}
          className="text-xs text-muted-fg underline-offset-2 hover:underline"
        >
          Or paste an image URL instead
        </button>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
