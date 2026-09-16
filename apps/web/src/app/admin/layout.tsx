"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRequireAdmin } from "@/lib/use-require-admin";

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
  const pathname = usePathname();

  if (loading || !isAdmin) return null;

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-6 py-8">
      <aside className="w-48 shrink-0">
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg border-2 px-3 py-2 text-sm font-medium ${
                pathname === item.href
                  ? "border-ink-900 bg-ink-900 text-brand-500"
                  : "border-transparent text-ink-600 hover:border-ink-900 hover:bg-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
