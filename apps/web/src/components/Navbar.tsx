"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "./Button";

export function Navbar() {
  const { user, logout, loading } = useAuth();

  return (
    <header className="border-b border-ink-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-ink-900">
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
            <Button variant="secondary" className="!py-2" onClick={logout}>
              Déconnexion
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
