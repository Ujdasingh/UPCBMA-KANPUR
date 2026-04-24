import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { StateShell } from "@/components/public/state-shell";
import { ArrowLeft } from "lucide-react";

export const revalidate = 60;

const tagTone: Record<string, string> = {
  ANNOUNCEMENT: "bg-blue-50 text-blue-900 border-blue-200",
  EVENT: "bg-emerald-50 text-emerald-900 border-emerald-200",
  NOTICE: "bg-amber-50 text-amber-900 border-amber-200",
  UPDATE: "bg-surface text-muted border-border",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const svc = createServiceClient();
  const { data } = await svc.from("news").select("title,body").eq("id", id).is("chapter_id", null).maybeSingle();
  if (!data) return { title: "News — UPCBMA" };
  return { title: `${data.title} — UPCBMA`, description: (data.body ?? "").slice(0, 160) };
}

export default async function StateNewsDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const svc = createServiceClient();
  const { data: item } = await svc
    .from("news")
    .select("id, tag, title, body, published_date, chapter_id")
    .eq("id", id)
    .maybeSingle();
  if (!item || item.chapter_id !== null) notFound();

  return (
    <StateShell>
      <article className="mx-auto max-w-3xl px-6 py-14">
        <Link href="/news" className="inline-flex items-center text-xs font-medium text-muted no-underline hover:text-heading">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" strokeWidth={2} />
          All state news
        </Link>
        <div className="mt-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.18em]">
          <span className={"inline-flex items-center rounded-sm border px-1.5 py-0.5 " + (tagTone[item.tag] ?? tagTone.UPDATE)}>
            {item.tag}
          </span>
          <time className="text-muted">
            {new Date(item.published_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </time>
        </div>
        <h1 className="mt-3 !tracking-tight">{item.title}</h1>
        {item.body && (
          <div className="prose prose-sm mt-8 max-w-none whitespace-pre-wrap text-[15px] leading-relaxed text-text">{item.body}</div>
        )}
      </article>
    </StateShell>
  );
}
