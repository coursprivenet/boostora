"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "@/lib/use-require-auth";
import { api, ApiError } from "@/lib/api";
import { OrderSummary } from "@/lib/types";
import { formatXof } from "@/lib/format";
import { StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";

const ACTIVE_STATUSES = new Set(["QUEUED", "PROCESSING", "SUBMITTING", "RETRY_SUBMIT"]);

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, loading: authLoading } = useRequireAuth();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    api
      .get<OrderSummary>(`/orders/${id}`, token)
      .then(setOrder)
      .catch(() => setError("Commande introuvable."));
  }, [token, id]);

  useEffect(() => {
    load();
    // Poll while the order is still moving through the pipeline — no webhook to push to the browser yet.
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleCancel() {
    if (!token) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.post(`/orders/${id}/cancel`, undefined, token);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Annulation impossible");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRefill() {
    if (!token) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await api.post(`/orders/${id}/refill`, undefined, token);
      load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Refill impossible");
    } finally {
      setActionLoading(false);
    }
  }

  if (authLoading || !token) return null;
  if (error) return <main className="mx-auto max-w-2xl px-6 py-10 text-rose-600">{error}</main>;
  if (!order) return <main className="mx-auto max-w-2xl px-6 py-10 text-ink-400">Chargement…</main>;

  const progress =
    order.startCount != null && order.remains != null
      ? Math.max(0, order.quantity - order.remains)
      : null;
  const isPaid = order.payment?.status === "PAID" || order.payment?.status === "REFUNDED";
  const isRefunded = order.payment?.status === "REFUNDED";

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/dashboard"
        className="mb-6 inline-block text-sm text-ink-500 hover:underline print:hidden"
      >
        ← Mes commandes
      </Link>

      <div className="rounded-xl2 border border-ink-100 bg-white p-6 shadow-soft">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-ink-900">{order.catalogService.name}</h1>
            <p className="mt-1 break-all text-sm text-ink-500">{order.targetLink}</p>
          </div>
          <StatusBadge status={order.orderStatus} />
        </div>

        <dl className="grid grid-cols-2 gap-4 border-t border-ink-100 pt-4 text-sm">
          <div>
            <dt className="text-ink-400">Quantité</dt>
            <dd className="font-medium text-ink-900">{order.quantity.toLocaleString("fr-FR")}</dd>
          </div>
          <div>
            <dt className="text-ink-400">Prix</dt>
            <dd className="font-medium text-ink-900">{formatXof(order.priceClientXof)}</dd>
          </div>
          <div>
            <dt className="text-ink-400">Commandée le</dt>
            <dd className="font-medium text-ink-900">
              {new Date(order.createdAt).toLocaleString("fr-FR")}
            </dd>
          </div>
          {order.completedAt && (
            <div>
              <dt className="text-ink-400">Terminée le</dt>
              <dd className="font-medium text-ink-900">
                {new Date(order.completedAt).toLocaleString("fr-FR")}
              </dd>
            </div>
          )}
          {progress != null && (
            <div className="col-span-2">
              <dt className="text-ink-400">Progression</dt>
              <dd className="mt-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${Math.min(100, (progress / order.quantity) * 100)}%` }}
                  />
                </div>
                <span className="mt-1 block text-xs text-ink-400">
                  {progress.toLocaleString("fr-FR")} / {order.quantity.toLocaleString("fr-FR")}
                </span>
              </dd>
            </div>
          )}
        </dl>

        {ACTIVE_STATUSES.has(order.orderStatus) && (
          <div className="mt-5 border-t border-ink-100 pt-4 print:hidden">
            <Button variant="secondary" loading={actionLoading} onClick={handleCancel}>
              Demander l&apos;annulation
            </Button>
          </div>
        )}

        {order.orderStatus === "COMPLETED" && (
          <div className="mt-5 border-t border-ink-100 pt-4 print:hidden">
            <Button variant="secondary" loading={actionLoading} onClick={handleRefill}>
              Demander un refill
            </Button>
          </div>
        )}

        {actionError && <p className="mt-3 text-sm text-rose-600 print:hidden">{actionError}</p>}
      </div>

      {isPaid && order.payment && (
        <div className="mt-6 rounded-xl2 border border-ink-100 bg-white p-6 shadow-soft print:border-0 print:shadow-none">
          <div className="mb-4 flex items-center justify-between print:hidden">
            <h2 className="text-sm font-semibold text-ink-900">
              Reçu de paiement
              {isRefunded && (
                <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  Remboursé
                </span>
              )}
            </h2>
            <Button variant="secondary" onClick={() => window.print()}>
              Imprimer
            </Button>
          </div>

          <p className="mb-4 hidden text-lg font-semibold text-ink-900 print:block">Boostora — Reçu de paiement</p>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-ink-400">Référence Boostora</dt>
              <dd className="font-mono text-xs font-medium text-ink-900">{order.payment.reference}</dd>
            </div>
            <div>
              <dt className="text-ink-400">Montant payé</dt>
              <dd className="font-medium text-ink-900">{formatXof(order.payment.amountXof)}</dd>
            </div>
            {order.payment.operatorCode && (
              <div>
                <dt className="text-ink-400">Opérateur</dt>
                <dd className="font-medium text-ink-900">{order.payment.operatorCode}</dd>
              </div>
            )}
            {order.paidAt && (
              <div>
                <dt className="text-ink-400">Payé le</dt>
                <dd className="font-medium text-ink-900">
                  {new Date(order.paidAt).toLocaleString("fr-FR")}
                </dd>
              </div>
            )}
            {order.payment.transactionId && (
              <div>
                <dt className="text-ink-400">ID transaction Yengapay</dt>
                <dd className="font-mono text-xs font-medium text-ink-900">
                  {order.payment.transactionId}
                </dd>
              </div>
            )}
            {order.payment.operatorTransactionId && (
              <div>
                <dt className="text-ink-400">ID transaction opérateur</dt>
                <dd className="font-mono text-xs font-medium text-ink-900">
                  {order.payment.operatorTransactionId}
                </dd>
              </div>
            )}
            {isRefunded && order.payment.refundedAt && (
              <>
                <div>
                  <dt className="text-ink-400">Remboursé le</dt>
                  <dd className="font-medium text-ink-900">
                    {new Date(order.payment.refundedAt).toLocaleString("fr-FR")}
                  </dd>
                </div>
                {order.payment.refundAmountXof && (
                  <div>
                    <dt className="text-ink-400">Montant remboursé</dt>
                    <dd className="font-medium text-ink-900">
                      {formatXof(order.payment.refundAmountXof)}
                    </dd>
                  </div>
                )}
                {order.payment.refundReason && (
                  <div className="col-span-2">
                    <dt className="text-ink-400">Motif</dt>
                    <dd className="font-medium text-ink-900">{order.payment.refundReason}</dd>
                  </div>
                )}
              </>
            )}
          </dl>
        </div>
      )}
    </main>
  );
}
