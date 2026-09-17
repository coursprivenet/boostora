"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "@/lib/use-require-auth";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { OrderSummary } from "@/lib/types";
import { formatXof } from "@/lib/format";
import { StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";

const ACTIVE_STATUSES = new Set(["QUEUED", "PROCESSING", "SUBMITTING", "RETRY_SUBMIT"]);

const OPERATOR_NAMES: Record<string, string> = {
  ORANGE: "Orange Money",
  MOOV: "Moov Money",
  TELECEL: "Telecel Money",
  SANKM: "Sank Money",
  CORISM: "Coris Money",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, loading: authLoading } = useRequireAuth();
  const { user } = useAuth();
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
    <main className="mx-auto max-w-2xl px-6 py-10 print:max-w-none print:p-0">
      <Link
        href="/dashboard"
        className="mb-6 inline-block text-sm text-ink-500 hover:underline print:hidden"
      >
        ← Mes commandes
      </Link>

      <div className="rounded-xl2 border border-ink-100 bg-white p-6 shadow-soft print:hidden">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-ink-900">{order.catalogService.name}</h1>
            <p className="mt-1 break-all text-sm text-ink-500">{order.targetLink}</p>
          </div>
          <StatusBadge status={order.orderStatus} audience="client" />
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
        <div className="mt-6 rounded-xl2 border border-ink-100 bg-white p-8 shadow-soft print:mt-0 print:border-0 print:p-0 print:shadow-none">
          <div className="mb-6 flex items-center justify-between print:hidden">
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

          <div className="flex items-start justify-between border-b-2 border-ink-900 pb-4">
            <div>
              <p className="flex items-center gap-2 text-xl font-bold text-ink-900">
                <span className="h-3 w-3 rounded-sm bg-brand-500 print:hidden" />
                Wassago
              </p>
              <p className="mt-1 text-xs text-ink-400">Reçu de paiement</p>
            </div>
            {order.paidAt && (
              <p className="text-sm text-ink-500">{new Date(order.paidAt).toLocaleDateString("fr-FR")}</p>
            )}
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-ink-400">Client</p>
            <p className="text-sm font-medium text-ink-900">{user?.email}</p>
          </div>

          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 text-right font-medium">Quantité</th>
                <th className="pb-2 text-right font-medium">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-ink-100">
                <td className="py-3 font-medium text-ink-900">{order.catalogService.name}</td>
                <td className="py-3 text-right text-ink-600">{order.quantity.toLocaleString("fr-FR")}</td>
                <td className="py-3 text-right text-ink-900">{formatXof(order.payment.amountXof)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} className="pt-3 text-right font-semibold text-ink-900">
                  Total payé
                </td>
                <td className="pt-3 text-right text-lg font-bold text-ink-900">
                  {formatXof(order.payment.amountXof)}
                </td>
              </tr>
            </tfoot>
          </table>

          {order.payment.operatorCode && (
            <p className="mt-4 text-xs text-ink-400">
              Payé via {OPERATOR_NAMES[order.payment.operatorCode] ?? order.payment.operatorCode}
            </p>
          )}

          {isRefunded && (
            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              <p className="font-semibold">Remboursé{order.payment.refundedAt && ` le ${new Date(order.payment.refundedAt).toLocaleDateString("fr-FR")}`}</p>
              {order.payment.refundAmountXof && <p>Montant : {formatXof(order.payment.refundAmountXof)}</p>}
              {order.payment.refundReason && <p>Motif : {order.payment.refundReason}</p>}
            </div>
          )}

          <p className="mt-8 border-t border-ink-100 pt-4 text-center text-xs text-ink-400">
            Merci d&apos;avoir choisi Wassago.
          </p>
        </div>
      )}
    </main>
  );
}
