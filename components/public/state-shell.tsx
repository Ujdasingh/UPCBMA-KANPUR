import { StateNav, type NavMember } from "./state-nav";
import { StateFooter } from "./state-footer";
import { MobileTabBar } from "./mobile-tab-bar";
import { getStateLogoUrl } from "@/lib/site-settings";
import { getAuthedMember } from "@/lib/auth";
import { listActiveChapters } from "@/lib/chapter-loader";
import { resolveTier } from "@/lib/tier";

export async function StateShell({ children }: { children: React.ReactNode }) {
  const [logoSrc, me, allChapters] = await Promise.all([
    getStateLogoUrl(),
    getAuthedMember(),
    listActiveChapters(),
  ]);

  // Resolve tier separately — it needs the member id, which we only have
  // after getAuthedMember resolves. Cheap query (one members row +
  // admin_scopes rows for that member).
  const tier = me ? await resolveTier(me.id) : null;

  // Build the slim payload the nav needs — keeps the client component free
  // of any auth library imports and limits leaked surface area.
  // isAdmin now flows from the resolved tier (any tier 1-3 sees the admin
  // panel link) rather than the legacy members.role check, which became
  // wrong after the chapter-admin-tier migration demoted officers to
  // role='member'.
  const navMember: NavMember = me
    ? {
        name: me.name,
        email: me.email,
        photoUrl: me.photo_url ?? null,
        isAdmin: tier?.hasAdminAccess ?? false,
        tierLabel: tier?.label ?? null,
      }
    : null;
  const navChapters = allChapters.map((c) => ({
    slug: c.slug,
    name: c.name,
    city: c.city,
  }));

  return (
    <>
      <StateNav logoSrc={logoSrc} member={navMember} chapters={navChapters} />
      <div className="min-h-[calc(100vh-4rem)] pb-16 md:pb-0">{children}</div>
      <StateFooter logoSrc={logoSrc} className="pb-16 md:pb-0" />
      <MobileTabBar signedIn={!!me} />
    </>
  );
}
