"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { TrackingOrderResponse } from "@/lib/types";
import { formatXof } from "@/lib/format";
import { StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/auth-context";

const IN_PROGRESS_STATUSES = new Set([
  "PENDING",
  "QUEUED",
  "PROCESSING",
  "SUBMITTING",
  "IN_PROGRESS",
  "RETRY_SUBMIT",
  "REFILL_REQUESTED",
]);

export default function TrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("key") ?? searchParams.get("token") ?? "";
  const { user, token: authToken } = useAuth();

  const [order, setOrder] = useState<TrackingOrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Refill action
  const [refillLoading, setRefillLoading] = useState(false);
  const [refillMessage, setRefillMessage] = useState<string | null>(null);
  const [refillError, setRefillError] = useState<string | null>(null);

  // Claim account action
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!tokenParam) {
      setError("Clé secrète de suivi manquante dans l'adresse. Vérifie le lien complet reçu.");
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<TrackingOrderResponse>(`/orders/tracking/${tokenParam}`);
      setOrder(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Commande introuvable avec ce lien.");
    } finally {
      setLoading(false);
    }
  }, [tokenParam]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Polling when order is in progress
  useEffect(() => {
    if (!order || !IN_PROGRESS_STATUSES.has(order.orderStatus)) return;
    const timer = setInterval(() => {
      fetchOrder();
    }, 12000);
    return () => clearInterval(timer);
  }, [order, fetchOrder]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  }

  async function handleRefill() {
    if (!tokenParam) return;
    setRefillLoading(true);
    setRefillMessage(null);
    setRefillError(null);
    try {
      await api.post(`/orders/tracking/${tokenParam}/refill`);
      setRefillMessage("Demande de recharge (refill) transmise avec succès ! Nous vérifions et complétons le compte.");
      fetchOrder();
    } catch (err) {
      setRefillError(err instanceof ApiError ? err.message : "Impossible de déclencher le refill");
    } finally {
      setRefillLoading(false);
    }
  }

  async function handleClaim() {
    if (!tokenParam || !authToken) return;
    setClaimLoading(true);
    setClaimError(null);
    try {
      await api.post(`/orders/tracking/${tokenParam}/claim`, {}, authToken);
      setClaimSuccess(true);
      fetchOrder();
    } catch (err) {
      setClaimError(err instanceof ApiError ? err.message : "Impossible de rattacher la commande");
    } finally {
      setClaimLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        <p className="text-sm font-medium text-ink-500">Chargement du suivi en direct…</p>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink-900 bg-rose-100 text-2xl text-rose-600">
          ✕
        </div>
        <h1 className="text-xl font-bold text-ink-900">Lien de suivi invalide</h1>
        <p className="mt-2 text-sm text-ink-600">{error ?? "Commande introuvable."}</p>
        <Link href="/catalogue" className="mt-6 inline-block">
          <Button variant="secondary">Parcourir le catalogue</Button>
        </Link>
      </main>
    );
  }

  const delivered = order.delivered ?? 0;
  const progressPercent =
    order.progressPercent ??
    (order.orderStatus === "COMPLETED" ? 100 : IN_PROGRESS_STATUSES.has(order.orderStatus) ? 15 : 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      {/* Secret link reminder alert */}
      <div className="mb-6 rounded-xl2 border-2 border-ink-900 bg-amber-50 p-4 sm:p-5 shadow-hard">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink-900 bg-brand-500 shadow-soft">
              <svg className="h-5 w-5 text-ink-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-ink-900">
                Conserve précieusement cette page dans tes favoris !
              </p>
              <p className="mt-0.5 text-xs text-ink-700">
                C&apos;est ton lien d&apos;accès direct et secret. Il te permet de suivre l&apos;avancement en direct et d&apos;activer ta garantie refill en cas de chute.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border-2 border-ink-900 bg-white px-3 py-2 text-xs font-bold text-ink-900 shadow-soft transition hover:bg-ink-50 active:scale-95"
          >
            {copied ? (
              <>
                <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Copié !</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 text-ink-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copier le lien</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Order Card */}
      <div className="rounded-xl2 border-2 border-ink-900 bg-white p-5 shadow-hard sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-400">
                {order.platform}
              </span>
            </div>
            <h1 className="mt-1 text-xl font-bold text-ink-900 sm:text-2xl">
              {order.serviceName}
            </h1>
            <a
              href={order.targetLink.startsWith("http") ? order.targetLink : `https://${order.targetLink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block break-all text-xs font-medium text-brand-600 underline hover:text-brand-700"
            >
              {order.targetLink} ↗
            </a>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge status={order.orderStatus} audience="client" />
            <span className="text-sm font-bold text-ink-900">
              {formatXof(order.priceClientXof)}
            </span>
          </div>
        </div>

        {/* Live Progression Bar */}
        <div className="py-6">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold">
            <span className="text-ink-700">Progression de la livraison</span>
            <span className="text-ink-900">
              {order.orderStatus === "COMPLETED"
                ? "100%"
                : order.remains != null
                  ? `${progressPercent}% (${delivered} / ${order.quantity})`
                  : order.orderStatus === "PROCESSING" || order.orderStatus === "IN_PROGRESS"
                    ? "En cours de distribution"
                    : "En attente de démarrage"}
            </span>
          </div>

          <div className="h-3.5 w-full overflow-hidden rounded-full border-2 border-ink-900 bg-ink-100 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                order.orderStatus === "COMPLETED"
                  ? "bg-emerald-500"
                  : order.orderStatus === "CANCELLED" || order.orderStatus === "SUBMIT_FAILED"
                    ? "bg-rose-500"
                    : "animate-pulse bg-brand-500"
              }`}
              style={{ width: `${Math.max(5, Math.min(100, progressPercent))}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-ink-100 bg-ink-50 p-3 sm:grid-cols-4 text-center">
            <div>
              <p className="text-[11px] text-ink-400">Quantité commandée</p>
              <p className="text-sm font-bold text-ink-900">{order.quantity.toLocaleString("fr-FR")}</p>
            </div>
            <div>
              <p className="text-[11px] text-ink-400">Compteur initial</p>
              <p className="text-sm font-bold text-ink-900">
                {order.startCount != null ? order.startCount.toLocaleString("fr-FR") : "—"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-ink-400">Unités livrées</p>
              <p className="text-sm font-bold text-emerald-600">
                {order.remains != null ? delivered.toLocaleString("fr-FR") : order.orderStatus === "COMPLETED" ? order.quantity.toLocaleString("fr-FR") : "En cours"}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-ink-400">Reste à livrer</p>
              <p className="text-sm font-bold text-ink-900">
                {order.remains != null ? order.remains.toLocaleString("fr-FR") : order.orderStatus === "COMPLETED" ? 0 : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Refresh & Timestamps */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4 text-xs text-ink-400">
          <span>Commandé le {new Date(order.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          <button
            type="button"
            onClick={fetchOrder}
            className="inline-flex items-center gap-1.5 font-semibold text-ink-700 hover:text-ink-900"
          >
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>Actualiser le statut</span>
          </button>
        </div>
      </div>

      {/* Refill Section (Strictly explained: only on drop after completion) */}
      <div className="mt-6 rounded-xl2 border-2 border-ink-900 bg-white p-5 shadow-hard sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink-900 bg-ink-900 text-brand-500 shadow-soft">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-ink-900">Garantie & Rechargement (Refill)</h2>
              {order.refillSupported ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                  Garantie incluse
                </span>
              ) : (
                <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-bold text-ink-500">
                  Sans refill
                </span>
              )}
            </div>

            {order.orderStatus === "COMPLETED" ? (
              order.refillSupported ? (
                <div className="mt-2">
                  <p className="text-xs text-ink-600">
                    Ta commande est marquée comme terminée. Tu constates une chute ou une baisse d&apos;abonnés/vues par rapport à ce qui a été livré ? Notre garantie prend le relais gratuitement.
                  </p>

                  {refillMessage && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-800 border border-emerald-200">
                      <svg className="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{refillMessage}</span>
                    </div>
                  )}
                  {refillError && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-800 border border-rose-200">
                      <svg className="h-4 w-4 shrink-0 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{refillError}</span>
                    </div>
                  )}

                  <div className="mt-4">
                    <Button
                      variant="secondary"
                      loading={refillLoading}
                      onClick={handleRefill}
                      className="text-xs"
                    >
                      Demander un rechargement (Refill)
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-ink-500">
                  Ce service spécifique ne dispose pas de bouton de refill selon les règles de la plateforme. En cas de problème anormal, contacte le support.
                </p>
              )
            ) : (
              <p className="mt-2 text-xs text-ink-500">
                La livraison est actuellement en cours. La garantie de rechargement (refill) pourra être sollicitée si tu constates une baisse après que la commande soit complètement terminée.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Account linking / Centralization Card */}
      <div className="mt-6 rounded-xl2 border-2 border-ink-900 bg-brand-50 p-5 shadow-hard sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink-900 bg-white shadow-soft">
            <svg className="h-5 w-5 text-ink-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-ink-900">
              Centraliser toutes mes commandes
            </h2>

            {order.hasAccount ? (
              <div className="mt-1">
                <p className="text-xs text-ink-700">
                  Cette commande est déjà rattachée à un compte client. Retrouve-la à tout moment dans ton espace personnel.
                </p>
                {user && (
                  <Link href="/dashboard" className="mt-3 inline-block">
                    <Button variant="secondary" className="text-xs">
                      Aller à mon tableau de bord →
                    </Button>
                  </Link>
                )}
              </div>
            ) : user ? (
              <div className="mt-1">
                <p className="text-xs text-ink-700">
                  Tu es actuellement connecté avec l&apos;adresse <strong>{user.email}</strong>. Tu peux rattacher cette commande invitée à ton compte en un clic.
                </p>

                {claimSuccess && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-100 p-2.5 text-xs font-semibold text-emerald-800">
                    <svg className="h-4 w-4 shrink-0 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Commande rattachée avec succès à ton compte !</span>
                  </div>
                )}
                {claimError && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-rose-100 p-2.5 text-xs font-semibold text-rose-800">
                    <svg className="h-4 w-4 shrink-0 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{claimError}</span>
                  </div>
                )}

                {!claimSuccess && (
                  <Button
                    loading={claimLoading}
                    onClick={handleClaim}
                    className="mt-3 text-xs"
                  >
                    Rattacher à mon compte ({user.email})
                  </Button>
                )}
              </div>
            ) : (
              <div className="mt-1">
                <p className="text-xs text-ink-700">
                  Tu as commandé en mode invité sans mot de passe. Si tu veux retrouver l&apos;historique de toutes tes commandes, factures et refills à un seul endroit, crée un compte en quelques secondes.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link href={`/register?redirect=/suivi/${order.orderId}?key=${tokenParam}`}>
                    <Button className="text-xs">
                      Créer un compte et centraliser
                    </Button>
                  </Link>
                  <Link href={`/login?redirect=/suivi/${order.orderId}?key=${tokenParam}`}>
                    <Button variant="secondary" className="text-xs">
                      J&apos;ai déjà un compte
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="mt-8 flex justify-center">
        <Link href="/catalogue" className="text-xs font-semibold text-ink-500 hover:text-ink-900 hover:underline">
          ← Découvrir d&apos;autres offres dans le catalogue
        </Link>
      </div>
    </main>
  );
}
