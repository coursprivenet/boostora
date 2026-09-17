"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function CatalogIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function OrdersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 7h12l1 13H5z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}
function SupportIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function AccountIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const items = [
    { href: "/", label: "Accueil", Icon: HomeIcon },
    { href: user ? "/dashboard" : "/login", label: "Commandes", Icon: OrdersIcon },
    { href: "/services", label: "Catalogue", Icon: CatalogIcon, center: true },
    { href: user ? "/dashboard/support" : "/login", label: "Support", Icon: SupportIcon },
    { href: user ? "/dashboard/account" : "/login", label: "Compte", Icon: AccountIcon },
  ];

  if (loading) return null;

  return (
    <nav className="print:hidden fixed inset-x-0 bottom-0 z-40 flex h-[4.75rem] items-end justify-around rounded-t-[1.5rem] bg-white px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-12px_28px_rgba(10,11,15,0.14)] lg:hidden">
      {items.map(({ href, label, Icon, center }) => {
        const active = pathname === href;
        if (center) {
          return (
            <Link
              key={label}
              href={href}
              className="relative z-10 -mt-10 flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-[1.35rem] border-[3px] border-white bg-brand-500 shadow-[0_9px_22px_rgba(10,11,15,0.28)] ring-1 ring-ink-900/15 transition-transform ${active ? "scale-105 ring-4 ring-brand-200" : ""}`}
              >
                <Icon className="h-7 w-7 text-ink-900" />
              </span>
              <span className="text-[11px] font-bold text-ink-900">{label}</span>
            </Link>
          );
        }
        return (
          <Link
            key={label}
            href={href}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1.5 ${active ? "text-ink-900" : "text-ink-400"}`}
          >
            <span className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${active ? "bg-brand-100" : "bg-transparent"}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="truncate text-[11px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
