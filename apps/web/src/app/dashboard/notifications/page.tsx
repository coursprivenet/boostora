"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/lib/use-require-auth";
import { api } from "@/lib/api";
import { NotificationItem } from "@/lib/types";
import { Button } from "@/components/Button";

export default function NotificationsPage() {
  const { token, loading: authLoading } = useRequireAuth();
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const router = useRouter();

  function load() {
    if (!token) return;
    api.get<NotificationItem[]>("/notifications", token).then(setItems);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function open(n: NotificationItem) {
    if (!token) return;
    if (!n.isRead) await api.patch(`/notifications/${n.id}/read`, undefined, token);
    if (n.link) router.push(n.link);
    else load();
  }

  async function markAllRead() {
    if (!token) return;
    await api.patch("/notifications/read-all", undefined, token);
    load();
  }

  if (authLoading || !token) return null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Notifications</h1>
        <Button variant="secondary" onClick={markAllRead}>
          Tout marquer comme lu
        </Button>
      </div>

      {!items && <p className="text-ink-400">Chargement…</p>}
      {items?.length === 0 && (
        <div className="rounded-xl2 border border-dashed border-ink-200 p-10 text-center text-ink-400">
          Aucune notification pour l&apos;instant.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {items?.map((n) => (
          <button
            key={n.id}
            onClick={() => open(n)}
            className={`rounded-xl2 border p-4 text-left shadow-soft hover:shadow-card ${
              n.isRead ? "border-ink-100 bg-white" : "border-brand-300 bg-brand-300/5"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className={`text-sm ${n.isRead ? "font-medium text-ink-700" : "font-semibold text-ink-900"}`}>
                {n.title}
              </p>
              {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
            </div>
            {n.body && <p className="mt-1 text-sm text-ink-500">{n.body}</p>}
            <p className="mt-2 text-xs text-ink-400">
              {new Date(n.createdAt).toLocaleString("fr-FR")}
            </p>
          </button>
        ))}
      </div>
    </main>
  );
}
