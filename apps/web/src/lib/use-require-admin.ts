"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

/** Redirects non-admins away — to /login if logged out, to / if logged in as CLIENT/SUPPORT. */
export function useRequireAdmin() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.push("/login");
    else if (user.role !== "ADMIN") router.push("/");
  }, [loading, user, router]);

  return { user, token, loading, isAdmin: user?.role === "ADMIN" };
}
