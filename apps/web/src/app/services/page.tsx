"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { CatalogItem } from "@/lib/types";
import { ServiceCard } from "@/components/ServiceCard";
import { Tooltip } from "@/components/Tooltip";

const PAGE_SIZE = 20;

export default function ServicesPage() {
  const [services, setServices] = useState<CatalogItem[] | null>(null);
  const [error, setError] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [refillOnly, setRefillOnly] = useState(false);
  const [sort, setSort] = useState<"default" | "price-asc" | "price-desc">("default");
  const [page, setPage] = useState(1);

  useEffect(() => {
    api
      .get<CatalogItem[]>("/catalog")
      .then(setServices)
      .catch(() => setError(true));
  }, []);

  const platforms = useMemo(() => {
    if (!services) return [];
    const counts = new Map<string, number>();
    for (const s of services) counts.set(s.platform, (counts.get(s.platform) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [services]);

  // Categories narrow to whatever platform is currently selected — irrelevant
  // categories from other platforms would just add noise to the sidebar.
  const categories = useMemo(() => {
    if (!services) return [];
    const scoped = platformFilter ? services.filter((s) => s.platform === platformFilter) : services;
    const counts = new Map<string, number>();
    for (const s of scoped) counts.set(s.category.name, (counts.get(s.category.name) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [services, platformFilter]);

  useEffect(() => {
    setCategoryFilter(null);
  }, [platformFilter]);

  useEffect(() => {
    setPage(1);
  }, [platformFilter, categoryFilter, refillOnly, sort]);

  const filtered = useMemo(() => {
    if (!services) return [];
    let list = services;
    if (platformFilter) list = list.filter((s) => s.platform === platformFilter);
    if (categoryFilter) list = list.filter((s) => s.category.name === categoryFilter);
    if (refillOnly) list = list.filter((s) => !s.riskWarning);
    if (sort !== "default") {
      list = [...list].sort((a, b) => {
        const diff = Number(a.priceClientXof) - Number(b.priceClientXof);
        return sort === "price-asc" ? diff : -diff;
      });
    }
    return list;
  }, [services, platformFilter, categoryFilter, refillOnly, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main>
      <section className="border-b-2 border-ink-900 bg-[#FFFBF0] px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 sm:flex-row sm:justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- static illustration asset */}
          <img
            src="/illustrations/hero/jump.svg"
            alt=""
            className="animate-hero-float w-28 shrink-0 sm:w-32"
            style={{ animationDuration: "5s" }}
          />
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-semibold tracking-tight text-ink-900">Nos services</h1>
            <p className="mx-auto mt-2 max-w-xl text-ink-500 sm:mx-0">
              Choisis un réseau, une quantité, et paie en Mobile Money.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-8">
        {platforms.length > 0 && (
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setPlatformFilter(null)}
              className={`rounded-full border-2 border-ink-900 px-4 py-1.5 text-sm font-semibold uppercase transition-colors ${
                platformFilter === null ? "bg-ink-900 text-brand-500" : "bg-white text-ink-900 hover:bg-brand-300/40"
              }`}
            >
              Tous ({services?.length ?? 0})
            </button>
            {platforms.map(([p, count]) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`rounded-full border-2 border-ink-900 px-4 py-1.5 text-sm font-semibold uppercase transition-colors ${
                  platformFilter === p ? "bg-ink-900 text-brand-500" : "bg-white text-ink-900 hover:bg-brand-300/40"
                }`}
              >
                {p} ({count})
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-center text-rose-600">Impossible de charger le catalogue.</p>}
        {!error && services === null && <p className="text-center text-ink-400">Chargement…</p>}
        {services !== null && services.length === 0 && (
          <p className="text-center text-ink-400">Catalogue en cours de préparation.</p>
        )}

        {services !== null && services.length > 0 && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
            <aside className="lg:sticky lg:top-4 lg:self-start">
              <div className="rounded-xl2 border-2 border-ink-900 bg-white p-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    Catégorie
                  </span>
                  <Tooltip text="Chaque catégorie regroupe les variantes d'un même type de service (ex: plusieurs offres de Followers Instagram qui diffèrent par prix, vitesse ou garantie de refill)." />
                </div>
                <div className="mt-2 flex max-h-72 flex-col gap-1 overflow-y-auto lg:max-h-[420px]">
                  <button
                    onClick={() => setCategoryFilter(null)}
                    className={`rounded-lg px-2 py-1.5 text-left text-sm ${
                      categoryFilter === null ? "bg-ink-900 font-semibold text-brand-500" : "text-ink-700 hover:bg-ink-50"
                    }`}
                  >
                    Toutes
                  </button>
                  {categories.map(([name, count]) => (
                    <button
                      key={name}
                      onClick={() => setCategoryFilter(name)}
                      className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm ${
                        categoryFilter === name
                          ? "bg-ink-900 font-semibold text-brand-500"
                          : "text-ink-700 hover:bg-ink-50"
                      }`}
                    >
                      <span className="truncate">{name}</span>
                      <span className="ml-2 shrink-0 text-xs text-ink-400">{count}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-4 border-t border-ink-100 pt-4">
                  <label className="flex items-start gap-2 text-sm text-ink-700">
                    <input
                      type="checkbox"
                      checked={refillOnly}
                      onChange={(e) => setRefillOnly(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span className="flex items-center gap-1">
                      Avec refill uniquement
                      <Tooltip text="Le refill est une garantie : si le nombre livré baisse après coup (compte suspendu, purge de la plateforme...), le service le remplace gratuitement pendant une période donnée. Sans refill, aucun remplacement n'est offert." />
                    </span>
                  </label>
                </div>

                <div className="mt-4 border-t border-ink-100 pt-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Trier par prix</span>
                  </div>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as typeof sort)}
                    className="mt-2 w-full rounded-lg border border-ink-200 px-2 py-1.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400"
                  >
                    <option value="default">Par défaut</option>
                    <option value="price-asc">Prix croissant</option>
                    <option value="price-desc">Prix décroissant</option>
                  </select>
                </div>
              </div>
            </aside>

            <div>
              <p className="mb-4 text-sm text-ink-400">
                {filtered.length} service{filtered.length !== 1 ? "s" : ""}
                {totalPages > 1 && ` — page ${page}/${totalPages}`}
              </p>

              {filtered.length === 0 && (
                <p className="py-10 text-center text-ink-400">Aucun service pour ces filtres.</p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {pageItems.map((item) => (
                  <ServiceCard key={item.id} item={item} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-lg border-2 border-ink-900 px-3 py-1.5 text-sm font-semibold text-ink-900 disabled:opacity-30"
                  >
                    ← Précédent
                  </button>
                  <span className="px-2 text-sm text-ink-500">
                    Page {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-lg border-2 border-ink-900 px-3 py-1.5 text-sm font-semibold text-ink-900 disabled:opacity-30"
                  >
                    Suivant →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
