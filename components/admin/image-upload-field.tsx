"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Upload, X, Link2, Image as ImageIcon } from "lucide-react";

/**
 * Reusable image picker for admin forms.
 *
 *  - Drag/drop or click-to-upload — file goes straight to Supabase Storage
 *    (the `media` bucket) under <folder>/<timestamp>-<random>-<safe-filename>.
 *  - Falls back to a plain "Paste a URL" mode for hot-linking (useful when a
 *    poster is hosted elsewhere or admin already has a CDN link).
 *  - Renders a 16:9 preview that doubles as a "remove" target.
 *  - Submits the resolved URL through a hidden input named `image_url` so the
 *    enclosing <form action={serverAction}> picks it up unchanged.
 *
 * Why client-side upload: keeps server actions tiny and lets us stream large
 * files directly from the browser — no Vercel function timeout risk.
 */
export function ImageUploadField({
  name = "image_url",
  defaultValue = "",
  folder = "misc",
  label = "Cover image",
  hint = "Wide shots crop best (16:9). Up to ~5 MB.",
  aspect = "16/9",
}: {
  name?: string;
  defaultValue?: string | null;
  /** Subfolder inside the `media` bucket — keeps things tidy in Supabase. */
  folder?: "news" | "events" | "agendas" | "chapters" | "misc";
  label?: string;
  hint?: string;
  aspect?: string;
}) {
  const [url, setUrl] = useState<string>(defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function uploadFile(file: File) {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setError("Pick an image file (JPG, PNG, WebP, etc.).");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setError("File is over 6 MB — please compress it first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const safeName = file.name
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .slice(0, 64);
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("media")
        .upload(path, file, {
          cacheControl: "31536000",
          upsert: false,
        });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      setUrl(data.publicUrl);
    });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          {label}
        </label>
        <div className="flex gap-1 text-[10px]">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={
              "rounded-sm border px-1.5 py-0.5 " +
              (mode === "upload"
                ? "border-heading bg-surface text-heading"
                : "border-border bg-bg text-muted hover:text-heading")
            }
          >
            <Upload className="mr-1 inline h-3 w-3" /> Upload
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={
              "rounded-sm border px-1.5 py-0.5 " +
              (mode === "url"
                ? "border-heading bg-surface text-heading"
                : "border-border bg-bg text-muted hover:text-heading")
            }
          >
            <Link2 className="mr-1 inline h-3 w-3" /> Paste URL
          </button>
        </div>
      </div>

      <input type="hidden" name={name} value={url} />

      {/* Live preview */}
      {url ? (
        <div className="relative overflow-hidden rounded-sm border border-border bg-surface">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            style={{ aspectRatio: aspect }}
            className="w-full object-cover"
            onError={() => setError("Couldn't load that image.")}
          />
          <button
            type="button"
            onClick={() => {
              setUrl("");
              setError(null);
              if (fileInput.current) fileInput.current.value = "";
            }}
            className="absolute right-2 top-2 inline-flex h-7 items-center gap-1 rounded-sm border border-border bg-bg/95 px-2 text-[11px] font-medium text-heading shadow-sm hover:border-heading"
            aria-label="Remove image"
          >
            <X className="h-3 w-3" /> Remove
          </button>
        </div>
      ) : mode === "upload" ? (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void uploadFile(f);
          }}
          className={
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed bg-surface px-4 py-8 text-center transition-colors " +
            (dragOver
              ? "border-heading bg-bg"
              : "border-border hover:border-heading hover:bg-bg")
          }
          style={{ aspectRatio: aspect }}
        >
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadFile(f);
            }}
          />
          {pending ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-muted" strokeWidth={2} />
              <span className="text-xs text-muted">Uploading…</span>
            </>
          ) : (
            <>
              <ImageIcon className="h-5 w-5 text-muted" strokeWidth={1.5} />
              <span className="text-sm text-text">
                <span className="font-medium text-heading">Click to upload</span> or drag &amp; drop
              </span>
              <span className="text-[11px] text-muted">JPG, PNG, WebP — up to 6 MB</span>
            </>
          )}
        </label>
      ) : (
        <input
          type="url"
          placeholder="https://…"
          defaultValue={url}
          onBlur={(e) => setUrl(e.currentTarget.value.trim())}
          className="block w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none"
        />
      )}

      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}
