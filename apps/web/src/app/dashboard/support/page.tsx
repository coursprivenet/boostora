"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/use-require-auth";
import { api, ApiError } from "@/lib/api";
import { TicketSummary } from "@/lib/types";
import { TicketStatusBadge } from "@/components/Badge";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

export default function SupportPage() {
  const { token, loading: authLoading } = useRequireAuth();
  const [tickets, setTickets] = useState<TicketSummary[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    if (!token) return;
    api.get<TicketSummary[]>("/tickets", token).then(setTickets);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/tickets", { subject, body }, token);
      setSubject("");
      setBody("");
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || !token) return null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Support</h1>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Annuler" : "Nouveau ticket"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="mb-6 flex flex-col gap-4 rounded-xl2 border border-ink-100 bg-white p-5 shadow-soft"
        >
          <Input label="Sujet" required value={subject} onChange={(e) => setSubject(e.target.value)} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Message</span>
            <textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </label>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" loading={busy} className="self-start">
            Envoyer
          </Button>
        </form>
      )}

      {!tickets && <p className="text-ink-400">Chargement…</p>}

      {tickets?.length === 0 && !showForm && (
        <div className="rounded-xl2 border border-dashed border-ink-200 p-10 text-center text-ink-400">
          Aucun ticket pour l&apos;instant.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {tickets?.map((t) => (
          <Link
            key={t.id}
            href={`/dashboard/support/${t.id}`}
            className="flex items-center justify-between rounded-xl2 border border-ink-100 bg-white p-4 shadow-soft hover:shadow-card"
          >
            <div>
              <p className="font-medium text-ink-900">{t.subject}</p>
              <p className="mt-0.5 text-sm text-ink-400">
                {t.order ? `Commande: ${t.order.catalogService.name} · ` : ""}
                {new Date(t.updatedAt).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <TicketStatusBadge status={t.status} />
          </Link>
        ))}
      </div>
    </main>
  );
}
