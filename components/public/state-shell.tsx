import { StateNav, type NavMember } from "./state-nav";
import { StateFooter } from "./state-footer";
import { MobileTabBar } from "./mobile-tab-bar";
import { getStateLogoUrl } from "@/lib/site-settings";
import { getAuthedMember } from "@/lib/auth";

export async function StateShell({ children }: { children: React.ReactNode }) {
  const [logoSrc, me] = await Promise.all([
    getStateLogoUrl(),
    getAuthedMember(),
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

  return (
    <>
      <StateNav logoSrc={logoSrc} member={navMember} />
      <div className="min-h-[calc(100vh-4rem)] pb-16 md:pb-0">{children}</div>
      <StateFooter logoSrc={logoSrc} />
      <MobileTabBar signedIn={!!me} />
    </>
  );
}
