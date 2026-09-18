"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "@/lib/use-require-auth";
import { api, ApiError } from "@/lib/api";
import { CatalogItem, CouponPreview, CreateOrderResponse, YengapayOperator } from "@/lib/types";
import { formatXof } from "@/lib/format";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Tooltip } from "@/components/Tooltip";

const SLIDER_STEPS = 1000;
const PAYMENT_COUNTRIES = [
  { code: "BF", name: "Burkina Faso" },
  { code: "CI", name: "Côte d’Ivoire" },
  { code: "BJ", name: "Bénin" },
  { code: "OTHER", name: "Autre pays" },
] as const;

/** Cubic curve: most of the slider's travel maps to the low end of the range, where
 * real orders cluster, while still reaching the service's exact max at the far end —
 * a plain linear slider is useless once max hits the hundreds of thousands. */
function sliderPosToQuantity(pos: number, min: number, max: number) {
  const t = pos / SLIDER_STEPS;
  const raw = min + (max - min) * t ** 3;
  if (raw <= min) return min;
  if (raw >= max) return max;
  // Steps of 100 in between — exact min/max stay reachable even when they aren't
  // themselves multiples of 100.
  return Math.round(raw / 100) * 100;
}
function quantityToSliderPos(quantity: number, min: number, max: number) {
  if (max <= min) return 0;
  const t = (quantity - min) / (max - min);
  return Math.round(Math.cbrt(Math.max(0, t)) * SLIDER_STEPS);
}
// Most real orders are well under 100k — capping the slider's practical ceiling there
// (instead of the service's raw max, which can run into the millions) keeps every pixel
// of drag meaningful. Typing a bigger number in the input field still works past this cap.
function sliderMaxFor(itemMax: number) {
  return Math.min(itemMax, 100000);
}
// Platform-wide floor: 200 units, even when a provider's own minimum is lower — a
// service's raw min (sometimes 1, 5, 10...) isn't a real-world useful order size.
function effectiveMinFor(itemMin: number) {
  return Math.max(itemMin, 200);
}

/** Bigger orders are more visible as a sudden spike, so they get a longer recommended
 * spread — pure heuristic, not from PanelFollows or any external data. */
function recommendedDripfeedDays(quantity: number) {
  if (quantity <= 500) return 1;
  if (quantity <= 2000) return 2;
  if (quantity <= 5000) return 3;
  if (quantity <= 20000) return 5;
  if (quantity <= 50000) return 7;
  if (quantity <= 100000) return 10;
  return 14;
}
/** Mirrors the server's minDripfeedDaysFor (orders.service.ts) — above 10k units,
 * spreading the delivery isn't optional. Kept in sync manually with the backend. */
function mandatoryMinDripfeedDays(quantity: number) {
  if (quantity <= 10000) return 0;
  if (quantity <= 20000) return 5;
  if (quantity <= 50000) return 7;
  if (quantity <= 100000) return 10;
  return 14;
}
function recommendedDripfeedRuns(days: number, maxRuns: number) {
  const runs = Math.max(2, days * 2); // roughly one batch every 12h
  return Math.min(runs, maxRuns);
}

type Step =
  | { kind: "form" }
  | { kind: "country"; created: CreateOrderResponse }
  | { kind: "operator"; created: CreateOrderResponse }
  | { kind: "otp"; created: CreateOrderResponse; operator: YengapayOperator; otpSent: boolean }
  | { kind: "success"; transactionId: string }
  | { kind: "pending"; orderId: string };

function PaymentOperatorMark({ operator }: { operator: YengapayOperator }) {
  const marks: Record<string, { src: string; alt: string }> = {
    ORANGE: { src: "https://developer.orange.com/od-uploads/Orange_Money_36ecm95i.png", alt: "Orange Money" },
    MOOV: { src: "/payments/moov-money.png", alt: "Moov Money" },
    CORISM: { src: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/ed/99/b0/ed99b08b-7e7a-0de3-a9ee-9ec18790e085/AppIcon-0-1x_U007emarketing-0-8-0-85-220-0.png/1200x630wa.png", alt: "Coris Money" },
    SANKM: { src: "https://app.sankmoney.com/static/media/Sank_red.0bd112c047b134883b71.png", alt: "Sank Money" },
    TELECEL: { src: "/payments/telecel-money-mark.png", alt: "Telecel Money" },
  };
  const mark = marks[operator.code];

  if (mark) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink-900 bg-white p-1">
        <img src={mark.src} alt={mark.alt} className="h-full w-full object-contain" />
      </span>
    );
  }

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink-900 bg-white text-sm font-bold text-ink-900">
      {operator.name.charAt(0)}
    </span>
  );
}

type PaymentResume = CreateOrderResponse & { catalogServiceId: string };

const STEP_INDEX: Record<Step["kind"], number> = {
  form: 0,
  country: 1,
  operator: 1,
  otp: 1,
  success: 2,
  pending: 2,
};
const STEP_LABELS = ["Détails", "Paiement", "Confirmation"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-6 flex items-center print:hidden">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex flex-1 items-center last:flex-none">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                i < current
                  ? "border-ink-900 bg-ink-900 text-brand-500"
                  : i === current
                    ? "border-ink-900 bg-brand-500 text-ink-900"
                    : "border-ink-200 bg-white text-ink-300"
              }`}
            >
              {i < current ? "✓" : i + 1}
            </span>
            <span className={`hidden text-xs font-medium sm:inline ${i <= current ? "text-ink-900" : "text-ink-300"}`}>
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className={`mx-3 h-0.5 flex-1 ${i < current ? "bg-ink-900" : "bg-ink-100"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function CheckoutPage() {
  const { catalogServiceId } = useParams<{ catalogServiceId: string }>();
  const searchParams = useSearchParams();
  const resumeOrderId = searchParams.get("resume");
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
  // Keep the draft text separate from the numeric value: on touch devices a controlled
  // number input must be allowed to be empty while its current value is being replaced.
  const [dripfeedRunsInput, setDripfeedRunsInput] = useState("5");
  const [dripfeedDays, setDripfeedDays] = useState(3);
  const previewRequestId = useRef(0);

  const [couponsExist, setCouponsExist] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponPreview, setCouponPreview] = useState<CouponPreview | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponChecking, setCouponChecking] = useState(false);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [paymentCountryCode, setPaymentCountryCode] = useState<string | null>("BF");

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
        setQuantity(effectiveMinFor(data.minQuantity));
      })
      .catch(() => setLoadError("Service introuvable ou indisponible."));
    // No point rendering a "code promo" dead end while nothing exists to redeem.
    api
      .get<{ exists: boolean }>("/coupons/exists")
      .then((r) => setCouponsExist(r.exists))
      .catch(() => setCouponsExist(false));
  }, [catalogServiceId]);

  // A resumed checkout uses the payment intent originally opened for this order. It
  // cannot silently create a new order, and the API rejects expired/paid intents.
  useEffect(() => {
    if (!token || !resumeOrderId) return;
    let cancelled = false;

    api
      .get<PaymentResume>(`/orders/${resumeOrderId}/payment/resume`, token)
      .then((resume) => {
        if (cancelled) return;
        if (resume.catalogServiceId !== catalogServiceId) {
          router.replace(`/checkout/${resume.catalogServiceId}?resume=${resume.orderId}`);
          return;
        }
        if (resume.checkoutUrl) {
          window.location.assign(resume.checkoutUrl);
          return;
        }
        openCountrySelection(resume);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Impossible de reprendre ce paiement");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [catalogServiceId, resumeOrderId, router, token]);

  // Live price as the client drags the slider or types a quantity — debounced so dragging
  // doesn't fire a request per pixel, and stale responses (slow request overtaken by a
  // newer one) are dropped by comparing against the latest request id.
  useEffect(() => {
    if (!item || !quantity || quantity < effectiveMinFor(item.minQuantity) || quantity > item.maxQuantity) {
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

  // Above 10k units, spreading delivery stops being optional — the server rejects the
  // order otherwise (orders.service.ts, minDripfeedDaysFor). Force the toggle on and
  // clamp the day count up to the mandatory floor whenever the quantity crosses it.
  const mandatoryDays = item ? mandatoryMinDripfeedDays(quantity) : 0;
  // The provider's minimum applies to every batch, not the combined total. Limit
  // the picker accordingly so the UI cannot produce an invalid provider request.
  const maxDripfeedRunsForQuantity = item
    ? Math.min(item.dripfeedMaxRuns ?? 1000, Math.floor(quantity / item.minQuantity))
    : 1;
  const canUseDripfeed = maxDripfeedRunsForQuantity >= 2;
  useEffect(() => {
    if (mandatoryDays === 0 || !item?.dripfeedSupported) return;
    setDripfeedEnabled(true);
    setDripfeedDays((d) => {
      const next = Math.max(d, mandatoryDays);
      setDripfeedRuns((r) => Math.min(maxDripfeedRunsForQuantity, Math.max(r, recommendedDripfeedRuns(next, maxDripfeedRunsForQuantity))));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mandatoryDays, item?.dripfeedSupported, maxDripfeedRunsForQuantity]);

  useEffect(() => {
    if (dripfeedEnabled && dripfeedRuns > maxDripfeedRunsForQuantity && canUseDripfeed) {
      setDripfeedRuns(maxDripfeedRunsForQuantity);
    }
  }, [canUseDripfeed, dripfeedEnabled, dripfeedRuns, maxDripfeedRunsForQuantity]);

  useEffect(() => {
    setDripfeedRunsInput(String(dripfeedRuns));
  }, [dripfeedRuns]);

  function normalizeDripfeedRuns() {
    const max = Math.max(2, maxDripfeedRunsForQuantity);
    const parsed = Number(dripfeedRunsInput);
    const valid = Number.isFinite(parsed) ? parsed : 2;
    setDripfeedRuns(Math.min(max, Math.max(2, Math.round(valid))));
  }

  function computedIntervalMinutes(): number | null {
    if (!item || !dripfeedEnabled) return null;
    // The first batch starts immediately; there are runs - 1 gaps to fill.
    return Math.round((dripfeedDays * 24 * 60) / Math.max(1, dripfeedRuns - 1));
  }

  async function submitOrder(e: FormEvent) {
    e.preventDefault();
    if (!token || !item) return;
    if (dripfeedEnabled) {
      if (!canUseDripfeed) {
        setError(`Choisis au moins ${item.minQuantity * 2} unités pour répartir cette commande en 2 lots.`);
        return;
      }
      if (quantity % dripfeedRuns !== 0) {
        setError(`La quantité doit être divisible par ${dripfeedRuns} pour créer des lots égaux.`);
        return;
      }
    }
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
          paymentCountryCode,
        },
        token,
      );
      openCountrySelection(created);
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

  function openCountrySelection(created: CreateOrderResponse) {
    setPaymentCountryCode((current) => current ?? created.availableOperators[0]?.countryCode ?? "OTHER");
    setStep({ kind: "operator", created });
  }

  const paymentSelection = step.kind === "country" || step.kind === "operator" ? step.created : null;
  const paymentCountries = paymentSelection
    ? Array.from(new Map(paymentSelection.availableOperators.map((operator) => [operator.countryCode, {
      code: operator.countryCode,
      name: operator.countryName,
      flagUrl: operator.flagUrl,
    }])).values())
    : [];
  const displayedOperators = step.kind === "operator" && paymentCountryCode
    ? step.created.availableOperators.filter((operator) => operator.countryCode === paymentCountryCode)
    : step.kind === "operator" ? step.created.availableOperators : [];

  async function chooseHostedCheckout(orderId: string) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const { checkoutUrl } = await api.post<{ checkoutUrl: string }>(`/orders/${orderId}/payment/checkout`, {}, token);
      window.location.assign(checkoutUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'ouvrir le paiement sécurisé");
      setBusy(false);
    }
  }

  async function chooseCryptomusPayment(orderId: string) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const { checkoutUrl } = await api.post<{ checkoutUrl: string }>(`/orders/${orderId}/payment/crypto`, {}, token);
      window.location.assign(checkoutUrl);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Le paiement crypto est temporairement indisponible");
      setBusy(false);
    }
  }

  async function sendOtp(created: CreateOrderResponse, operator: YengapayOperator) {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(
        `/orders/${created.orderId}/payment/send-otp`,
        { operatorCode: operator.code, countryCode: operator.countryCode, customerMSISDN: phone },
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
        { operatorCode: operator.code, countryCode: operator.countryCode, customerMSISDN: phone, otp },
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
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="lg:grid lg:grid-cols-[1fr_1.1fr] lg:gap-12">
        <div className="hidden lg:flex lg:h-full lg:items-center lg:justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static illustration asset */}
          <img
            src="/illustrations/checkout/mascot.svg"
            alt=""
            className="animate-hero-float w-full max-w-md"
            style={{ animationDuration: "6s" }}
          />
        </div>
        <div className="mx-auto max-w-lg lg:mx-0 lg:max-w-none">
          <StepIndicator current={STEP_INDEX[step.kind]} />

          <div className="rounded-xl2 border-2 border-ink-900 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-lg font-semibold text-ink-900">{item.name}</h1>
              {item.riskWarning && (
                <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                  Sans refill
                </span>
              )}
            </div>
            {item.description && <p className="mt-1 text-sm text-ink-500">{item.description}</p>}

            <div className="mt-3 flex flex-col gap-2 border-t border-ink-100 pt-3">
              <div className="flex items-start gap-2 text-xs text-ink-500">
                <span aria-hidden>⚠️</span>
                <span>
                  Un pic d&apos;activité inhabituel peut être repéré par la plateforme visée et
                  entraîner une suppression partielle du résultat, ou plus rarement une restriction
                  du compte
                  {item.dripfeedSupported ? " — étale la livraison ci-dessous pour réduire ce risque." : "."}
                </span>
              </div>
              {item.riskWarning && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span>{item.riskWarning}</span>
                  <Tooltip text="Si le nombre livré baisse après coup (compte suspendu, purge de la plateforme, etc.), ce service ne recompense pas automatiquement — et aucun chiffre n'est garanti à 100%, les réseaux sociaux gardent le contrôle final." />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-xl2 border-2 border-ink-900 bg-white p-6">
            {step.kind === "form" && (
              <form onSubmit={submitOrder} className="flex flex-col gap-5">
                <Input
                  label="Lien cible (profil, publication, vidéo...)"
                  type="url"
                  required
                  placeholder="https://..."
                  value={targetLink}
                  onChange={(e) => setTargetLink(e.target.value)}
                />

                <div className="rounded-xl2 bg-ink-50 p-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-ink-700">Quantité</span>
                    <input
                      type="number"
                      required
                      min={effectiveMinFor(item.minQuantity)}
                      max={item.maxQuantity}
                      value={quantity}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setQuantity(next);
                        setCouponPreview(null);
                      }}
                      className="w-28 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-right text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={SLIDER_STEPS}
                    value={quantityToSliderPos(quantity, effectiveMinFor(item.minQuantity), sliderMaxFor(item.maxQuantity))}
                    onChange={(e) => {
                      const next = sliderPosToQuantity(
                        Number(e.target.value),
                        effectiveMinFor(item.minQuantity),
                        sliderMaxFor(item.maxQuantity),
                      );
                      setQuantity(next);
                      setCouponPreview(null);
                    }}
                    className="w-full accent-brand-500"
                  />
                  <div className="mt-1 flex justify-between text-xs text-ink-400">
                    <span>Min {effectiveMinFor(item.minQuantity).toLocaleString("fr-FR")}</span>
                    <span>
                      Max {sliderMaxFor(item.maxQuantity).toLocaleString("fr-FR")}
                      {item.maxQuantity > 100000 && " (curseur) — saisis un nombre plus grand si besoin"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-lg border-2 border-ink-900 bg-brand-500 px-4 py-3">
                    <span className="text-sm font-semibold text-ink-900">Total à payer</span>
                    {priceLoading ? (
                      <span className="text-sm text-ink-700">Calcul…</span>
                    ) : livePrice ? (
                      <span className="text-xl font-bold text-ink-900">{formatXof(livePrice)}</span>
                    ) : (
                      <span className="text-sm text-rose-700">Quantité invalide</span>
                    )}
                  </div>
                </div>

                {mandatoryDays > 0 && !item.dripfeedSupported && (
                  <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    Cette quantité dépasse 10 000 unités — ce service ne supporte pas la livraison
                    échelonnée, obligatoire au-delà de ce seuil. Réduis la quantité ou choisis une
                    autre offre.
                  </p>
                )}

                {item.dripfeedSupported && (
                  <div
                    className={`rounded-xl2 border p-4 ${dripfeedEnabled ? "border-brand-500 bg-brand-300/10" : "border-ink-100"}`}
                  >
                    <label
                      className={`flex items-center gap-2 text-sm font-medium text-ink-700 ${mandatoryDays > 0 ? "opacity-70" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={dripfeedEnabled}
                        disabled={mandatoryDays > 0 || !canUseDripfeed}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          setDripfeedEnabled(enabled);
                          if (enabled) {
                            const recDays = recommendedDripfeedDays(quantity);
                            setDripfeedDays(recDays);
                            setDripfeedRuns(recommendedDripfeedRuns(recDays, maxDripfeedRunsForQuantity));
                          }
                        }}
                      />
                      Étaler la livraison
                      <Tooltip text="Répartit la livraison en plusieurs lots sur plusieurs jours au lieu de tout livrer d'un coup — réduit le risque que la plateforme détecte un pic anormal d'activité et supprime les followers/likes/vues ou restreigne le compte." />
                    </label>
                    <p className="mt-1 text-xs text-ink-400">
                      {mandatoryDays > 0
                        ? `Obligatoire au-delà de 10 000 unités — minimum ${mandatoryDays} jours pour cette quantité.`
                        : "Plus la livraison est étalée dans le temps, plus faible est la probabilité que les followers/likes/vues chutent après coup."}
                    </p>
                    {!canUseDripfeed && (
                      <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Cette quantité ne permet pas encore deux lots valides. Minimum : {(item.minQuantity * 2).toLocaleString("fr-FR")} unités.
                      </p>
                    )}
                    {dripfeedEnabled && (
                      <>
                        <div className="mt-3">
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="text-ink-500">Sur combien de jours</span>
                            <span className="font-medium text-ink-700">{dripfeedDays} j</span>
                          </div>
                          <input
                            type="range"
                            min={mandatoryDays > 0 ? mandatoryDays : 1}
                            max={30}
                            value={dripfeedDays}
                            onChange={(e) => setDripfeedDays(Number(e.target.value))}
                            className="w-full accent-brand-500"
                          />
                          <div className="mt-1 flex items-center justify-between text-xs text-ink-400">
                            <span>
                              Recommandé pour {quantity.toLocaleString("fr-FR")} unités :{" "}
                              {recommendedDripfeedDays(quantity)} jours
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const recDays = recommendedDripfeedDays(quantity);
                                setDripfeedDays(recDays);
                                setDripfeedRuns(recommendedDripfeedRuns(recDays, maxDripfeedRunsForQuantity));
                              }}
                              className="font-medium text-ink-600 hover:underline"
                            >
                              Appliquer
                            </button>
                          </div>
                        </div>

                        <label className="mt-3 block text-xs">
                          <span className="mb-1 block text-ink-500">Nombre de lots</span>
                          <input
                            type="number"
                            min={2}
                            max={maxDripfeedRunsForQuantity}
                            value={dripfeedRunsInput}
                            inputMode="numeric"
                            onChange={(e) => {
                              const value = e.target.value;
                              setDripfeedRunsInput(value);
                              if (value !== "" && Number.isFinite(Number(value))) {
                                setDripfeedRuns(Number(value));
                              }
                            }}
                            onBlur={normalizeDripfeedRuns}
                            className="w-28 rounded-lg border border-ink-200 px-2 py-1.5 text-sm"
                          />
                          {quantity % dripfeedRuns === 0 && (
                            <span className="mt-1 block text-ink-400">
                              {Math.round(quantity / dripfeedRuns).toLocaleString("fr-FR")} unités par lot
                            </span>
                          )}
                        </label>
                      </>
                    )}
                    {dripfeedEnabled && computedIntervalMinutes() != null && (
                      <p className="mt-2 text-xs text-ink-400">
                        ≈ 1 lot toutes les {Math.round((computedIntervalMinutes() ?? 0) / 60)}h
                      </p>
                    )}
                  </div>
                )}

                {couponsExist && (
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
                )}

                <fieldset>
                  <legend className="mb-2 text-sm font-medium text-ink-900">Pays de paiement</legend>
                  <select
                    value={paymentCountryCode ?? ""}
                    onChange={(e) => setPaymentCountryCode(e.target.value || null)}
                    className="h-11 w-full rounded-xl2 border-2 border-ink-900 bg-white px-3 text-sm text-ink-900 outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="" disabled>Choisissez votre pays</option>
                    {PAYMENT_COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
                  </select>
                </fieldset>

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
                <Button
                  type="submit"
                  loading={busy}
                  disabled={!acceptedTerms || (mandatoryDays > 0 && !item.dripfeedSupported)}
                  className="w-full"
                >
                  Continuer vers le paiement
                </Button>
              </form>
            )}

            {step.kind === "country" && (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-lg font-semibold text-ink-900">Choisis ton pays de paiement</p>
                  <p className="mt-1 text-sm text-ink-500">Les moyens disponibles dépendent du pays sélectionné.</p>
                </div>
                <div className="grid gap-2">
                  {paymentCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => setPaymentCountryCode(country.code)}
                      className={`flex items-center gap-3 rounded-xl2 border-2 p-4 text-left transition-colors ${paymentCountryCode === country.code ? "border-ink-900 bg-brand-300/20" : "border-ink-200 bg-white hover:border-ink-900"}`}
                    >
                      {country.flagUrl && <img src={country.flagUrl} alt="" className="h-5 w-7 rounded-sm object-cover" />}
                      <span className="font-medium text-ink-900">{country.name}</span>
                    </button>
                  ))}
                </div>
                {paymentCountries.length === 1 && (
                  <p className="text-xs text-ink-500">YengaPay retourne actuellement uniquement ce pays pour cette intention de paiement.</p>
                )}
                {error && <p className="text-sm text-rose-600">{error}</p>}
                <Button disabled={!paymentCountryCode} onClick={() => setStep({ kind: "operator", created: step.created })}>
                  Voir les moyens de paiement
                </Button>
              </div>
            )}

            {step.kind === "operator" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between rounded-lg border-2 border-ink-900 bg-brand-500 px-4 py-3">
                  <span className="text-sm font-semibold text-ink-900">Total à payer</span>
                  <span className="text-xl font-bold text-ink-900">{formatXof(step.created.priceClientXof)}</span>
                </div>
                {Number(step.created.discountXof) > 0 && (
                  <p className="text-sm text-emerald-600">-{formatXof(step.created.discountXof)} appliqué</p>
                )}
                <div className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
                  <span>Pays : <strong className="text-ink-900">{PAYMENT_COUNTRIES.find((country) => country.code === paymentCountryCode)?.name}</strong></span>
                  <button type="button" onClick={() => setStep({ kind: "country", created: step.created })} className="font-medium underline hover:text-ink-900">Changer</button>
                </div>
                <p className="mt-1 text-sm font-medium text-ink-700">Choisis ton moyen de paiement :</p>
                {displayedOperators.map((op) => (
                  <button
                    key={op.code}
                    onClick={() => chooseOperator(step.created, op)}
                    className="flex items-center gap-3 rounded-xl2 border-2 border-ink-900 px-4 py-3 text-left transition-colors hover:bg-brand-300/20"
                  >
                    <PaymentOperatorMark operator={op} />
                    <span className="flex-1">
                      <span className="block font-medium text-ink-900">{op.name}</span>
                      <span className="block text-xs text-ink-400">{op.countryName}</span>
                    </span>
                  </button>
                ))}
                {paymentCountryCode !== "OTHER" && (
                  <button
                    onClick={() => chooseHostedCheckout(step.created.orderId)}
                    disabled={busy}
                    className="flex items-center gap-3 rounded-xl2 border-2 border-ink-900 px-4 py-3 text-left transition-colors hover:bg-brand-300/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink-900 bg-white p-1"><img src="/payments/card.svg" alt="" className="h-full w-full" /></span>
                    <span className="flex-1"><span className="block font-medium text-ink-900">Carte bancaire / autres moyens</span><span className="block text-xs text-ink-400">Paiement sécurisé par YengaPay</span></span>
                  </button>
                )}
                <button
                  onClick={() => chooseCryptomusPayment(step.created.orderId)}
                  disabled={busy}
                  className="flex items-center gap-3 rounded-xl2 border-2 border-ink-900 px-4 py-3 text-left transition-colors hover:bg-brand-300/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink-900 bg-white text-lg">₮</span>
                  <span className="flex-1"><span className="block font-medium text-ink-900">Payer en crypto</span><span className="block text-xs text-ink-400">Choisissez votre crypto et votre réseau</span></span>
                </button>
                {error && <p className="text-sm text-rose-600">{error}</p>}
              </div>
            )}

            {step.kind === "otp" && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between rounded-lg border-2 border-ink-900 bg-brand-500 px-4 py-3">
                  <span className="text-sm font-semibold text-ink-900">{step.operator.name}</span>
                  <span className="text-xl font-bold text-ink-900">{formatXof(step.created.priceClientXof)}</span>
                </div>

                <Input
                  label={`Numéro de téléphone (${step.operator.countryName})`}
                  type="tel"
                  required
                  placeholder="70707070"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                {step.operator.flow === "ONE_STEP" ? (
                  <div className="rounded-lg bg-ink-50 p-3 text-sm text-ink-600">
                    Compose <strong>{step.operator.ussdCode}</strong> sur ton téléphone pour recevoir
                    ton code, puis saisis-le ci-dessous.
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
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink-900 bg-emerald-100 text-2xl text-emerald-600">
                  ✓
                </div>
                <p className="text-lg font-semibold text-ink-900">Paiement confirmé</p>
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
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink-900 bg-amber-100 text-2xl text-amber-600">
                  …
                </div>
                <p className="text-lg font-semibold text-ink-900">Paiement en cours de vérification</p>
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
            <Link href="/services" className="mt-4 inline-block text-sm text-ink-500 hover:underline">
              ← Retour au catalogue
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
