"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireStaff } from "@/lib/use-require-staff";
import { api } from "@/lib/api";
import { TicketAdminSummary, TicketStatus } from "@/lib/types";
import { TicketStatusBadge } from "@/components/Badge";

const FILTERS: { label: string; value: TicketStatus | "" }[] = [
  { label: "Tous", value: "" },
  { label: "Ouverts", value: "OPEN" },
  { label: "En cours", value: "IN_PROGRESS" },
  { label: "Résolus", value: "RESOLVED" },
  { label: "Fermés", value: "CLOSED" },
];

export default function StaffSupportPage() {
  const { token, isStaff, loading } = useRequireStaff();
  const [tickets, setTickets] = useState<TicketAdminSummary[] | null>(null);
  const [filter, setFilter] = useState<TicketStatus | "">("");

  useEffect(() => {
    if (!token || !isStaff) return;
    const query = filter ? `?status=${filter}` : "";
    api.get<TicketAdminSummary[]>(`/tickets/admin${query}`, token).then(setTickets);
  }, [token, isStaff, filter]);

  if (loading || !isStaff) return null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-ink-900">Support — tickets</h1>

      <div className="mb-6 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              filter === f.value ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!tickets && <p className="text-ink-400">Chargement…</p>}
      {tickets?.length === 0 && <p className="text-ink-400">Aucun ticket.</p>}

      <div className="flex flex-col gap-3">
        {tickets?.map((t) => (
          <Link
            key={t.id}
            href={`/support/${t.id}`}
            className="flex items-center justify-between rounded-xl2 border border-ink-100 bg-white p-4 shadow-soft hover:shadow-card"
          >
            <div>
              <p className="font-medium text-ink-900">{t.subject}</p>
              <p className="mt-0.5 text-sm text-ink-400">
                {t.user.email} · {t._count.messages} message(s) ·{" "}
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
