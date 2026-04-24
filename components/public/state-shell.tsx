import { StateNav } from "./state-nav";
import { StateFooter } from "./state-footer";

export function StateShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <StateNav />
      <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      <StateFooter />
    </>
  );
}
