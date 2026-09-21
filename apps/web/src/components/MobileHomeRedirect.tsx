"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function MobileHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      router.replace("/catalogue");
    }
  }, [router]);

  return null;
}
