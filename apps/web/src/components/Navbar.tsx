"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Button } from "./Button";

export function Navbar() {
  const { user, token, logout, loading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/dashboard") return pathname === "/dashboard" || pathname.startsWith("/dashboard/orders/");
    return pathname === href;
  }
  function linkClass(href: string) {
    return isActive(href)
      ? "font-semibold text-ink-900 underline decoration-brand-500 decoration-2 underline-offset-4"
      : "text-ink-600 hover:text-ink-900";
  }

  useEffect(() => {
    if (!token) {
      setUnreadCount(0);
      return;
    }
    function poll() {
      api
        .get<{ count: number }>("/notifications/unread-count", token!)
        .then((r) => setUnreadCount(r.count))
        .catch(() => {});
    }
    poll();
    const interval = setInterval(poll, 20_000);
    return () => clearInterval(interval);
  }, [token]);

  const notificationsLink = (
    <Link
      href="/dashboard/notifications"
      className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-brand-100 hover:text-ink-900"
      aria-label="Notifications"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );

  return (
    <header className="print:hidden border-b border-ink-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="shrink-0" aria-label="Wassago, Grandir ensemble">
          {/* eslint-disable-next-line @next/next/no-img-element -- brand logo is a static public asset */}
          <img
            src="/brand/wassago-logo-horizontal.png"
            alt="Wassago, Grandir ensemble"
            className="h-9 w-auto object-contain sm:h-10"
          />
        </Link>
        {!loading && user && (
          <div className="flex items-center gap-2 lg:hidden">
            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className="rounded-full border-2 border-ink-900 bg-brand-500 px-2.5 py-1 text-[11px] font-extrabold text-ink-900 shadow-sm"
              >
                Admin
              </Link>
            )}
            {notificationsLink}
          </div>
        )}
        {!loading && !user && (
          <div className="flex items-center gap-2 lg:hidden">
            <Link
              href="/login"
              className="rounded-lg border-2 border-ink-900 bg-brand-500 px-3 py-1.5 text-xs font-bold text-ink-900 shadow-sm transition active:scale-95"
            >
              Connexion
            </Link>
          </div>
        )}
        <nav className="hidden items-center gap-6 text-sm font-medium text-ink-600 lg:flex">
          <Link href="/" className={linkClass("/")}>
            Accueil
          </Link>
          <Link href="/catalogue" className={linkClass("/catalogue")}>
            Catalogue
          </Link>
          {!loading && user && (
            <Link href="/dashboard" className={linkClass("/dashboard")}>
              Mes commandes
            </Link>
          )}
          {!loading && user && (
            <Link href="/dashboard/support" className={linkClass("/dashboard/support")}>
              Support
            </Link>
          )}
          {!loading && (user?.role === "ADMIN" || user?.role === "SUPPORT") && (
            <Link href="/support" className={linkClass("/support")}>
              Support (staff)
            </Link>
          )}
          {!loading && user?.role === "ADMIN" && (
            <Link href="/admin" className={linkClass("/admin")}>
              Admin
            </Link>
          )}
          {!loading && user && notificationsLink}
          {!loading && !user && (
            <>
              <Link href="/login" className={linkClass("/login")}>
                Connexion
              </Link>
              <Link href="/register">
                <Button variant="primary" className="!py-2">
                  Créer un compte
                </Button>
              </Link>
            </>
          )}
          {!loading && user && (
            <Link href="/dashboard/account" className={linkClass("/dashboard/account")}>
              Mon compte
            </Link>
          )}
          {!loading && user && (
            <Button variant="secondary" className="!py-2" onClick={logout}>
              Déconnexion
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
