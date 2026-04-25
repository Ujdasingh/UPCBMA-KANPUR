import { StateNav } from "./state-nav";
import { StateFooter } from "./state-footer";
import { getStateLogoUrl } from "@/lib/site-settings";

export async function StateShell({ children }: { children: React.ReactNode }) {
  const logoSrc = await getStateLogoUrl();
  return (
    <>
      <StateNav logoSrc={logoSrc} />
      <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      <StateFooter logoSrc={logoSrc} />
    </>
  );
}
