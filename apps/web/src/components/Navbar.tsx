"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Button } from "./Button";

export function Navbar() {
  const { user, token, logout, loading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

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

  return (
    <header className="print:hidden border-b-2 border-ink-900 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink-900">
          <span className="h-3 w-3 rounded-sm bg-brand-500" />
          Boostora
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-ink-600">
          <Link href="/" className="hover:text-ink-900">
            Services
          </Link>
          {!loading && user && (
            <Link href="/dashboard" className="hover:text-ink-900">
              Mes commandes
            </Link>
          )}
          {!loading && user && (
            <Link href="/dashboard/support" className="hover:text-ink-900">
              Support
            </Link>
          )}
          {!loading && (user?.role === "ADMIN" || user?.role === "SUPPORT") && (
            <Link href="/support" className="hover:text-ink-900">
              Support (staff)
            </Link>
          )}
          {!loading && user?.role === "ADMIN" && (
            <Link href="/admin" className="hover:text-ink-900">
              Admin
            </Link>
          )}
          {!loading && user && (
            <Link
              href="/dashboard/notifications"
              className="relative flex items-center text-ink-500 hover:text-ink-900"
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
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          )}
          {!loading && !user && (
            <>
              <Link href="/login" className="hover:text-ink-900">
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
            <Link href="/dashboard/account" className="hover:text-ink-900">
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
