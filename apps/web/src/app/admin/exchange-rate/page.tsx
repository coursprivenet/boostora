"use client";

import { useEffect, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { api, ApiError } from "@/lib/api";
import { ExchangeRateRow } from "@/lib/types";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

export default function AdminExchangeRatePage() {
  const { token, isAdmin } = useRequireAdmin();
  const [current, setCurrent] = useState<{ rateXofPerUsd: string; costRateXofPerUsd: string } | null>(null);
  const [history, setHistory] = useState<ExchangeRateRow[] | null>(null);
  const [value, setValue] = useState("");
  const [costValue, setCostValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    if (!token) return;
    api.get<{ rateXofPerUsd: string; costRateXofPerUsd: string }>("/exchange-rate/current", token).then(setCurrent);
    api.get<ExchangeRateRow[]>("/exchange-rate/history", token).then(setHistory);
  }

  useEffect(() => {
    if (!token || !isAdmin) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  async function submit() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/exchange-rate", { rateXofPerUsd: Number(value), costRateXofPerUsd: costValue ? Number(costValue) : undefined }, token);
      setValue("");
      setCostValue("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink-900">Taux de change</h1>

      <div className="mb-6 rounded-xl2 border border-ink-100 bg-white p-5 shadow-soft">
        <p className="text-sm text-ink-500">
          Taux actuel :{" "}
          <strong className="text-ink-900">
            {current ? `Taux commercial : 1 USD = ${current.rateXofPerUsd} XOF` : "…"}
          </strong>
        </p>
        <p className="mt-1 text-xs text-ink-400">
          Le taux commercial fixe le prix client. Le taux d'achat reflète ton coût réel pour recharger
          le solde fournisseur : leur écart apparaît comme marge de change dans le tableau de bord.
        </p>

        <div className="mt-4 flex items-end gap-3">
          <Input
            label="Taux commercial (XOF pour 1 USD)"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Input
            label={current ? `Taux d'achat réel (actuel : ${current.costRateXofPerUsd})` : "Taux d'achat réel"}
            type="number"
            value={costValue}
            onChange={(e) => setCostValue(e.target.value)}
          />
          <Button loading={busy} disabled={!value} onClick={submit}>
            Mettre à jour
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </div>

      {history && (
        <div className="overflow-hidden rounded-xl2 border border-ink-100 bg-white shadow-soft">
          {history.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between border-b border-ink-50 px-4 py-3 text-sm last:border-0"
            >
              <span className="text-ink-900">Commercial {h.rateXofPerUsd} XOF · Achat {h.costRateXofPerUsd} XOF</span>
              <span className="text-ink-400">
                {new Date(h.effectiveFrom).toLocaleString("fr-FR")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
