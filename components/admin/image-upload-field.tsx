"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Loader2,
  Upload,
  X,
  Link2,
  Image as ImageIcon,
  FileText,
} from "lucide-react";

/**
 * Reusable image / PDF picker for admin forms.
 *
 *  - Upload area on top: drag/drop or click. Accepts JPG, PNG, WebP, SVG, and
 *    PDF (handy for logos that vendors send as PDFs). Files go straight to
 *    Supabase Storage (`media` bucket) under <folder>/<timestamp>-<rand>-<name>.
 *  - URL field directly below the upload — always visible, so admins can paste
 *    a hosted link instead. Either path resolves to the same hidden input.
 *  - Live preview: images render in an <img>; PDFs render as a labelled chip.
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
  hint = "Wide shots crop best (16:9). Up to ~6 MB.",
  aspect = "16/9",
  acceptPdf = true,
}: {
  name?: string;
  defaultValue?: string | null;
  /** Subfolder inside the `media` bucket — keeps things tidy in Supabase. */
  folder?: "news" | "events" | "agendas" | "chapters" | "misc";
  label?: string;
  hint?: string;
  aspect?: string;
  /** When true, also accept .pdf uploads. Defaults to true. */
  acceptPdf?: boolean;
}) {
  const [url, setUrl] = useState<string>(defaultValue ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const isPdf = /\.pdf(\?|$)/i.test(url);

  async function uploadFile(file: File) {
    if (!file) return;
    const okImage = /^image\//.test(file.type);
    const okPdf = acceptPdf && file.type === "application/pdf";
    if (!okImage && !okPdf) {
      setError(
        acceptPdf
          ? "Pick an image (JPG, PNG, WebP, SVG) or a PDF."
          : "Pick an image file (JPG, PNG, WebP, etc.).",
      );
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
          contentType: file.type || undefined,
        });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      setUrl(data.publicUrl);
    });
  }

  const acceptAttr = acceptPdf ? "image/*,application/pdf" : "image/*";

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </label>

      {/* Hidden field that the enclosing server action reads. */}
      <input type="hidden" name={name} value={url} />

      {/* Live preview — capped to a sensible width so a square logo doesn't
          stretch into a giant tile on a wide form. PDFs render as a chip
          since browsers can't reliably embed them in tiny preview frames. */}
      {url && (
        <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-sm border border-border bg-surface">
          {isPdf ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 px-4 py-6 text-sm text-heading no-underline hover:bg-bg"
            >
              <FileText className="h-8 w-8 text-muted" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">PDF attached</div>
                <div className="truncate text-xs text-muted">{url}</div>
              </div>
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt=""
              style={{ aspectRatio: aspect }}
              className="w-full object-contain"
              onError={() => setError("Couldn't load that image.")}
            />
          )}
          <button
            type="button"
            onClick={() => {
              setUrl("");
              setError(null);
              if (fileInput.current) fileInput.current.value = "";
            }}
            className="absolute right-2 top-2 inline-flex h-7 items-center gap-1 rounded-sm border border-border bg-bg/95 px-2 text-[11px] font-medium text-heading shadow-sm hover:border-heading"
            aria-label="Remove"
          >
            <X className="h-3 w-3" /> Remove
          </button>
        </div>
      )}

      {/* Upload tile — always shown, even when a URL is set, so admins can
          replace one source with the other without removing first. */}
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
          "flex h-28 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed bg-surface px-4 text-center transition-colors sm:h-32 " +
          (dragOver
            ? "border-heading bg-bg"
            : "border-border hover:border-heading hover:bg-bg")
        }
      >
        <input
          ref={fileInput}
          type="file"
          accept={acceptAttr}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadFile(f);
          }}
        />
        {pending ? (
          <>
            <Loader2
              className="h-5 w-5 animate-spin text-muted"
              strokeWidth={2}
            />
            <span className="text-xs text-muted">Uploading…</span>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted" strokeWidth={1.5} />
            <span className="text-sm text-text">
              <span className="font-medium text-heading">Click to upload</span>{" "}
              or drag &amp; drop
            </span>
            <span className="text-[11px] text-muted">
              {acceptPdf ? "JPG, PNG, WebP, SVG, PDF" : "JPG, PNG, WebP, SVG"}{" "}
              · up to 6 MB
            </span>
          </>
        )}
      </label>

      {/* OR — paste a URL. Always visible alongside the uploader. */}
      <div className="flex items-center gap-2 pt-1 text-[11px] uppercase tracking-[0.14em] text-muted">
        <span className="h-px flex-1 bg-border" />
        <span>or paste a link</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="relative">
        <Link2
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
          strokeWidth={2}
        />
        <input
          type="url"
          placeholder="https://example.com/logo.png"
          value={url}
          onChange={(e) => setUrl(e.currentTarget.value)}
          className="block w-full rounded-sm border border-border bg-bg pl-8 pr-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none"
        />
      </div>

      {error ? (
        <p className="flex items-center gap-1.5 text-xs text-danger">
          <ImageIcon className="h-3 w-3" strokeWidth={2} />
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}
