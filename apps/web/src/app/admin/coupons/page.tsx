"use client";

import { useEffect, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { api, ApiError } from "@/lib/api";
import { Coupon, CouponDiscountType } from "@/lib/types";
import { formatXof } from "@/lib/format";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

export default function AdminCouponsPage() {
  const { token, isAdmin } = useRequireAdmin();
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<CouponDiscountType>("PERCENT");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [minOrderXof, setMinOrderXof] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    if (!token) return;
    api.get<Coupon[]>("/coupons", token).then(setCoupons);
  }

  useEffect(() => {
    if (!token || !isAdmin) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  async function create() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(
        "/coupons",
        {
          code,
          discountType,
          value: Number(value),
          maxUses: maxUses ? Number(maxUses) : undefined,
          minOrderXof: minOrderXof ? Number(minOrderXof) : undefined,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        },
        token,
      );
      setCode("");
      setValue("");
      setMaxUses("");
      setMinOrderXof("");
      setExpiresAt("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(coupon: Coupon) {
    if (!token) return;
    await api.patch(`/coupons/${coupon.id}`, { isActive: !coupon.isActive }, token);
    load();
  }

  async function remove(id: string) {
    if (!token) return;
    await api.delete(`/coupons/${id}`, token);
    load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink-900">Coupons</h1>

      <div className="mb-8 rounded-xl2 border border-ink-100 bg-white p-5 shadow-soft">
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Créer un coupon</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="WELCOME10"
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Type de remise</span>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as CouponDiscountType)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm text-ink-900"
            >
              <option value="PERCENT">Pourcentage (%)</option>
              <option value="FIXED_XOF">Montant fixe (XOF)</option>
            </select>
          </label>
          <Input
            label={discountType === "PERCENT" ? "Valeur (%)" : "Valeur (XOF)"}
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Input
            label="Utilisations max (optionnel)"
            type="number"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
          />
          <Input
            label="Montant minimum de commande (XOF, optionnel)"
            type="number"
            value={minOrderXof}
            onChange={(e) => setMinOrderXof(e.target.value)}
          />
          <Input
            label="Expire le (optionnel)"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        <Button loading={busy} disabled={!code || !value} onClick={create} className="mt-4">
          Créer le coupon
        </Button>
      </div>

      {!coupons && <p className="text-ink-400">Chargement…</p>}

      {coupons && (
        <div className="overflow-x-auto rounded-xl2 border border-ink-100 bg-white shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Remise</th>
                <th className="px-4 py-3">Utilisations</th>
                <th className="px-4 py-3">Min. commande</th>
                <th className="px-4 py-3">Expire</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-4 py-3 font-mono font-medium text-ink-900">{c.code}</td>
                  <td className="px-4 py-3 text-ink-600">
                    {c.discountType === "PERCENT" ? `${c.value}%` : formatXof(c.value)}
                  </td>
                  <td className="px-4 py-3 text-ink-500">
                    {c.usedCount}
                    {c.maxUses ? ` / ${c.maxUses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-ink-500">
                    {c.minOrderXof ? formatXof(c.minOrderXof) : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-400">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(c)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        c.isActive ? "bg-emerald-100 text-emerald-700" : "bg-ink-100 text-ink-500"
                      }`}
                    >
                      {c.isActive ? "Actif" : "Désactivé"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove(c.id)}
                      className="text-xs font-medium text-rose-600 hover:text-rose-800"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-ink-400">
                    Aucun coupon.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
