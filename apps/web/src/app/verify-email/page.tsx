"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

type Status = "pending" | "success" | "error";

function VerifyEmailContent() {
  const token = useSearchParams().get("token");
  const [status, setStatus] = useState<Status>("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Lien invalide ou manquant.");
      return;
    }
    api
      .post("/auth/verify-email", { token })
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setError(err instanceof ApiError ? err.message : "Erreur, réessaie");
      });
  }, [token]);

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6 text-center">
      <h1 className="mb-4 text-2xl font-semibold text-ink-900">Confirmation d&apos;email</h1>

      {status === "pending" && <p className="text-sm text-ink-500">Vérification en cours…</p>}

      {status === "success" && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Ton email est confirmé.
        </p>
      )}

      {status === "error" && (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}

      <Link href="/dashboard" className="mt-6 text-sm font-medium text-ink-900 hover:underline">
        Aller à mon tableau de bord
      </Link>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
