"use client";

import { Fragment, useEffect, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { api, ApiError } from "@/lib/api";
import { AdminOrder } from "@/lib/types";
import { formatXof } from "@/lib/format";
import { StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";

export default function AdminOrdersPage() {
  const { token, isAdmin } = useRequireAdmin();
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundBusy, setRefundBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<{ id: string; message: string } | null>(null);

  function load() {
    if (!token) return;
    api.get<AdminOrder[]>("/orders/admin", token).then(setOrders);
  }

  useEffect(() => {
    if (!token || !isAdmin) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  function startRefund(o: AdminOrder) {
    setRefundingId(o.id);
    setRefundAmount(o.payment?.amountXof ?? "");
    setRefundReason("");
    setRefundError(null);
  }

  async function confirmRefund(orderId: string) {
    if (!token) return;
    setRefundError(null);
    if (refundReason.trim().length < 3) {
      setRefundError("Motif requis (3 caractères min)");
      return;
    }
    setRefundBusy(true);
    try {
      await api.post(
        `/orders/${orderId}/refund`,
        { amountXof: Number(refundAmount), reason: refundReason.trim() },
        token,
      );
      setRefundingId(null);
      load();
    } catch (err) {
      setRefundError(err instanceof ApiError ? err.message : "Remboursement impossible");
    } finally {
      setRefundBusy(false);
    }
  }

  async function retrySubmission(orderId: string) {
    if (!token) return;
    setRetryingId(orderId);
    setRetryError(null);
    try {
      await api.post(`/orders/${orderId}/submit-to-provider`, {}, token);
      load();
    } catch (err) {
      setRetryError({ id: orderId, message: err instanceof ApiError ? err.message : "Échec de la nouvelle tentative" });
    } finally {
      setRetryingId(null);
    }
  }

  async function exportCsv() {
    if (!token) return;
    setExporting(true);
    try {
      await api.downloadFile("/orders/admin/export.csv", `commandes-${Date.now()}.csv`, token);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Commandes</h1>
        <Button variant="secondary" loading={exporting} onClick={exportCsv}>
          Exporter CSV
        </Button>
      </div>

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
                <th className="px-4 py-3">Paiement</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <Fragment key={o.id}>
                  <tr className="border-b border-ink-50 last:border-0">
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
                      {(o.orderStatus === "SUBMIT_FAILED" || o.orderStatus === "RETRY_SUBMIT") && (
                        <div className="mt-1.5">
                          {o.errorLog?.message && (
                            <p className="max-w-[180px] text-xs text-rose-600">{o.errorLog.message}</p>
                          )}
                          <Button
                            variant="secondary"
                            className="!py-1 !px-2 mt-1 text-xs"
                            loading={retryingId === o.id}
                            onClick={() => retrySubmission(o.id)}
                          >
                            Réessayer
                          </Button>
                          {retryError?.id === o.id && (
                            <p className="mt-1 text-xs text-rose-600">{retryError.message}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-400">
                      {new Date(o.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      {o.payment?.status === "PAID" && (
                        <Button variant="secondary" className="!py-1 !px-2 text-xs" onClick={() => startRefund(o)}>
                          Rembourser
                        </Button>
                      )}
                      {o.payment?.status === "REFUNDED" && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Remboursé
                        </span>
                      )}
                    </td>
                  </tr>
                  {refundingId === o.id && (
                    <tr className="border-b border-ink-50 bg-ink-50">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="flex flex-wrap items-end gap-3">
                          <label className="text-xs">
                            <span className="mb-1 block text-ink-500">Montant (FCFA)</span>
                            <input
                              type="number"
                              value={refundAmount}
                              onChange={(e) => setRefundAmount(e.target.value)}
                              className="w-32 rounded-lg border border-ink-200 px-2 py-1.5 text-sm"
                            />
                          </label>
                          <label className="flex-1 text-xs" style={{ minWidth: 220 }}>
                            <span className="mb-1 block text-ink-500">Motif</span>
                            <input
                              type="text"
                              value={refundReason}
                              onChange={(e) => setRefundReason(e.target.value)}
                              placeholder="ex: commande non livrée par le fournisseur"
                              className="w-full rounded-lg border border-ink-200 px-2 py-1.5 text-sm"
                            />
                          </label>
                          <Button
                            variant="primary"
                            className="!py-1.5"
                            loading={refundBusy}
                            onClick={() => confirmRefund(o.id)}
                          >
                            Confirmer
                          </Button>
                          <Button
                            variant="secondary"
                            className="!py-1.5"
                            onClick={() => setRefundingId(null)}
                          >
                            Annuler
                          </Button>
                        </div>
                        {refundError && <p className="mt-2 text-sm text-rose-600">{refundError}</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
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
