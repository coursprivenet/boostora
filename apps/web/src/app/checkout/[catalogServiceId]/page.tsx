"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useRequireAuth } from "@/lib/use-require-auth";
import { api, ApiError } from "@/lib/api";
import { CatalogItem, CreateOrderResponse, YengapayOperator } from "@/lib/types";
import { formatXof } from "@/lib/format";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

type Step =
  | { kind: "form" }
  | { kind: "operator"; created: CreateOrderResponse }
  | { kind: "otp"; created: CreateOrderResponse; operator: YengapayOperator; otpSent: boolean }
  | { kind: "success"; transactionId: string };

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

  const [step, setStep] = useState<Step>({ kind: "form" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<CatalogItem>(`/catalog/${catalogServiceId}`)
      .then((data) => {
        setItem(data);
        setQuantity(data.minQuantity);
      })
      .catch(() => setLoadError("Service introuvable ou indisponible."));
  }, [catalogServiceId]);

  async function submitOrder(e: FormEvent) {
    e.preventDefault();
    if (!token || !item) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api.post<CreateOrderResponse>(
        "/orders",
        { catalogServiceId: item.id, targetLink, quantity },
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
      const result = await api.post<{ status: string; transactionId: string }>(
        `/orders/${created.orderId}/payment/confirm`,
        { operatorCode: operator.code, countryCode: "BF", customerMSISDN: phone, otp },
        token,
      );
      setStep({ kind: "success", transactionId: result.transactionId });
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
            <Input
              label={`Quantité (min ${item.minQuantity}, max ${item.maxQuantity})`}
              type="number"
              required
              min={item.minQuantity}
              max={item.maxQuantity}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <Button type="submit" loading={busy} className="w-full">
              Continuer vers le paiement
            </Button>
          </form>
        )}

        {step.kind === "operator" && (
          <div className="flex flex-col gap-3">
            <p className="mb-1 text-sm text-ink-500">
              Total à payer : <strong className="text-ink-900">{formatXof(step.created.priceClientXof)}</strong>
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
      </div>

      {step.kind !== "success" && (
        <Link href="/" className="mt-4 inline-block text-sm text-ink-500 hover:underline">
          ← Retour au catalogue
        </Link>
      )}
    </main>
  );
}
