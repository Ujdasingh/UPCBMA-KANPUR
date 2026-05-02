import { StateNav, type NavMember } from "./state-nav";
import { StateFooter } from "./state-footer";
import { MobileTabBar } from "./mobile-tab-bar";
import { getStateLogoUrl } from "@/lib/site-settings";
import { getAuthedMember } from "@/lib/auth";
import { listActiveChapters } from "@/lib/chapter-loader";

export async function StateShell({ children }: { children: React.ReactNode }) {
  const [logoSrc, me, allChapters] = await Promise.all([
    getStateLogoUrl(),
    getAuthedMember(),
    listActiveChapters(),
  ]);

  // Build the slim payload the nav needs — keeps the client component free
  // of any auth library imports and limits leaked surface area.
  const navMember: NavMember = me
    ? {
        name: me.name,
        email: me.email,
        photoUrl: me.photo_url ?? null,
        isAdmin: me.role === "admin" || me.role === "super_admin",
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
      <StateFooter logoSrc={logoSrc} />
      <MobileTabBar signedIn={!!me} />
    </>
  );
}
