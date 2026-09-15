"use client";

import { useEffect, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { api } from "@/lib/api";
import { AdminOrder } from "@/lib/types";
import { formatXof } from "@/lib/format";
import { StatusBadge } from "@/components/Badge";

export default function AdminOrdersPage() {
  const { token, isAdmin } = useRequireAdmin();
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);

  useEffect(() => {
    if (!token || !isAdmin) return;
    api.get<AdminOrder[]>("/orders/admin", token).then(setOrders);
  }, [token, isAdmin]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink-900">Commandes</h1>

      {!orders && <p className="text-ink-400">Chargement…</p>}

      {orders && (
        <div className="overflow-x-auto rounded-xl2 border border-ink-100 bg-white shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Prix</th>
                <th className="px-4 py-3">Coût</th>
                <th className="px-4 py-3">Marge brute</th>
                <th className="px-4 py-3">Marge nette</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-4 py-3 text-ink-600">{o.user.email}</td>
                  <td className="px-4 py-3 font-medium text-ink-900">{o.catalogService.name}</td>
                  <td className="px-4 py-3 text-ink-900">{formatXof(o.priceClientXof)}</td>
                  <td className="px-4 py-3 text-ink-500">{o.costProviderUsd} USD</td>
                  <td className="px-4 py-3 text-ink-500">{formatXof(o.marginXof)}</td>
                  <td className="px-4 py-3 text-ink-500">
                    {o.netMarginXof != null ? formatXof(o.netMarginXof) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.orderStatus} />
                  </td>
                  <td className="px-4 py-3 text-ink-400">
                    {new Date(o.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && (
            <p className="p-6 text-center text-ink-400">Aucune commande.</p>
          )}
        </div>
      )}
    </div>
  );
}
