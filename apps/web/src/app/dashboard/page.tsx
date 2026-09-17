"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/use-require-auth";
import { api } from "@/lib/api";
import { OrderSummary } from "@/lib/types";
import { formatXof } from "@/lib/format";
import { StatusBadge } from "@/components/Badge";

const IN_PROGRESS_STATUSES = new Set(["QUEUED", "PROCESSING", "PARTIAL", "SUBMITTING", "RETRY_SUBMIT"]);

export default function DashboardPage() {
  const { token, loading: authLoading } = useRequireAuth();
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    function load() {
      api
        .get<OrderSummary[]>("/orders", token!)
        .then((data) => {
          if (cancelled) return;
          setOrders(data);
          // Keep polling only while at least one order can still move (progress, status) —
          // no point hitting the API every few seconds once everything is in a final state.
          if (data.some((o) => IN_PROGRESS_STATUSES.has(o.orderStatus))) {
            timer = setTimeout(load, 15_000);
          }
        })
        .catch(() => {
          if (!cancelled) setError("Impossible de charger tes commandes.");
        });
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    load();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token]);

  if (authLoading || !token) return null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Mes commandes</h1>
        <Link
          href="/"
          className="rounded-lg bg-ink-900 px-4 py-2 text-sm font-medium text-white hover:bg-ink-800"
        >
          Nouvelle commande
        </Link>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {orders === null && !error && <p className="text-ink-400">Chargement…</p>}

      {orders?.length === 0 && (
        <div className="rounded-xl2 border border-dashed border-ink-200 p-10 text-center text-ink-400">
          Aucune commande pour l&apos;instant.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {orders?.map((order) => {
          const delivered =
            order.startCount != null && order.remains != null
              ? Math.max(0, order.quantity - order.remains)
              : null;
          const percent = delivered != null ? Math.min(100, (delivered / order.quantity) * 100) : null;

          return (
            <Link
              key={order.id}
              href={`/dashboard/orders/${order.id}`}
              className="rounded-xl2 border border-ink-100 bg-white p-4 shadow-soft hover:shadow-card"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink-900">{order.catalogService.name}</p>
                  <p className="mt-0.5 text-sm text-ink-400">
                    {order.quantity.toLocaleString("fr-FR")} unités ·{" "}
                    {new Date(order.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium text-ink-900">{formatXof(order.priceClientXof)}</span>
                  <StatusBadge status={order.orderStatus} audience="client" />
                </div>
              </div>

              {percent != null && (
                <div className="mt-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-ink-400">
                    {delivered!.toLocaleString("fr-FR")} / {order.quantity.toLocaleString("fr-FR")} livrés
                    ({Math.round(percent)}%)
                  </p>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
