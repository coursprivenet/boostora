"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/admin", label: "Vue d'ensemble", icon: "📊" },
  { href: "/admin/orders", label: "Commandes", icon: "📦" },
  { href: "/admin/catalog", label: "Catalogue", icon: "⚡" },
  { href: "/admin/coupons", label: "Coupons", icon: "🏷️" },
  { href: "/admin/categories", label: "Catégories", icon: "🗂️" },
  { href: "/admin/exchange-rate", label: "Taux de change", icon: "💱" },
  { href: "/admin/users", label: "Utilisateurs", icon: "👥" },
  { href: "/admin/audit-logs", label: "Journal d'audit", icon: "📜" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useRequireAdmin();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (loading || !isAdmin) return null;

  const currentNav = NAV.find((n) => n.href === pathname);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-ink-50 lg:flex-row">
      {/* Mobile Admin Top Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b-2 border-ink-900 bg-ink-900 px-4 text-white lg:hidden">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-sm bg-brand-500" />
          <span className="font-bold text-sm text-white">Admin</span>
          {currentNav && (
            <span className="text-xs text-ink-400 font-medium">· {currentNav.label}</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-700 bg-ink-800 text-white"
          aria-label="Menu administration"
        >
          {mobileMenuOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar (Permanent on Desktop, Slide-over Drawer on Mobile) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r-2 border-ink-900 bg-ink-900 text-white transition-transform duration-200 ease-in-out lg:static lg:w-60 lg:shrink-0 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-ink-700 p-4">
          <div>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs font-medium text-ink-300 hover:text-white"
            >
              ← Retour au site public
            </Link>
            <p className="mt-3 flex items-center gap-2 text-lg font-bold">
              <span className="h-3 w-3 rounded-sm bg-brand-500" />
              Admin
            </p>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-700 text-ink-300 hover:text-white lg:hidden"
            aria-label="Fermer le menu"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-500 text-ink-900 font-bold"
                    : "text-ink-300 hover:bg-ink-800 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-ink-700 p-4">
          <p className="truncate text-xs text-ink-400">{user?.email}</p>
          <button
            onClick={logout}
            className="mt-1.5 text-xs font-semibold text-brand-500 hover:underline"
          >
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content View with responsive padding */}
      <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
