"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

/** Redirects anyone who isn't ADMIN or SUPPORT — the support desk, unlike /admin, is open to both. */
export function useRequireStaff() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.push("/login");
    else if (user.role !== "ADMIN" && user.role !== "SUPPORT") router.push("/");
  }, [loading, user, router]);

  return { user, token, loading, isStaff: user?.role === "ADMIN" || user?.role === "SUPPORT" };
}
