import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";

/**
 * Renders a body field as Markdown → sanitized HTML.
 *
 * Used for agenda and news bodies so editors can write blog-style posts
 * (headings, lists, blockquotes, links, inline images, tables) instead of
 * being limited to plain text.
 *
 * Plain-text legacy posts (no markdown syntax) still render correctly
 * because marked treats them as a single paragraph.
 *
 * Server-side rendered → no client JS bundle cost. The output goes through
 * DOMPurify so a future RLS gap or compromised editor can't inject script
 * tags. We're trusting the editor's intent (they're committee/admin) but
 * not their string content.
 */
export function RichBody({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  // marked.parse() can return a Promise when async extensions are loaded;
  // we don't load any, so the sync overload is fine.
  const html = marked.parse(source, {
    gfm: true,
    breaks: true, // newlines in source → <br> in output, matches WhatsApp-style writing
  }) as string;

  const safe = DOMPurify.sanitize(html, {
    // Allow images and tables alongside the markdown defaults.
    ADD_TAGS: ["img", "table", "thead", "tbody", "tr", "th", "td"],
    ADD_ATTR: ["target", "rel"],
  });

  return (
    <div
      className={cn(
        // Typography defaults — match the existing prose look but explicit
        // so we don't rely on any plugin being installed.
        "prose prose-sm max-w-none text-[15px] leading-relaxed text-text",
        // Headings
        "[&_h1]:mt-8 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-heading",
        "[&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-heading",
        "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-heading",
        "[&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-heading",
        // Body
        "[&_p]:my-3",
        "[&_strong]:font-semibold [&_strong]:text-heading",
        "[&_em]:italic",
        // Lists
        "[&_ul]:my-3 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1",
        "[&_ol]:my-3 [&_ol]:ml-5 [&_ol]:list-decimal [&_ol]:space-y-1",
        "[&_li]:leading-relaxed",
        // Links
        "[&_a]:text-heading [&_a]:underline [&_a:hover]:text-hover",
        // Quotes
        "[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-rule [&_blockquote]:bg-surface [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:text-muted [&_blockquote]:italic",
        // Tables
        "[&_table]:my-5 [&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
        "[&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-heading",
        "[&_td]:border-b [&_td]:border-border/60 [&_td]:px-3 [&_td]:py-2",
        // Images
        "[&_img]:my-5 [&_img]:rounded-sm [&_img]:border [&_img]:border-border",
        // Code
        "[&_code]:rounded-sm [&_code]:bg-surface [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px]",
        // Horizontal rules
        "[&_hr]:my-8 [&_hr]:border-border",
        className,
      )}
      // Trusted because (a) only authenticated editors can write here, (b)
      // the output is sanitized via DOMPurify above. The dangerously-set
      // name is React being honest about what the API does, not a warning
      // that what we're doing is dangerous in this case.
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
