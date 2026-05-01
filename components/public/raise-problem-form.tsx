import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { submitChapterProblem } from "@/app/[slug]/raise-problem-action";
import { AlertTriangle } from "lucide-react";

/**
 * Inline "Raise a problem" form rendered on every chapter's consolidated page.
 * Submissions land in `contact_messages` with `kind = 'problem'` and the
 * chapter_id set, so chapter admins see them under Messages.
 *
 * Server-side, the action also fires email notifications to the active
 * committee email roster — that wiring is in raise-problem-action.ts.
 */
export function RaiseProblemForm({
  chapterSlug,
  chapterCity,
}: {
  chapterSlug: string;
  chapterCity: string;
}) {
  return (
    <Card>
      <form action={submitChapterProblem} className="space-y-5">
        <input type="hidden" name="chapter_slug" value={chapterSlug} />

        <div className="flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0"
            strokeWidth={1.75}
          />
          <span>
            Use this form for actual chapter-level grievances — disputes with
            suppliers, regulatory hassles, lab issues, etc. For general queries
            use the contact details on the left.
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Your name" htmlFor="rp_name" required>
            <Input
              id="rp_name"
              name="name"
              required
              autoComplete="name"
              placeholder="Full name"
            />
          </Field>
          <Field label="Company" htmlFor="rp_company">
            <Input
              id="rp_company"
              name="company"
              autoComplete="organization"
              placeholder="Firm / company"
            />
          </Field>
          <Field label="Email" htmlFor="rp_email">
            <Input
              id="rp_email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
            />
          </Field>
          <Field label="Phone" htmlFor="rp_phone">
            <Input
              id="rp_phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+91 98xxx xxxxx"
            />
          </Field>
        </div>

        <Field label="Subject (one-line summary)" htmlFor="rp_subject" required>
          <Input
            id="rp_subject"
            name="subject"
            required
            placeholder={`E.g. Lab booking confirmation pending — ${chapterCity}`}
          />
        </Field>

        <Field label="Describe the problem" htmlFor="rp_message" required>
          <textarea
            id="rp_message"
            name="message"
            rows={6}
            required
            placeholder="What happened? When? What outcome would help?"
            className="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none"
          />
        </Field>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted">
            Provide at least an email or phone so the committee can reply.
          </p>
          <Button type="submit">Send to committee</Button>
        </div>
      </form>
    </Card>
  );
}
