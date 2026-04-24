import { PublicNav } from "./nav";
import { PublicFooter } from "./footer";

/**
 * Shell used by every public-facing page: sticky nav at top, children in the
 * middle, footer with live office info at the bottom. Kept as a Server
 * Component so the footer can fetch office_info directly on the server.
 */
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      <div className="min-h-[calc(100vh-4rem)]">{children}</div>
      {/* @ts-expect-error Server Component */}
      <PublicFooter />
    </>
  );
}
