"use client";

import { useEffect, useMemo, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { api, ApiError } from "@/lib/api";
import { CatalogAdminItem, Category, ProviderServiceRow } from "@/lib/types";
import { formatXof } from "@/lib/format";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

type PricingRuleType = "FIXED_PRICE" | "PERCENT_MARGIN" | "FIXED_MARGIN";

interface FormState {
  editingId: string | null;
  providerServiceId: string;
  categoryId: string;
  name: string;
  description: string;
  pricingRuleType: PricingRuleType;
  pricingValue: string;
  roundingStep: string;
  isVisible: boolean;
}

const EMPTY_FORM: FormState = {
  editingId: null,
  providerServiceId: "",
  categoryId: "",
  name: "",
  description: "",
  pricingRuleType: "PERCENT_MARGIN",
  pricingValue: "60",
  roundingStep: "",
  isVisible: true,
};

export default function AdminCatalogPage() {
  const { token, isAdmin } = useRequireAdmin();

  const [entries, setEntries] = useState<CatalogAdminItem[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [providerServices, setProviderServices] = useState<ProviderServiceRow[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  function loadAll() {
    if (!token) return;
    api.get<CatalogAdminItem[]>("/catalog/admin", token).then(setEntries);
    api.get<Category[]>("/categories/all", token).then(setCategories);
    api.get<ProviderServiceRow[]>("/provider-services", token).then(setProviderServices);
  }

  useEffect(() => {
    if (!token || !isAdmin) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  const filteredProviderServices = useMemo(() => {
    if (search.trim().length < 2) return [];
    const q = search.toLowerCase();
    return providerServices
      .filter((p) => p.isActiveUpstream && p.name.toLowerCase().includes(q))
      .slice(0, 30);
  }, [search, providerServices]);

  async function handleSync() {
    if (!token) return;
    setBusy(true);
    setSyncResult(null);
    try {
      const result = await api.post<{ fetched: number; created: number; updated: number; deactivated: number }>(
        "/provider-services/sync",
        undefined,
        token,
      );
      setSyncResult(
        `${result.fetched} services récupérés — ${result.created} nouveaux, ${result.updated} mis à jour, ${result.deactivated} désactivés.`,
      );
      loadAll();
    } catch (err) {
      setSyncResult(err instanceof ApiError ? err.message : "Erreur de synchronisation");
    } finally {
      setBusy(false);
    }
  }

  function selectProviderService(p: ProviderServiceRow) {
    setForm((f) => ({ ...f, providerServiceId: p.id, name: f.name || p.name }));
    setSearch("");
  }

  function startEdit(entry: CatalogAdminItem) {
    setForm({
      editingId: entry.id,
      providerServiceId: "",
      categoryId: entry.category.id,
      name: entry.name,
      description: entry.description ?? "",
      pricingRuleType: "PERCENT_MARGIN",
      pricingValue: "",
      roundingStep: "",
      isVisible: entry.isVisible,
    });
  }

  async function handleSubmit() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      if (form.editingId) {
        await api.patch(
          `/catalog/${form.editingId}`,
          {
            categoryId: form.categoryId || undefined,
            name: form.name,
            description: form.description || undefined,
            isVisible: form.isVisible,
            ...(form.pricingValue
              ? { pricingRuleType: form.pricingRuleType, pricingValue: Number(form.pricingValue) }
              : {}),
            ...(form.roundingStep ? { roundingStep: Number(form.roundingStep) } : {}),
          },
          token,
        );
      } else {
        await api.post(
          "/catalog",
          {
            providerServiceId: form.providerServiceId,
            categoryId: form.categoryId,
            name: form.name,
            description: form.description || undefined,
            pricingRuleType: form.pricingRuleType,
            pricingValue: Number(form.pricingValue),
            roundingStep: form.roundingStep ? Number(form.roundingStep) : undefined,
            isVisible: form.isVisible,
          },
          token,
        );
      }
      setForm(EMPTY_FORM);
      loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur d'enregistrement");
    } finally {
      setBusy(false);
    }
  }

  async function toggleVisible(entry: CatalogAdminItem) {
    if (!token) return;
    await api.patch(`/catalog/${entry.id}`, { isVisible: !entry.isVisible }, token);
    loadAll();
  }

  async function remove(entry: CatalogAdminItem) {
    if (!token) return;
    await api.delete(`/catalog/${entry.id}`, token);
    loadAll();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Catalogue</h1>
        <Button variant="secondary" loading={busy} onClick={handleSync}>
          Synchroniser PanelFollows
        </Button>
      </div>
      {syncResult && <p className="mb-4 text-sm text-ink-500">{syncResult}</p>}

      <div className="mb-8 rounded-xl2 border border-ink-100 bg-white p-5 shadow-soft">
        <h2 className="mb-4 text-sm font-semibold text-ink-900">
          {form.editingId ? "Modifier le service" : "Ajouter un service au catalogue"}
        </h2>

        {!form.editingId && (
          <div className="mb-4">
            <Input
              label="Rechercher un service PanelFollows"
              placeholder="ex: tiktok followers"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {filteredProviderServices.length > 0 && (
              <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-ink-100">
                {filteredProviderServices.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectProviderService(p)}
                    className="block w-full border-b border-ink-50 px-3 py-2 text-left text-sm last:border-0 hover:bg-ink-50"
                  >
                    <span className="font-medium text-ink-900">{p.name}</span>
                    <span className="ml-2 text-ink-400">
                      {p.rateUsd} USD {p.unit} · min {p.minQuantity} max {p.maxQuantity}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {form.providerServiceId && (
              <p className="mt-2 text-xs text-emerald-600">Service fournisseur sélectionné.</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Nom affiché au client"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Catégorie</span>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm text-ink-900"
            >
              <option value="">— choisir —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Règle de prix</span>
            <select
              value={form.pricingRuleType}
              onChange={(e) =>
                setForm((f) => ({ ...f, pricingRuleType: e.target.value as PricingRuleType }))
              }
              className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm text-ink-900"
            >
              <option value="PERCENT_MARGIN">Marge en % du coût</option>
              <option value="FIXED_MARGIN">Marge fixe (XOF)</option>
              <option value="FIXED_PRICE">Prix fixe (XOF)</option>
            </select>
          </label>
          <Input
            label={
              form.pricingRuleType === "PERCENT_MARGIN"
                ? "Marge (%)"
                : form.pricingRuleType === "FIXED_MARGIN"
                  ? "Marge fixe (XOF)"
                  : "Prix fixe (XOF)"
            }
            type="number"
            value={form.pricingValue}
            onChange={(e) => setForm((f) => ({ ...f, pricingValue: e.target.value }))}
            placeholder={form.editingId ? "laisser vide pour ne pas changer" : undefined}
          />
          <Input
            label="Arrondi (XOF, optionnel)"
            type="number"
            value={form.roundingStep}
            onChange={(e) => setForm((f) => ({ ...f, roundingStep: e.target.value }))}
          />
          <Input
            label="Description (optionnel)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={form.isVisible}
            onChange={(e) => setForm((f) => ({ ...f, isVisible: e.target.checked }))}
          />
          Visible dans le catalogue public
        </label>

        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

        <div className="mt-4 flex gap-3">
          <Button
            loading={busy}
            disabled={!form.categoryId || !form.name || (!form.editingId && !form.providerServiceId)}
            onClick={handleSubmit}
          >
            {form.editingId ? "Enregistrer" : "Ajouter au catalogue"}
          </Button>
          {form.editingId && (
            <Button variant="ghost" onClick={() => setForm(EMPTY_FORM)}>
              Annuler
            </Button>
          )}
        </div>
      </div>

      {!entries && <p className="text-ink-400">Chargement…</p>}

      {entries && (
        <div className="overflow-x-auto rounded-xl2 border border-ink-100 bg-white shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Prix client</th>
                <th className="px-4 py-3">Coût</th>
                <th className="px-4 py-3">Marge</th>
                <th className="px-4 py-3">Visible</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink-900">{e.name}</td>
                  <td className="px-4 py-3 text-ink-500">{e.category.name}</td>
                  <td className="px-4 py-3 text-ink-900">{formatXof(e.priceClientXof)}</td>
                  <td className="px-4 py-3 text-ink-500">{formatXof(e.costProviderXof)}</td>
                  <td className="px-4 py-3 text-ink-500">{formatXof(e.marginXof)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleVisible(e)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        e.isVisible ? "bg-emerald-100 text-emerald-700" : "bg-ink-100 text-ink-500"
                      }`}
                    >
                      {e.isVisible ? "Visible" : "Masqué"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => startEdit(e)}
                      className="mr-3 text-xs font-medium text-ink-600 hover:text-ink-900"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => remove(e)}
                      className="text-xs font-medium text-rose-600 hover:text-rose-800"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length === 0 && <p className="p-6 text-center text-ink-400">Catalogue vide.</p>}
        </div>
      )}
    </div>
  );
}
