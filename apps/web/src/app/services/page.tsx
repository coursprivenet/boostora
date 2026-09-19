"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { CatalogItem } from "@/lib/types";
import { ServiceCard } from "@/components/ServiceCard";
import { Tooltip } from "@/components/Tooltip";

const PAGE_SIZE = 20;
const PLATFORM_PREFIXES = ["Instagram", "TikTok", "Facebook", "YouTube", "Spotify", "X", "WhatsApp", "Snapchat", "LinkedIn", "Telegram"];
const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", youtube: "YouTube",
  spotify: "Spotify", twitter: "X (Twitter)", whatsapp: "WhatsApp", snapchat: "Snapchat",
  linkedin: "LinkedIn", telegram: "Telegram",
};

// Category names are stored as "<Plateforme> <Type>" in French (e.g. "Instagram Abonnés").
// Stripping the known platform prefix gives the type on its own, which is what lets a
// "Abonnés" filter match across all 4 platforms instead of listing 42 raw categories.
function typeOf(categoryName: string): string {
  for (const prefix of PLATFORM_PREFIXES) {
    if (categoryName.startsWith(prefix + " ")) return categoryName.slice(prefix.length + 1);
  }
  return categoryName;
}

// The most-ordered types lead, regardless of which platform is filtered — everything
// else follows by how many services exist for it.
const TYPE_PRIORITY = ["Abonnés", "J'aime", "Commentaires", "Partages"];
function typePriorityRank(type: string): number {
  const i = TYPE_PRIORITY.indexOf(type);
  return i === -1 ? TYPE_PRIORITY.length : i;
}

// "Tous" is a storefront, not a raw provider export. Lead with the core offers a
// customer expects to find first; specialised services keep their normal position
// afterwards. Bot-labelled offers are deliberately last whatever their category.
const CATEGORY_PRIORITY = [
  "facebook-followers",
  "facebook-likes",
  "instagram-followers",
  "youtube-views",
  "tiktok-followers",
  "facebook-views",
  "instagram-likes",
  "tiktok-views",
  "youtube-subscribers",
  "facebook-reactions",
  "instagram-views",
  "tiktok-likes",
  "facebook-shares",
  "instagram-shares",
  "tiktok-shares",
  "youtube-likes",
  "facebook-comments",
  "instagram-comments",
  "tiktok-comments",
  "youtube-comments",
];

function defaultCatalogRank(service: CatalogItem): number {
  const categoryRank = CATEGORY_PRIORITY.indexOf(service.category.slug);
  if (categoryRank !== -1) return categoryRank;
  return 100 + typePriorityRank(typeOf(service.category.name));
}

function isBotService(service: CatalogItem): boolean {
  return /\bbot\b/i.test(service.name);
}

const COUNTRY_TOKENS = [
  "Italie", "Espagne", "Brésil", "Turquie", "Inde", "Indonésie", "Allemagne", "Thaïlande",
  "Irak", "Corée", "Égypte", "Vietnam", "Grèce", "Argentine", "Mexique", "États-Unis", "USA",
  "Royaume-Uni", "UK", "Arabie Saoudite", "Nigeria", "Pakistan", "Canada", "Philippines",
  "Iran", "Portugal", "France", "Israël", "Golfe", "Arabe", "Latino", "Turc", "Brésilien",
  "Espagnol", "Italien", "Indien", "Indonésien",
];
function isCountryTargeted(name: string): boolean {
  return COUNTRY_TOKENS.some((t) => name.includes(t));
}

export default function ServicesPage() {
  const searchParams = useSearchParams();
  const [services, setServices] = useState<CatalogItem[] | null>(null);
  const [error, setError] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [targetingFilter, setTargetingFilter] = useState<"all" | "worldwide" | "country">("all");
  const [refillOnly, setRefillOnly] = useState(false);
  const [sort, setSort] = useState<"default" | "price-asc" | "price-desc">("default");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const platform = searchParams.get("platform");
    setPlatformFilter(platform && PLATFORM_LABELS[platform] ? platform : null);
  }, [searchParams]);

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

  // Types narrow to whatever platform is selected, same reasoning as before —
  // irrelevant types would just be noise in the dropdown.
  const types = useMemo(() => {
    if (!services) return [];
    const scoped = platformFilter ? services.filter((s) => s.platform === platformFilter) : services;
    const counts = new Map<string, number>();
    for (const s of scoped) {
      const t = typeOf(s.category.name);
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => {
      const rankDiff = typePriorityRank(a[0]) - typePriorityRank(b[0]);
      return rankDiff !== 0 ? rankDiff : b[1] - a[1];
    });
  }, [services, platformFilter]);

  useEffect(() => {
    setTypeFilter(null);
  }, [platformFilter]);

  useEffect(() => {
    setPage(1);
  }, [platformFilter, typeFilter, targetingFilter, refillOnly, sort]);

  const filtered = useMemo(() => {
    if (!services) return [];
    let list = services;
    if (platformFilter) list = list.filter((s) => s.platform === platformFilter);
    if (typeFilter) list = list.filter((s) => typeOf(s.category.name) === typeFilter);
    if (targetingFilter !== "all") {
      list = list.filter((s) => isCountryTargeted(s.name) === (targetingFilter === "country"));
    }
    if (refillOnly) list = list.filter((s) => s.refillSupported);
    if (sort === "default") {
      list = [...list].sort((a, b) => {
        // Bots always remain at the very end. Keep the storefront's editorial
        // sequence, while putting refill variants before non-refill variants
        // within each service family (followers, likes, views, etc.).
        const botDiff = Number(isBotService(a)) - Number(isBotService(b));
        if (botDiff !== 0) return botDiff;
        const categoryDiff = defaultCatalogRank(a) - defaultCatalogRank(b);
        if (categoryDiff !== 0) return categoryDiff;
        const refillDiff = Number(b.refillSupported) - Number(a.refillSupported);
        if (refillDiff !== 0) return refillDiff;
        return a.name.localeCompare(b.name, "fr");
      });
    } else {
      list = [...list].sort((a, b) => {
        const diff = Number(a.priceClientXof) - Number(b.priceClientXof);
        return sort === "price-asc" ? diff : -diff;
      });
    }
    return list;
  }, [services, platformFilter, typeFilter, targetingFilter, refillOnly, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectClass =
    "mt-1.5 w-full rounded-lg border border-ink-200 px-2.5 py-2 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-400";
  const activeFilterCount = [typeFilter, targetingFilter !== "all", refillOnly, sort !== "default"].filter(Boolean).length;
  const filterControls = (
    <div className="rounded-xl2 border border-ink-200 bg-white p-4 shadow-[0_3px_12px_rgba(10,11,15,0.04)] lg:border-2 lg:border-ink-900 lg:shadow-none">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Type</span>
        <Tooltip text="Le type de service (Abonnés, J'aime, Vues, Commentaires, Lives...), croisé avec le réseau choisi en haut." />
      </div>
      <select value={typeFilter ?? ""} onChange={(e) => setTypeFilter(e.target.value || null)} className={selectClass}>
        <option value="">Tous les types</option>
        {types.map(([t, count]) => <option key={t} value={t}>{t} ({count})</option>)}
      </select>

      <div className="mt-4 flex items-center gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Ciblage</span>
        <Tooltip text="Certaines offres livrent depuis un mix mondial de comptes, d'autres ciblent un pays précis (souvent plus cher, utile si ton audience doit sembler locale)." />
      </div>
      <select value={targetingFilter} onChange={(e) => setTargetingFilter(e.target.value as typeof targetingFilter)} className={selectClass}>
        <option value="all">Tous</option>
        <option value="worldwide">Mondial</option>
        <option value="country">Pays ciblé</option>
      </select>

      <div className="mt-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">Trier par prix</span>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={selectClass}>
          <option value="default">Par défaut</option>
          <option value="price-asc">Prix croissant</option>
          <option value="price-desc">Prix décroissant</option>
        </select>
      </div>

      <div className="mt-4 border-t border-ink-100 pt-4">
        <label className="flex items-start gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={refillOnly} onChange={(e) => setRefillOnly(e.target.checked)} className="mt-0.5" />
          <span className="flex items-center gap-1">
            Avec refill uniquement
            <Tooltip text="Le refill est une garantie : si le nombre livré baisse après coup (compte suspendu, purge de la plateforme...), le service le remplace gratuitement pendant une période donnée. Sans refill, aucun remplacement n'est offert." />
          </span>
        </label>
      </div>
    </div>
  );

  return (
    <main>
      <section className="border-b-2 border-ink-900 bg-[#FFFBF0] px-6 py-10">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center gap-6 sm:flex-row sm:justify-center">
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

      <section className="mx-auto max-w-[1600px] px-6 py-8">
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
            {platforms.map(([pf, count]) => (
              <button
                key={pf}
                onClick={() => setPlatformFilter(pf)}
                className={`rounded-full border-2 border-ink-900 px-4 py-1.5 text-sm font-semibold uppercase transition-colors ${
                  platformFilter === pf ? "bg-ink-900 text-brand-500" : "bg-white text-ink-900 hover:bg-brand-300/40"
                }`}
              >
                {PLATFORM_LABELS[pf] ?? pf} ({count})
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
            <aside className="lg:sticky lg:top-4 lg:self-start">
              <div className="lg:hidden">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((open) => !open)}
                  aria-expanded={filtersOpen}
                  className="flex w-full items-center justify-between rounded-xl2 border-2 border-ink-900 bg-white px-4 py-3 text-sm font-semibold text-ink-900"
                >
                  <span>Filtres et tri{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</span>
                  <span aria-hidden="true">{filtersOpen ? "−" : "+"}</span>
                </button>
                {filtersOpen && <div className="mt-3">{filterControls}</div>}
              </div>
              <div className="hidden lg:block">{filterControls}</div>
            </aside>

            <div>
              <p className="mb-4 text-sm text-ink-400">
                {filtered.length} service{filtered.length !== 1 ? "s" : ""}
                {totalPages > 1 && ` — page ${page}/${totalPages}`}
              </p>

              {filtered.length === 0 && (
                <p className="py-10 text-center text-ink-400">Aucun service pour ces filtres.</p>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
