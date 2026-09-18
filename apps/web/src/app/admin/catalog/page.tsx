"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { api, ApiError } from "@/lib/api";
import { CatalogAdminItem, CatalogAdminPricePreview, Category, ProviderServiceRow } from "@/lib/types";
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
  riskWarning: string;
  pricingRuleType: PricingRuleType;
  pricingValue: string;
  roundingStep: string;
  minPriceXof: string;
  referenceQuantity: number;
  referencePriceXof: string;
  referencePriceEdited: boolean;
  isVisible: boolean;
}

const EMPTY_FORM: FormState = {
  editingId: null,
  providerServiceId: "",
  categoryId: "",
  name: "",
  description: "",
  riskWarning: "",
  pricingRuleType: "PERCENT_MARGIN",
  pricingValue: "60",
  roundingStep: "",
  minPriceXof: "100",
  referenceQuantity: 0,
  referencePriceXof: "",
  referencePriceEdited: false,
  isVisible: true,
};

const PAGE_SIZE = 20;
const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", youtube: "YouTube",
  spotify: "Spotify", twitter: "X (Twitter)", whatsapp: "WhatsApp", snapchat: "Snapchat",
  linkedin: "LinkedIn", telegram: "Telegram",
};
const PLATFORM_PREFIXES = ["Instagram", "TikTok", "Facebook", "YouTube", "Spotify", "X", "WhatsApp", "Snapchat", "LinkedIn", "Telegram"];
const TYPE_PRIORITY = ["Abonnés", "J'aime", "Commentaires", "Partages"];

function typeOf(categoryName: string): string {
  for (const prefix of PLATFORM_PREFIXES) {
    if (categoryName.startsWith(`${prefix} `)) return categoryName.slice(prefix.length + 1);
  }
  return categoryName;
}

function typeRank(type: string): number {
  const index = TYPE_PRIORITY.indexOf(type);
  return index === -1 ? TYPE_PRIORITY.length : index;
}

export default function AdminCatalogPage() {
  const { token, isAdmin } = useRequireAdmin();

  const [entries, setEntries] = useState<CatalogAdminItem[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [providerServices, setProviderServices] = useState<ProviderServiceRow[]>([]);
  const [search, setSearch] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "visible" | "hidden">("all");
  const [refillOnly, setRefillOnly] = useState(false);
  const [sort, setSort] = useState<"default" | "price-asc" | "price-desc" | "margin-asc" | "margin-desc">("default");
  const [page, setPage] = useState(1);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});
  const [pricePreviews, setPricePreviews] = useState<Record<string, CatalogAdminPricePreview>>({});
  const [quoteStatus, setQuoteStatus] = useState<Record<string, "loading" | "error">>({});
  const latestQuoteQuantity = useRef<Record<string, number>>({});
  const quoteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
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

  const platforms = useMemo(() => {
    if (!entries) return [];
    return Array.from(new Set(entries.map((entry) => entry.provider.platform))).sort();
  }, [entries]);

  const types = useMemo(() => {
    if (!entries) return [];
    const scoped = platformFilter ? entries.filter((entry) => entry.provider.platform === platformFilter) : entries;
    return Array.from(new Set(scoped.map((entry) => typeOf(entry.category.name)))).sort((a, b) => typeRank(a) - typeRank(b) || a.localeCompare(b));
  }, [entries, platformFilter]);

  useEffect(() => setTypeFilter(null), [platformFilter]);
  useEffect(() => setPage(1), [catalogSearch, platformFilter, typeFilter, visibilityFilter, refillOnly, sort]);
  useEffect(() => () => {
    Object.values(quoteTimers.current).forEach(clearTimeout);
  }, []);

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    const query = catalogSearch.trim().toLowerCase();
    const list = entries.filter((entry) => {
      const matchesSearch = !query || [entry.name, entry.description ?? "", entry.category.name, entry.provider.platform]
        .some((value) => value.toLowerCase().includes(query));
      return matchesSearch
        && (!platformFilter || entry.provider.platform === platformFilter)
        && (!typeFilter || typeOf(entry.category.name) === typeFilter)
        && (visibilityFilter === "all" || (visibilityFilter === "visible" ? entry.isVisible : !entry.isVisible))
        && (!refillOnly || entry.provider.refillSupported);
    });
    return list.sort((a, b) => {
      if (sort === "price-asc") return Number(a.priceClientXof) - Number(b.priceClientXof);
      if (sort === "price-desc") return Number(b.priceClientXof) - Number(a.priceClientXof);
      if (sort === "margin-asc") return Number(a.marginXof) - Number(b.marginXof);
      if (sort === "margin-desc") return Number(b.marginXof) - Number(a.marginXof);
      return a.displayOrder - b.displayOrder || a.name.localeCompare(b.name);
    });
  }, [entries, catalogSearch, platformFilter, typeFilter, visibilityFilter, refillOnly, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const visibleEntries = filteredEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
      riskWarning: entry.riskWarning ?? "",
      pricingRuleType: entry.pricingRuleType,
      pricingValue: entry.pricingValue,
      roundingStep: entry.roundingStep ?? "",
      minPriceXof: entry.minPriceXof ?? "",
      referenceQuantity: entry.referenceQuantity,
      referencePriceXof: entry.priceClientXof,
      referencePriceEdited: false,
      isVisible: entry.isVisible,
    });
    setError(null);
    setIsEditorOpen(true);
  }

  function startCreate() {
    setForm(EMPTY_FORM);
    setSearch("");
    setError(null);
    setIsEditorOpen(true);
  }

  function closeEditor() {
    if (busy) return;
    setForm(EMPTY_FORM);
    setSearch("");
    setError(null);
    setIsEditorOpen(false);
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
            riskWarning: form.riskWarning || undefined,
            isVisible: form.isVisible,
            ...(form.pricingValue
              ? { pricingRuleType: form.pricingRuleType, pricingValue: Number(form.pricingValue) }
              : {}),
            ...(form.roundingStep ? { roundingStep: Number(form.roundingStep) } : {}),
            ...(form.minPriceXof ? { minPriceXof: Number(form.minPriceXof) } : {}),
            ...(form.referencePriceEdited ? { referencePriceXof: Number(form.referencePriceXof) } : {}),
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
            riskWarning: form.riskWarning || undefined,
            pricingRuleType: form.pricingRuleType,
            pricingValue: Number(form.pricingValue),
            roundingStep: form.roundingStep ? Number(form.roundingStep) : undefined,
            minPriceXof: form.minPriceXof ? Number(form.minPriceXof) : undefined,
            isVisible: form.isVisible,
          },
          token,
        );
      }
      setForm(EMPTY_FORM);
      setIsEditorOpen(false);
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
    if (!window.confirm(`Supprimer « ${entry.name} » du catalogue ? Cette action est définitive.`)) return;
    setBusy(true);
    try {
      await api.delete(`/catalog/${entry.id}`, token);
      loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Suppression impossible");
    } finally {
      setBusy(false);
    }
  }

  function quantityFor(entry: CatalogAdminItem) {
    return quantities[entry.id] ?? entry.referenceQuantity;
  }

  function quantityTextFor(entry: CatalogAdminItem) {
    return quantityDrafts[entry.id] ?? String(quantityFor(entry));
  }

  function updateQuantityText(entry: CatalogAdminItem, value: string) {
    setQuantityDrafts((current) => ({ ...current, [entry.id]: value }));
    if (value === "") return;
    const quantity = Number(value);
    if (Number.isFinite(quantity)) updateQuote(entry, quantity, true);
  }

  function commitQuantityText(entry: CatalogAdminItem) {
    const value = Number(quantityTextFor(entry));
    const quantity = Number.isFinite(value)
      ? Math.max(entry.minQuantity, Math.min(entry.maxQuantity, Math.round(value)))
      : quantityFor(entry);
    setQuantityDrafts((current) => ({ ...current, [entry.id]: String(quantity) }));
    updateQuote(entry, quantity);
  }

  function updateQuote(entry: CatalogAdminItem, requestedQuantity: number, preserveDraft = false) {
    if (!token || !Number.isFinite(requestedQuantity)) return;
    const quantity = Math.max(entry.minQuantity, Math.min(entry.maxQuantity, Math.round(requestedQuantity)));
    latestQuoteQuantity.current[entry.id] = quantity;
    setQuantities((current) => ({ ...current, [entry.id]: quantity }));
    if (!preserveDraft) setQuantityDrafts((current) => ({ ...current, [entry.id]: String(quantity) }));
    setQuoteStatus((current) => ({ ...current, [entry.id]: "loading" }));
    clearTimeout(quoteTimers.current[entry.id]);
    // A range control fires on every pixel while dragged. Debouncing prevents those
    // UI events from exhausting the serverless database connection pool.
    quoteTimers.current[entry.id] = setTimeout(async () => {
      try {
        const preview = await api.get<CatalogAdminPricePreview>(
          `/catalog/${entry.id}/admin-price-preview?quantity=${quantity}`,
          token,
        );
        if (latestQuoteQuantity.current[entry.id] !== quantity) return;
        setPricePreviews((current) => ({ ...current, [entry.id]: preview }));
        setQuoteStatus((current) => {
          const { [entry.id]: _status, ...rest } = current;
          return rest;
        });
      } catch {
        if (latestQuoteQuantity.current[entry.id] === quantity) {
          setQuoteStatus((current) => ({ ...current, [entry.id]: "error" }));
        }
      }
    }, 180);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Catalogue</h1>
        <div className="flex gap-2">
          <Button variant="secondary" loading={busy} onClick={handleSync}>Synchroniser PanelFollows</Button>
          <Button onClick={startCreate}>Ajouter un service</Button>
        </div>
      </div>
      {syncResult && <p className="mb-4 text-sm text-ink-500">{syncResult}</p>}

      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/45 p-4" role="dialog" aria-modal="true" aria-labelledby="catalog-editor-title" onMouseDown={closeEditor}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl2 bg-white p-5 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 id="catalog-editor-title" className="text-lg font-semibold text-ink-900">
                {form.editingId ? "Modifier le service" : "Ajouter un service au catalogue"}
              </h2>
              <button onClick={closeEditor} aria-label="Fermer" className="rounded-full p-2 text-ink-500 hover:bg-ink-100 hover:text-ink-900">✕</button>
            </div>
      <div>

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
          {form.editingId && (
            <div>
              <Input
                label={`Prix affiché pour ${form.referenceQuantity.toLocaleString("fr-FR")} unités (FCFA)`}
                type="number"
                min="1"
                value={form.referencePriceXof}
                onChange={(e) => setForm((f) => ({ ...f, referencePriceXof: e.target.value, referencePriceEdited: true }))}
              />
              <p className="mt-1 text-xs text-ink-500">C’est le prix visible dans le catalogue public. Le modifier ajuste automatiquement la règle de prix de ce service.</p>
            </div>
          )}
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

        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium text-ink-700">
            Avertissement (optionnel) — affiché en évidence sur la fiche et au checkout
          </span>
          <textarea
            rows={2}
            value={form.riskWarning}
            onChange={(e) => setForm((f) => ({ ...f, riskWarning: e.target.value }))}
            placeholder="ex: Pas de refill, résultats non garantis"
            className="w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </label>

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
          <Button variant="ghost" onClick={closeEditor}>Annuler</Button>
        </div>
      </div>
          </div>
        </div>
      )}

      {!entries && <p className="text-ink-400">Chargement…</p>}

      {entries && (
        <div>
          <div className="mb-4 rounded-xl2 border border-ink-100 bg-white p-4 shadow-soft">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <div className="min-w-0 flex-1">
                <Input
                  label="Rechercher dans le catalogue"
                  placeholder="Service, catégorie ou réseau"
                  value={catalogSearch}
                  onChange={(event) => setCatalogSearch(event.target.value)}
                />
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-700">Type</span>
                <select value={typeFilter ?? ""} onChange={(event) => setTypeFilter(event.target.value || null)} className="rounded-lg border border-ink-200 px-3 py-2.5 text-sm text-ink-900">
                  <option value="">Tous les types</option>
                  {types.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-700">Visibilité</span>
                <select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value as typeof visibilityFilter)} className="rounded-lg border border-ink-200 px-3 py-2.5 text-sm text-ink-900">
                  <option value="all">Tout afficher</option>
                  <option value="visible">Visibles</option>
                  <option value="hidden">Masqués</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-ink-700">Trier par</span>
                <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="rounded-lg border border-ink-200 px-3 py-2.5 text-sm text-ink-900">
                  <option value="default">Ordre du catalogue</option>
                  <option value="price-asc">Prix croissant</option>
                  <option value="price-desc">Prix décroissant</option>
                  <option value="margin-asc">Marge croissante</option>
                  <option value="margin-desc">Marge décroissante</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={() => setPlatformFilter(null)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${!platformFilter ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-600"}`}>Tous les réseaux</button>
              {platforms.map((platform) => (
                <button key={platform} onClick={() => setPlatformFilter(platform)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${platformFilter === platform ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-600"}`}>
                  {PLATFORM_LABELS[platform.toLowerCase()] ?? platform}
                </button>
              ))}
              <label className="ml-auto flex items-center gap-2 text-sm text-ink-600">
                <input type="checkbox" checked={refillOnly} onChange={(event) => setRefillOnly(event.target.checked)} />
                Refill uniquement
              </label>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between text-sm text-ink-500">
            <span>{filteredEntries.length} service{filteredEntries.length > 1 ? "s" : ""}</span>
            <span>Prix, coût et marge correspondent à la même quantité affichée.</span>
          </div>

          {visibleEntries.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleEntries.map((entry) => {
                const quantity = quantityFor(entry);
                const quote = pricePreviews[entry.id];
                const isCalculating = quoteStatus[entry.id] === "loading";
                return <article key={entry.id} className={`rounded-xl2 border bg-white p-5 shadow-soft ${entry.isVisible ? "border-ink-100" : "border-amber-200 bg-amber-50/30"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{PLATFORM_LABELS[entry.provider.platform.toLowerCase()] ?? entry.provider.platform}</p>
                      <h2 className="mt-1 font-semibold text-ink-900">{entry.name}</h2>
                      <p className="mt-1 text-xs text-ink-500">{entry.category.name} · {entry.minQuantity.toLocaleString("fr-FR")}–{entry.maxQuantity.toLocaleString("fr-FR")} unités</p>
                    </div>
                    <button onClick={() => toggleVisible(entry)} className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${entry.isVisible ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {entry.isVisible ? "Visible" : "Masqué"}
                    </button>
                  </div>
                  {entry.description && <p className="mt-3 line-clamp-2 text-sm text-ink-600">{entry.description}</p>}
                  <div className="mt-4 rounded-lg bg-ink-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-xs text-ink-500">
                      <span>Simuler une quantité</span>
                      <input
                        aria-label={`Quantité pour ${entry.name}`}
                        type="number"
                        min={entry.minQuantity}
                        max={entry.maxQuantity}
                        value={quantityTextFor(entry)}
                        onChange={(event) => updateQuantityText(entry, event.target.value)}
                        onBlur={() => commitQuantityText(entry)}
                        className="w-24 rounded-md border border-ink-200 bg-white px-2 py-1 text-right text-sm font-semibold text-ink-900"
                      />
                    </div>
                    <input
                      aria-label={`Curseur de quantité pour ${entry.name}`}
                      type="range"
                      min={entry.minQuantity}
                      max={entry.maxQuantity}
                      step={1}
                      value={quantity}
                      onChange={(event) => updateQuote(entry, Number(event.target.value))}
                      className="w-full accent-brand-500"
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-ink-400"><span>{entry.minQuantity.toLocaleString("fr-FR")}</span><span>{entry.maxQuantity.toLocaleString("fr-FR")}</span></div>
                    <div className="mt-3 rounded-md bg-white px-3 py-2 text-center">
                      <span className="text-xs text-ink-500">{quantity.toLocaleString("fr-FR")} unités → </span>
                      <span className="text-base font-bold text-ink-900">{formatXof(quote?.priceClientXof ?? entry.priceClientXof)}</span>
                      {isCalculating && <span className="ml-2 text-xs text-ink-400">Calcul…</span>}
                      {quoteStatus[entry.id] === "error" && <span className="ml-2 text-xs text-rose-600">Calcul indisponible</span>}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 border-y border-ink-100 py-3 text-xs">
                    <div><p className="text-ink-400">Prix client</p><p className="mt-1 font-semibold text-ink-900">{formatXof(quote?.priceClientXof ?? entry.priceClientXof)}</p></div>
                    <div><p className="text-ink-400">Coût réel</p><p className="mt-1 font-medium text-ink-700">{formatXof(quote?.costProviderXof ?? entry.costProviderXof)}</p></div>
                    <div><p className="text-ink-400">Marge brute</p><p className="mt-1 font-semibold text-emerald-700">{formatXof(quote?.marginXof ?? entry.marginXof)}</p></div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    {entry.provider.refillSupported && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">Refill</span>}
                    {!entry.provider.isActiveUpstream && <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">Fournisseur inactif</span>}
                    <button onClick={() => startEdit(entry)} className="ml-auto text-sm font-medium text-brand-600 hover:text-brand-700">Modifier</button>
                    <button onClick={() => remove(entry)} className="text-sm font-medium text-rose-600 hover:text-rose-800">Supprimer</button>
                  </div>
                </article>;
              })}
            </div>
          ) : (
            <div className="rounded-xl2 border border-ink-100 bg-white p-10 text-center text-sm text-ink-400">Aucun service ne correspond à ces filtres.</div>
          )}

          {pageCount > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button variant="secondary" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Précédent</Button>
              <span className="text-sm text-ink-500">Page {page} / {pageCount}</span>
              <Button variant="secondary" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Suivant</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
