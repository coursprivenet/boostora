"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { useAuth } from "@/lib/auth-context";

const NAV = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/orders", label: "Commandes" },
  { href: "/admin/catalog", label: "Catalogue" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/categories", label: "Catégories" },
  { href: "/admin/exchange-rate", label: "Taux de change" },
  { href: "/admin/users", label: "Utilisateurs" },
  { href: "/admin/audit-logs", label: "Journal d'audit" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useRequireAdmin();
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (loading || !isAdmin) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-ink-50">
      <aside className="flex w-60 shrink-0 flex-col border-r-2 border-ink-900 bg-ink-900 text-white">
        <div className="border-b border-ink-700 p-4">
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

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                pathname === item.href
                  ? "bg-brand-500 text-ink-900"
                  : "text-ink-300 hover:bg-ink-800 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
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

      <main className="min-w-0 flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
