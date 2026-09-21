"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { CatalogItem } from "@/lib/types";
import { ServiceCard } from "@/components/ServiceCard";
import { Tooltip } from "@/components/Tooltip";
import { NetworkLogo } from "@/components/NetworkLogo";
import type { SocialNetworkSlug } from "@/lib/social-networks";

const PAGE_SIZE = 20;
const PLATFORM_PREFIXES = ["Instagram", "TikTok", "Facebook", "YouTube", "Spotify", "X", "WhatsApp", "Snapchat", "LinkedIn", "Telegram"];
const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", youtube: "YouTube",
  spotify: "Spotify", twitter: "X (Twitter)", whatsapp: "WhatsApp", snapchat: "Snapchat",
  linkedin: "LinkedIn", telegram: "Telegram",
};

// Category names are stored as "<Plateforme> <Type>" in French (e.g. "Instagram Abonnés").
function typeOf(categoryName: string): string {
  for (const prefix of PLATFORM_PREFIXES) {
    if (categoryName.startsWith(prefix + " ")) return categoryName.slice(prefix.length + 1);
  }
  return categoryName;
}

const TYPE_PRIORITY = ["Abonnés", "J'aime", "Commentaires", "Partages"];
function typePriorityRank(type: string): number {
  const i = TYPE_PRIORITY.indexOf(type);
  return i === -1 ? TYPE_PRIORITY.length : i;
}

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

function CatalogueContent() {
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
      <section className="border-b-2 border-ink-900 bg-[#FFFBF0] px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between">
            <div className="text-center md:text-left flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-ink-500 sm:text-sm">
                Catalogue complet · Tous réseaux
              </p>
              <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
                Achète des abonnés, vues, likes et partages pour tous tes réseaux.
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-600 sm:text-base">
                Explore l&apos;ensemble de nos services pour propulser ta visibilité sur Instagram, TikTok, Facebook, YouTube et plus.
                Choisis ton offre, ajuste la quantité selon tes objectifs et règle en Francs CFA par Mobile Money en toute simplicité.
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- Memphis corporate illustration asset */}
            <img
              src="/illustrations/hero/jump.svg"
              alt="Wassago Catalogue"
              className="animate-hero-float w-28 shrink-0 sm:w-36 lg:w-44"
              style={{ animationDuration: "5s" }}
            />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl2 border-2 border-ink-900 bg-white p-3.5 shadow-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-black text-ink-900">
                01
              </span>
              <span className="text-xs font-bold text-ink-900 sm:text-sm">Paiement Mobile Money instantané</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl2 border-2 border-ink-900 bg-white p-3.5 shadow-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-black text-ink-900">
                02
              </span>
              <span className="text-xs font-bold text-ink-900 sm:text-sm">Livraison rapide & suivi en direct</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl2 border-2 border-ink-900 bg-white p-3.5 shadow-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-black text-ink-900">
                03
              </span>
              <span className="text-xs font-bold text-ink-900 sm:text-sm">Accessible dès 100 F CFA</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 overflow-x-hidden">
        {platforms.length > 0 && (
          <div className="mb-6 flex flex-wrap justify-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setPlatformFilter(null)}
              className={`inline-flex items-center gap-2 rounded-full border-2 border-ink-900 px-3.5 py-1.5 text-xs sm:text-sm font-semibold uppercase transition-all active:scale-95 ${
                platformFilter === null
                  ? "bg-ink-900 text-brand-500 shadow-sm"
                  : "bg-white text-ink-900 hover:bg-brand-300/40"
              }`}
            >
              <svg
                className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>Tous</span>
              <span className={`text-[11px] font-bold ${platformFilter === null ? "text-brand-300" : "text-ink-400"}`}>
                ({services?.length ?? 0})
              </span>
            </button>
            {platforms.map(([pf, count]) => {
              const slug = pf.toLowerCase() as SocialNetworkSlug;
              const isKnown = [
                "instagram", "tiktok", "facebook", "youtube", "spotify",
                "twitter", "whatsapp", "snapchat", "linkedin", "telegram"
              ].includes(slug);

              return (
                <button
                  key={pf}
                  onClick={() => setPlatformFilter(pf)}
                  className={`inline-flex items-center gap-2 rounded-full border-2 border-ink-900 px-3.5 py-1.5 text-xs sm:text-sm font-semibold uppercase transition-all active:scale-95 ${
                    platformFilter === pf
                      ? "bg-ink-900 text-brand-500 shadow-sm"
                      : "bg-white text-ink-900 hover:bg-brand-300/40"
                  }`}
                >
                  {isKnown && (
                    <NetworkLogo network={slug} className="h-4 w-4 shrink-0" />
                  )}
                  <span>{PLATFORM_LABELS[pf] ?? pf}</span>
                  <span className={`text-[11px] font-bold ${platformFilter === pf ? "text-brand-300" : "text-ink-400"}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-8">
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-20">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-400">Filtres</p>
              {filterControls}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <span className="text-xs text-ink-500">
                {filtered.length} service{filtered.length > 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-900 shadow-sm"
              >
                <span>Filtres</span>
                {activeFilterCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-ink-900">
                    {activeFilterCount}
                  </span>
                )}
                <span>{filtersOpen ? "▲" : "▼"}</span>
              </button>
            </div>

            {filtersOpen && (
              <div className="mb-6 lg:hidden">
                {filterControls}
              </div>
            )}

            {services === null && !error && (
              <p className="py-20 text-center text-ink-400">Chargement des services…</p>
            )}
            {error && (
              <p className="py-20 text-center text-rose-500">
                Impossible de charger les services. Réessaie dans un instant.
              </p>
            )}

            {services !== null && !error && (
              <>
                {pageItems.length === 0 ? (
                  <p className="py-10 text-center text-ink-400">Aucun service pour ces filtres.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3 2xl:grid-cols-4">
                    {pageItems.map((item) => (
                      <ServiceCard key={item.id} item={item} />
                    ))}
                  </div>
                )}

                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 disabled:opacity-40"
                    >
                      Précédent
                    </button>
                    <span className="text-sm text-ink-500">
                      Page {page} sur {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="rounded border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium text-ink-700 disabled:opacity-40"
                    >
                      Suivant
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function CataloguePage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-[1600px] px-6 py-12 text-center text-ink-400">Chargement…</main>}>
      <CatalogueContent />
    </Suspense>
  );
}
