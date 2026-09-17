"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { MobileBottomNav } from "./MobileBottomNav";

/** /admin is its own full-height workspace (see admin/layout.tsx) — it renders no
 * public-site chrome here at all, rather than the public nav/footer with a couple of
 * extra links bolted on. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return <>{children}</>;

  return (
    <>
      <Navbar />
      <div className="flex-1 pb-16 lg:pb-0">{children}</div>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
