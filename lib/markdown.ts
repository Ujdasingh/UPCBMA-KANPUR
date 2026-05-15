/**
 * Strip Markdown syntax for plain-text excerpts.
 *
 * Used by card previews where we want a teaser, not a rendered post.
 * The full-fat <RichBody> component is fine for detail pages, but on
 * cards we line-clamp the body and the raw `**bold**` / `## heading`
 * markers leak through as literal characters. This helper turns the
 * source into clean prose suitable for a one-line dek.
 *
 * It is deliberately regex-based instead of running through `marked` +
 * an HTML-strip: cards render hundreds of times across the homepage,
 * news index, and agendas index, and this is ~50x faster than a parse
 * pass. The patterns cover everything our editors actually write:
 *   - **bold**, __bold__, *italic*, _italic_, ~~strike~~, `code`
 *   - # H1 … ###### H6
 *   - > blockquote (multi-line)
 *   - - / * / + bullets and 1. numbered lists
 *   - [link text](url) → keep "link text"
 *   - ![alt](image) → drop entirely (cards have their own image slot)
 *   - --- horizontal rules
 * After unwrapping it collapses paragraph breaks to single spaces so
 * the line-clamp uses the available rows for meaningful content
 * instead of empty whitespace.
 */
export function stripMarkdown(source: string | null | undefined): string {
  if (!source) return "";
  return source
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // ![alt](img) — drop entirely
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // [text](url) → text
    .replace(/^>+\s?/gm, "") // > blockquote
    .replace(/^#{1,6}\s+/gm, "") // # H1 .. ###### H6
    .replace(/\*\*([^*]+)\*\*/g, "$1") // **bold**
    .replace(/__([^_]+)__/g, "$1") // __bold__
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2") // *italic* (avoid eating ** that escaped above)
    .replace(/(^|[^_])_([^_\n]+)_/g, "$1$2") // _italic_
    .replace(/~~([^~]+)~~/g, "$1") // ~~strike~~
    .replace(/`([^`]+)`/g, "$1") // `code`
    .replace(/^\s*[-*+]\s+/gm, "") // bullets
    .replace(/^\s*\d+\.\s+/gm, "") // numbered lists
    .replace(/^\s*-{3,}\s*$/gm, "") // horizontal rules
    .replace(/\n{2,}/g, " ") // paragraph breaks → space
    .replace(/\s+/g, " ")
    .trim();
}
