import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Logo } from "@/components/public/logo";
import { resolveAuthIdentity, isSuperAdmin } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { saveSiteSetting } from "./actions";
import {
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  AlertCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Site settings — Super admin" };

type SettingDef = {
  key: string;
  label: string;
  placeholder: string;
  hint: string;
  type?: "text" | "url" | "email" | "tel";
  multiline?: boolean;
};

const SETTINGS: SettingDef[] = [
  // state_logo_url is rendered separately below with the upload widget.
  {
    key: "state_tagline",
    label: "Tagline",
    placeholder: "Serving Uttar Pradesh's corrugated industry since 1985",
    hint: "Short tagline shown beneath the UPCBMA wordmark on the state landing page.",
  },
  {
    key: "state_office_email",
    label: "State secretariat email",
    placeholder: "secretariat@upcbma.com",
    hint: "Shown on /contact.",
    type: "email",
  },
  {
    key: "state_office_phone",
    label: "State secretariat phone",
    placeholder: "+91 …",
    hint: "Shown on /contact.",
    type: "tel",
  },
  {
    key: "state_office_address",
    label: "State secretariat address",
    placeholder: "Postal address on multiple lines",
    hint: "Shown on /contact. Newlines preserved.",
    multiline: true,
  },
];

export default async function SiteSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;
  const { real } = await resolveAuthIdentity();
  if (!isSuperAdmin(real)) redirect("/admin");

  const svc = createServiceClient();
  // If the migration hasn't been run, this will return an error. We render
  // a "run the migration" banner in that case.
  const { data: rows, error: loadErr } = await svc
    .from("site_settings")
    .select("key, value");

  const valueByKey = new Map<string, string>();
  (rows ?? []).forEach((r) => {
    if (r.value) valueByKey.set(r.key, r.value);
  });

  const migrationMissing = !!loadErr && /relation .* does not exist/i.test(loadErr.message);

  return (
    <>
      <PageHeader
        title="Site settings"
        description="State-level configuration shared across every page of UPCBMA."
      />

      {error && (
        <div className="mb-5 flex gap-3 rounded-sm border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" strokeWidth={1.75} />
          <div className="text-sm text-red-900">{error}</div>
        </div>
      )}
      {ok && (
        <div className="mb-5 flex gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" strokeWidth={1.75} />
          <div className="text-sm text-emerald-900">{ok}</div>
        </div>
      )}

      {migrationMissing && (
        <div className="mb-5 flex gap-3 rounded-sm border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" strokeWidth={1.75} />
          <div className="text-sm text-amber-900">
            <div className="font-semibold">Migration not yet applied</div>
            <p className="mt-1">
              The <code className="font-mono">site_settings</code> table doesn&rsquo;t
              exist yet. Open the{" "}
              <a
                href="https://supabase.com/dashboard/project/edkeagxgdpyzhrhkwcqs/sql/new"
                target="_blank"
                rel="noopener"
                className="underline"
              >
                Supabase SQL editor
              </a>{" "}
              and run <code className="font-mono">migration-site-settings.sql</code>
              {" "}from your <code className="font-mono">outputs</code> folder, then
              reload this page.
            </p>
          </div>
        </div>
      )}

      {/* State logo: live preview + drag-drop / paste-URL upload widget */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-sm border border-border bg-bg">
            <Logo size={64} src={valueByKey.get("state_logo_url")} />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              <ImageIcon className="h-3 w-3" strokeWidth={2} />
              State logo · currently using
            </div>
            <div className="mt-1 break-all font-mono text-xs text-text">
              {valueByKey.get("state_logo_url") ||
                "(bundled fallback at /upcbma-logo.svg)"}
            </div>
            <p className="mt-2 max-w-md text-xs text-muted">
              Used in the header, footer, login page, admin sidebar, and as
              the favicon. Per-chapter logos can override this — set them
              under <strong>Chapters → edit</strong>.
            </p>
          </div>
        </div>

        <form
          action={saveSiteSetting}
          className="mt-5 space-y-4 border-t border-border pt-5"
        >
          <input type="hidden" name="key" value="state_logo_url" />
          {/* The widget writes the resolved URL into a hidden input named
              "value" — exactly what saveSiteSetting expects. */}
          <ImageUploadField
            name="value"
            defaultValue={valueByKey.get("state_logo_url") ?? ""}
            folder="chapters"
            label="Upload a new logo (or paste a URL)"
            hint="PNG, SVG, or JPG. Square crops look best. Leave empty to revert to the bundled fallback."
            aspect="1/1"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm">
              Save state logo
            </Button>
          </div>
        </form>
      </Card>

      {/* Home hero — defaults to the logo so a fresh deployment has
          something on-brand. Admins can swap in an industry photo here. */}
      <Card className="mb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-sm border border-border bg-surface">
            {valueByKey.get("home_hero_url") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={valueByKey.get("home_hero_url")!}
                alt="Home hero preview"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <Logo size={64} src={valueByKey.get("state_logo_url")} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              <ImageIcon className="h-3 w-3" strokeWidth={2} />
              Home page hero · currently using
            </div>
            <div className="mt-1 break-all font-mono text-xs text-text">
              {valueByKey.get("home_hero_url") ||
                "(falling back to the state logo)"}
            </div>
            <p className="mt-2 max-w-md text-xs text-muted">
              Shown on the right side of the state landing page hero. Leave
              empty to keep the logo; upload a photo to feature an industry
              shot or member event instead.
            </p>
          </div>
        </div>

        <form
          action={saveSiteSetting}
          className="mt-5 space-y-4 border-t border-border pt-5"
        >
          <input type="hidden" name="key" value="home_hero_url" />
          <ImageUploadField
            name="value"
            defaultValue={valueByKey.get("home_hero_url") ?? ""}
            folder="chapters"
            label="Upload a hero image (or paste a URL)"
            hint="Tall 4:5 crops look best — the hero panel is taller than it is wide. Leave blank to revert to the logo."
            aspect="4/5"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm">
              Save home hero
            </Button>
          </div>
        </form>
      </Card>

      <div className="space-y-4">
        {SETTINGS.map((s) => (
          <Card key={s.key}>
            <form action={saveSiteSetting} className="space-y-4">
              <input type="hidden" name="key" value={s.key} />
              <Field label={s.label} htmlFor={s.key} hint={s.hint}>
                {s.multiline ? (
                  <textarea
                    id={s.key}
                    name="value"
                    rows={3}
                    defaultValue={valueByKey.get(s.key) ?? ""}
                    placeholder={s.placeholder}
                    className="w-full rounded-sm border border-border bg-bg px-3 py-2 text-sm focus-visible:border-heading focus-visible:outline-none"
                  />
                ) : (
                  <Input
                    id={s.key}
                    name="value"
                    type={s.type ?? "text"}
                    defaultValue={valueByKey.get(s.key) ?? ""}
                    placeholder={s.placeholder}
                  />
                )}
              </Field>
              <div className="flex justify-end">
                <Button type="submit" size="sm">
                  Save {s.label.toLowerCase()}
                </Button>
              </div>
            </form>
          </Card>
        ))}
      </div>
    </>
  );
}
