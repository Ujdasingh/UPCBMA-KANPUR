import { StateNav } from "./state-nav";
import { StateFooter } from "./state-footer";
import { MobileTabBar } from "./mobile-tab-bar";
import { getStateLogoUrl } from "@/lib/site-settings";
import { getAuthedMember } from "@/lib/auth";

export async function StateShell({ children }: { children: React.ReactNode }) {
  const [logoSrc, me] = await Promise.all([
    getStateLogoUrl(),
    getAuthedMember(),
  ]);
  const signedIn = !!me;

  return (
    <>
      <StateNav logoSrc={logoSrc} />
      <div className="min-h-[calc(100vh-4rem)] pb-16 md:pb-0">{children}</div>
      <StateFooter logoSrc={logoSrc} />
      <MobileTabBar signedIn={signedIn} />
    </>
  );
}
