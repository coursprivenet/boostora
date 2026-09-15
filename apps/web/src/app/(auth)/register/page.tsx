"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, password, phone || undefined);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-6">
      <h1 className="mb-1 text-2xl font-semibold text-ink-900">Créer un compte</h1>
      <p className="mb-8 text-sm text-ink-500">Commande et suis tes services en quelques clics.</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          type="email"
          label="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="tel"
          label="Téléphone (optionnel)"
          placeholder="70707070"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Input
          type="password"
          label="Mot de passe"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <Button type="submit" loading={loading} className="mt-2 w-full">
          Créer mon compte
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-medium text-ink-900 hover:underline">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
