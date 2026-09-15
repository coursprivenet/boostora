"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { TicketDetail, TicketStatus } from "@/lib/types";
import { TicketStatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";

const STATUS_OPTIONS: TicketStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export function TicketThread({
  ticketId,
  token,
  backHref,
  isStaff,
}: {
  ticketId: string;
  token: string;
  backHref: string;
  isStaff: boolean;
}) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .get<TicketDetail>(`/tickets/${ticketId}`, token)
      .then(setTicket)
      .catch(() => setError("Ticket introuvable."));
  }, [ticketId, token]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  async function sendReply() {
    if (!reply.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/tickets/${ticketId}/messages`, { body: reply }, token);
      setReply("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'envoyer le message");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: TicketStatus) {
    await api.patch(`/tickets/${ticketId}/status`, { status }, token);
    load();
  }

  if (error) return <p className="text-rose-600">{error}</p>;
  if (!ticket) return <p className="text-ink-400">Chargement…</p>;

  return (
    <div>
      <Link href={backHref} className="mb-6 inline-block text-sm text-ink-500 hover:underline">
        ← Retour
      </Link>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink-900">{ticket.subject}</h1>
        <TicketStatusBadge status={ticket.status} />
      </div>

      {isStaff && (
        <div className="mb-6 flex gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              disabled={s === ticket.status}
              className="rounded-lg border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-600 hover:bg-ink-50 disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3">
        {ticket.messages.map((m) => {
          const authorIsStaff = m.author.role === "ADMIN" || m.author.role === "SUPPORT";
          return (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-xl2 p-4 text-sm shadow-soft ${
                authorIsStaff ? "self-start bg-white" : "self-end bg-ink-900 text-white"
              }`}
            >
              <p className="mb-1 text-xs opacity-60">
                {authorIsStaff ? "Support" : m.author.email} ·{" "}
                {new Date(m.createdAt).toLocaleString("fr-FR")}
              </p>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </div>
          );
        })}
      </div>

      {ticket.status !== "CLOSED" ? (
        <div className="flex flex-col gap-3 rounded-xl2 border border-ink-100 bg-white p-4 shadow-soft">
          <textarea
            rows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Écrire une réponse…"
            className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button loading={busy} disabled={!reply.trim()} onClick={sendReply} className="self-start">
            Envoyer
          </Button>
        </div>
      ) : (
        <p className="text-sm text-ink-400">Ce ticket est fermé.</p>
      )}
    </div>
  );
}
