"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "@/lib/use-require-auth";
import { api, ApiError } from "@/lib/api";
import { CatalogItem, CouponPreview, CreateOrderResponse, YengapayOperator } from "@/lib/types";
import { formatXof } from "@/lib/format";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Tooltip } from "@/components/Tooltip";

const SLIDER_STEPS = 1000;

/** Cubic curve: most of the slider's travel maps to the low end of the range, where
 * real orders cluster, while still reaching the service's exact max at the far end —
 * a plain linear slider is useless once max hits the hundreds of thousands. */
function sliderPosToQuantity(pos: number, min: number, max: number) {
  const t = pos / SLIDER_STEPS;
  return Math.round(min + (max - min) * t ** 3);
}
function quantityToSliderPos(quantity: number, min: number, max: number) {
  if (max <= min) return 0;
  const t = (quantity - min) / (max - min);
  return Math.round(Math.cbrt(Math.max(0, t)) * SLIDER_STEPS);
}

type Step =
  | { kind: "form" }
  | { kind: "operator"; created: CreateOrderResponse }
  | { kind: "otp"; created: CreateOrderResponse; operator: YengapayOperator; otpSent: boolean }
  | { kind: "success"; transactionId: string }
  | { kind: "pending"; orderId: string };

export default function CheckoutPage() {
  const { catalogServiceId } = useParams<{ catalogServiceId: string }>();
  const { token, loading: authLoading } = useRequireAuth();
  const router = useRouter();

  const [item, setItem] = useState<CatalogItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [targetLink, setTargetLink] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const [livePrice, setLivePrice] = useState<string | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  const [dripfeedEnabled, setDripfeedEnabled] = useState(false);
  const [dripfeedRuns, setDripfeedRuns] = useState(5);
  const [dripfeedDays, setDripfeedDays] = useState(3);
  const previewRequestId = useRef(0);

  const [couponCode, setCouponCode] = useState("");
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [step, setStep] = useState<Step>({ kind: "form" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkCoupon() {
    if (!token || !item || !couponCode.trim()) return;
    setCouponChecking(true);
    setCouponError(null);
    setCouponPreview(null);
    try {
      const preview = await api.post<CouponPreview>(
        "/coupons/preview",
        { code: couponCode.trim(), catalogServiceId: item.id, quantity },
        token,
      );
      setCouponPreview(preview);
    } catch (err) {
      setCouponError(err instanceof ApiError ? err.message : "Code invalide");
    } finally {
      setCouponChecking(false);
    }
  }

  useEffect(() => {
    api
      .get<CatalogItem>(`/catalog/${catalogServiceId}`)
      .then((data) => {
        setItem(data);
        setQuantity(data.minQuantity);
      })
      .catch(() => setLoadError("Service introuvable ou indisponible."));
  }, [catalogServiceId]);

  // Live price as the client drags the slider or types a quantity — debounced so dragging
  // doesn't fire a request per pixel, and stale responses (slow request overtaken by a
  // newer one) are dropped by comparing against the latest request id.
  useEffect(() => {
    if (!item || !quantity || quantity < item.minQuantity || quantity > item.maxQuantity) {
      setLivePrice(null);
      return;
    }
    const requestId = ++previewRequestId.current;
    setPriceLoading(true);
    const timer = setTimeout(() => {
      api
        .get<{ priceClientXof: string }>(`/catalog/${item.id}/price-preview?quantity=${quantity}`)
        .then((res) => {
          if (previewRequestId.current === requestId) setLivePrice(res.priceClientXof);
        })
        .catch(() => {
          if (previewRequestId.current === requestId) setLivePrice(null);
        })
        .finally(() => {
          if (previewRequestId.current === requestId) setPriceLoading(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [item, quantity]);

  function computedIntervalMinutes(): number | null {
    if (!item || !dripfeedEnabled) return null;
    const raw = Math.round((dripfeedDays * 24 * 60) / dripfeedRuns);
    return item.dripfeedMaxIntervalMinutes ? Math.min(raw, item.dripfeedMaxIntervalMinutes) : raw;
  }

  async function submitOrder(e: FormEvent) {
    e.preventDefault();
    if (!token || !item) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api.post<CreateOrderResponse>(
        "/orders",
        {
          catalogServiceId: item.id,
          targetLink,
          quantity,
          couponCode: couponPreview ? couponCode.trim() : undefined,
          ...(dripfeedEnabled
            ? { dripfeedRuns, dripfeedIntervalMinutes: computedIntervalMinutes() }
            : {}),
          acceptedTerms,
        },
        token,
      );
      setStep({ kind: "operator", created });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de créer la commande");
    } finally {
      setBusy(false);
    }
  }

  function chooseOperator(created: CreateOrderResponse, operator: YengapayOperator) {
    setError(null);
    setStep({ kind: "otp", created, operator, otpSent: false });
  }

  async function sendOtp(created: CreateOrderResponse, operator: YengapayOperator) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(
        `/orders/${created.orderId}/payment/send-otp`,
        { operatorCode: operator.code, countryCode: "BF", customerMSISDN: phone },
        token,
      );
      setStep({ kind: "otp", created, operator, otpSent: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Envoi du code impossible");
    } finally {
      setBusy(false);
    }
  }

  async function confirmPayment(created: CreateOrderResponse, operator: YengapayOperator) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<{ status: string; transactionId?: string }>(
        `/orders/${created.orderId}/payment/confirm`,
        { operatorCode: operator.code, countryCode: "BF", customerMSISDN: phone, otp },
        token,
      );
      if (result.status === "DONE" && result.transactionId) {
        setStep({ kind: "success", transactionId: result.transactionId });
      } else {
        // Yengapay hasn't confirmed synchronously — our webhook will settle it shortly.
        setStep({ kind: "pending", orderId: created.orderId });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Paiement refusé");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || !token) return null;
  if (loadError) return <main className="mx-auto max-w-lg px-6 py-10 text-rose-600">{loadError}</main>;
  if (!item) return <main className="mx-auto max-w-lg px-6 py-10 text-ink-400">Chargement…</main>;

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="text-xl font-semibold text-ink-900">{item.name}</h1>
      <p className="mt-1 text-sm text-ink-500">{item.description}</p>

      <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500">
        Un pic d&apos;activité inhabituel (beaucoup de followers/likes/vues d&apos;un coup) peut être
        repéré par la plateforme visée et entraîner une suppression partielle ou, plus rarement, une
        restriction du compte. Ce n&apos;est pas systématique, mais le risque existe
        {item.dripfeedSupported
          ? " — l'option « Étaler la livraison » ci-dessous le réduit en imitant une croissance naturelle."
          : "."}
      </p>

      {item.riskWarning && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>⚠ {item.riskWarning}</span>
          <Tooltip text="Si le nombre livré baisse après coup (compte suspendu, purge de la plateforme, etc.), ce service ne recompense pas automatiquement — et aucun chiffre n'est garanti à 100%, les réseaux sociaux gardent le contrôle final." />
        </p>
      )}

      <div className="mt-6 rounded-xl2 border border-ink-100 bg-white p-6 shadow-soft">
        {step.kind === "form" && (
          <form onSubmit={submitOrder} className="flex flex-col gap-4">
            <Input
              label="Lien cible (profil, publication, vidéo...)"
              type="url"
              required
              placeholder="https://..."
              value={targetLink}
              onChange={(e) => setTargetLink(e.target.value)}
            />
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium text-ink-700">Quantité</span>
                <input
                  type="number"
                  required
                  min={item.minQuantity}
                  max={item.maxQuantity}
                  value={quantity}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setQuantity(next);
                    setCouponPreview(null);
                  }}
                  className="w-28 rounded-lg border border-ink-200 px-2 py-1.5 text-right text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
              <input
                type="range"
                min={0}
                max={SLIDER_STEPS}
                value={quantityToSliderPos(quantity, item.minQuantity, item.maxQuantity)}
                onChange={(e) => {
                  const next = sliderPosToQuantity(Number(e.target.value), item.minQuantity, item.maxQuantity);
                  setQuantity(next);
                  setCouponPreview(null);
                }}
                className="w-full accent-brand-500"
              />
              <div className="mt-1 flex justify-between text-xs text-ink-400">
                <span>Min {item.minQuantity.toLocaleString("fr-FR")}</span>
                <span>Max {item.maxQuantity.toLocaleString("fr-FR")}</span>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-lg bg-ink-50 px-4 py-3">
                <span className="text-sm text-ink-600">Total à payer</span>
                {priceLoading ? (
                  <span className="text-sm text-ink-400">Calcul…</span>
                ) : livePrice ? (
                  <span className="text-lg font-semibold text-ink-900">{formatXof(livePrice)}</span>
                ) : (
                  <span className="text-sm text-rose-600">Quantité invalide</span>
                )}
              </div>
            </div>

            {item.dripfeedSupported && (
              <div className="rounded-lg border border-ink-100 p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-ink-700">
                  <input
                    type="checkbox"
                    checked={dripfeedEnabled}
                    onChange={(e) => setDripfeedEnabled(e.target.checked)}
                  />
                  Étaler la livraison
                  <Tooltip text="Répartit la livraison en plusieurs lots sur plusieurs jours au lieu de tout livrer d'un coup — réduit le risque que la plateforme détecte un pic anormal d'activité et supprime les followers/likes/vues ou restreigne le compte." />
                </label>
                {dripfeedEnabled && (
                  <div className="mt-3 flex gap-3">
                    <label className="flex-1 text-xs">
                      <span className="mb-1 block text-ink-500">Nombre de lots</span>
                      <input
                        type="number"
                        min={2}
                        max={item.dripfeedMaxRuns ?? 1000}
                        value={dripfeedRuns}
                        onChange={(e) => setDripfeedRuns(Math.max(2, Number(e.target.value)))}
                        className="w-full rounded-lg border border-ink-200 px-2 py-1.5 text-sm"
                      />
                    </label>
                    <label className="flex-1 text-xs">
                      <span className="mb-1 block text-ink-500">Sur combien de jours</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={dripfeedDays}
                        onChange={(e) => setDripfeedDays(Math.max(1, Number(e.target.value)))}
                        className="w-full rounded-lg border border-ink-200 px-2 py-1.5 text-sm"
                      />
                    </label>
                  </div>
                )}
                {dripfeedEnabled && computedIntervalMinutes() != null && (
                  <p className="mt-2 text-xs text-ink-400">
                    ≈ 1 lot toutes les {Math.round((computedIntervalMinutes() ?? 0) / 60)}h
                  </p>
                )}
              </div>
            )}

            <div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Code promo (optionnel)"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      setCouponPreview(null);
                      setCouponError(null);
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  loading={couponChecking}
                  disabled={!couponCode.trim()}
                  onClick={checkCoupon}
                >
                  Vérifier
                </Button>
              </div>
              {couponError && <p className="mt-1 text-sm text-rose-600">{couponError}</p>}
              {couponPreview && (
                <p className="mt-1 text-sm text-emerald-600">
                  Code valide : -{formatXof(couponPreview.discountXof)} — nouveau total{" "}
                  {formatXof(couponPreview.finalPriceXof)}
                </p>
              )}
            </div>

            <label className="flex items-start gap-2 text-sm text-ink-600">
              <input
                type="checkbox"
                required
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                J&apos;ai lu et j&apos;accepte les{" "}
                <Link href="/terms" target="_blank" className="underline hover:text-ink-900">
                  Conditions d&apos;Utilisation
                </Link>{" "}
                et la{" "}
                <Link href="/refund-policy" target="_blank" className="underline hover:text-ink-900">
                  Politique de Remboursement
                </Link>
                .
              </span>
            </label>

            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" loading={busy} disabled={!acceptedTerms} className="w-full">
              Continuer vers le paiement
            </Button>
          </form>
        )}

        {step.kind === "operator" && (
          <div className="flex flex-col gap-3">
            <p className="mb-1 text-sm text-ink-500">
              Total à payer : <strong className="text-ink-900">{formatXof(step.created.priceClientXof)}</strong>
              {Number(step.created.discountXof) > 0 && (
                <span className="ml-1 text-emerald-600">
                  (-{formatXof(step.created.discountXof)} appliqué)
                </span>
              )}
            </p>
            <p className="text-sm font-medium text-ink-700">Choisis ton moyen de paiement :</p>
            {step.created.availableOperators.map((op) => (
              <button
                key={op.code}
                onClick={() => chooseOperator(step.created, op)}
                className="flex items-center justify-between rounded-lg border border-ink-200 px-4 py-3 text-left hover:border-ink-400"
              >
                <span className="font-medium text-ink-900">{op.name}</span>
                <span className="text-xs text-ink-400">{op.countryName}</span>
              </button>
            ))}
            {error && <p className="text-sm text-rose-600">{error}</p>}
          </div>
        )}

        {step.kind === "otp" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-500">
              Paiement via <strong>{step.operator.name}</strong> —{" "}
              {formatXof(step.created.priceClientXof)}
            </p>

            <Input
              label="Numéro de téléphone"
              type="tel"
              required
              placeholder="70707070"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            {step.operator.flow === "ONE_STEP" ? (
              <div className="rounded-lg bg-ink-50 p-3 text-sm text-ink-600">
                Compose <strong>{step.operator.ussdCode}</strong> sur ton téléphone pour recevoir ton
                code, puis saisis-le ci-dessous.
              </div>
            ) : !step.otpSent ? (
              <Button
                variant="secondary"
                loading={busy}
                disabled={!phone}
                onClick={() => sendOtp(step.created, step.operator)}
              >
                Recevoir le code par SMS
              </Button>
            ) : (
              <p className="text-sm text-emerald-600">Code envoyé par SMS.</p>
            )}

            <Input
              label="Code de confirmation (OTP)"
              type="text"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <Button
              loading={busy}
              disabled={!phone || !otp}
              onClick={() => confirmPayment(step.created, step.operator)}
              className="w-full"
            >
              Confirmer le paiement
            </Button>
          </div>
        )}

        {step.kind === "success" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              ✓
            </div>
            <p className="font-medium text-ink-900">Paiement confirmé</p>
            <p className="text-sm text-ink-500">
              Ta commande est en cours de traitement. Réf. transaction : {step.transactionId}
            </p>
            <Button onClick={() => router.push("/dashboard")} className="mt-2">
              Voir mes commandes
            </Button>
          </div>
        )}

        {step.kind === "pending" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              …
            </div>
            <p className="font-medium text-ink-900">Paiement en cours de vérification</p>
            <p className="text-sm text-ink-500">
              L&apos;opérateur confirme le paiement — ça prend généralement quelques instants.
              Ta commande apparaîtra comme payée dès que ce sera fait.
            </p>
            <Button onClick={() => router.push(`/dashboard/orders/${step.orderId}`)} className="mt-2">
              Suivre ma commande
            </Button>
          </div>
        )}
      </div>

      {step.kind !== "success" && step.kind !== "pending" && (
        <Link href="/" className="mt-4 inline-block text-sm text-ink-500 hover:underline">
          ← Retour au catalogue
        </Link>
      )}
    </main>
  );
}
