"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur, réessaie");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-semibold text-ink-900">Mot de passe oublié</h1>
      <p className="mb-8 text-sm text-ink-500">
        Entre ton email, on t&apos;envoie un lien pour réinitialiser ton mot de passe.
      </p>

      {sent ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Si un compte existe avec cet email, un lien de réinitialisation vient d&apos;être envoyé.
          Vérifie ta boîte mail.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            type="email"
            label="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" loading={loading} className="mt-2 w-full">
            Envoyer le lien
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink-500">
        <Link href="/login" className="font-medium text-ink-900 hover:underline">
          ← Retour à la connexion
        </Link>
      </p>
    </main>
  );
}
