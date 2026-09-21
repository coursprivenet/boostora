"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { CatalogItem } from "@/lib/types";
import { SOCIAL_NETWORKS, type SocialNetworkSlug } from "@/lib/social-networks";
import { ServiceCard } from "./ServiceCard";
import { NetworkLogo } from "./NetworkLogo";

const ANIMATION_DURATIONS: Record<SocialNetworkSlug, string> = {
  instagram: "4.8s",
  tiktok: "4.1s",
  facebook: "5.2s",
  youtube: "4.5s",
  spotify: "5.5s",
  twitter: "4.3s",
  whatsapp: "5.0s",
  snapchat: "4.6s",
  linkedin: "5.3s",
  telegram: "4.4s",
};

function getServiceType(service: CatalogItem): string {
  const text = `${service.name} ${service.category?.name ?? ""}`.toLowerCase();
  if (text.includes("abonné") || text.includes("follower") || text.includes("subscriber")) return "Abonnés";
  if (text.includes("vue") || text.includes("view") || text.includes("écoute") || text.includes("play")) return "Vues";
  if (text.includes("like") || text.includes("j'aime") || text.includes("réaction") || text.includes("reaction")) return "Likes";
  if (text.includes("commentaire") || text.includes("comment")) return "Commentaires";
  if (text.includes("partage") || text.includes("share") || text.includes("repost")) return "Partages";
  return "Autres";
}

function getCategoryIcon(type: string) {
  switch (type) {
    case "Abonnés":
      return (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "Vues":
      return (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "Likes":
      return (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      );
    case "Commentaires":
      return (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "Partages":
      return (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
      );
    case "ALL":
      return (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      );
    default:
      return (
        <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
  }
}

export function SocialNetworkLanding({ network }: { network: SocialNetworkSlug }) {
  const content = SOCIAL_NETWORKS[network];
  const [services, setServices] = useState<CatalogItem[] | null>(null);
  const [selectedType, setSelectedType] = useState<string>("ALL");

  useEffect(() => {
    api.get<CatalogItem[]>("/catalog").then(setServices).catch(() => setServices([]));
  }, []);

  const offers = useMemo(() => {
    if (!services) return [];
    return services
      .filter((service) => service.platform === network)
      .sort((a, b) => Number(b.refillSupported) - Number(a.refillSupported) || Number(a.priceClientXof) - Number(b.priceClientXof));
  }, [network, services]);

  const availableTypes = useMemo(() => {
    if (!offers.length) return [];
    const map: Record<string, number> = {};
    for (const s of offers) {
      const t = getServiceType(s);
      map[t] = (map[t] || 0) + 1;
    }
    const order = ["Abonnés", "Vues", "Likes", "Commentaires", "Partages", "Autres"];
    return order.filter((t) => map[t] && map[t] > 0).map((t) => ({ type: t, count: map[t] }));
  }, [offers]);

  const displayedOffers = useMemo(() => {
    if (selectedType === "ALL") return offers;
    return offers.filter((s) => getServiceType(s) === selectedType);
  }, [offers, selectedType]);

  return (
    <main className="overflow-hidden">
      {/* Direct to Target Header */}
      <section className="relative border-b-2 border-ink-900 bg-[#FFFBF0] px-4 py-8 sm:px-6 sm:py-10">
        <div className="absolute -right-20 -top-28 h-64 w-64 rounded-full bg-brand-500/35 blur-3xl pointer-events-none" />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-center">
            {/* Left Column: Direct Title & Value props */}
            <div className="flex-1 text-center md:text-left">
              {/* Pill Network Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-ink-900 bg-white px-3.5 py-1.5 shadow-sm">
                <span className="flex h-5 w-5 items-center justify-center text-ink-900">
                  <NetworkLogo network={network} className="h-full w-full" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-ink-900">
                  Offres {content.name} · Direct & Instantané
                </span>
              </div>

              {/* Direct Headline */}
              <h1 className="mt-4 max-w-2xl text-2xl font-bold leading-tight tracking-tight text-ink-900 sm:text-3xl lg:text-4xl">
                {content.headline}
              </h1>

              <p className="mt-2.5 max-w-xl text-xs leading-relaxed text-ink-600 sm:text-sm mx-auto md:mx-0">
                {content.body}
              </p>

              {/* Reassurance Micro-Badges (SVG-based, 0 cheap emojis) */}
              <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs font-semibold text-ink-800">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-200/80 px-3 py-1 border border-ink-900/10">
                  <svg className="h-3.5 w-3.5 text-ink-900 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                  Prise en charge 5 à 15 min
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-200/80 px-3 py-1 border border-ink-900/10">
                  <svg className="h-3.5 w-3.5 text-ink-900 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Zéro mot de passe requis
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-200/80 px-3 py-1 border border-ink-900/10">
                  <svg className="h-3.5 w-3.5 text-ink-900 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  Paiement Mobile Money sécurisé
                </span>
              </div>
            </div>

            {/* Right Column: Animated stylized logo card matching design system */}
            <div className="shrink-0 flex items-center justify-center">
              <div className="flex aspect-square w-24 sm:w-32 lg:w-40 items-center justify-center rounded-2xl sm:rounded-[2rem] border-2 border-ink-900 bg-ink-900 p-2 sm:p-3 lg:p-4 shadow-[6px_6px_0_#FFD400] sm:shadow-[8px_8px_0_#FFD400]">
                <div className="flex h-full w-full items-center justify-center rounded-xl sm:rounded-[1.4rem] border-2 border-brand-500 bg-brand-500 text-ink-900">
                  <div className="animate-hero-float" style={{ animationDuration: ANIMATION_DURATIONS[network] || "4.5s" }}>
                    <NetworkLogo network={network} className="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Filter Chips (Direct to Target) */}
          {availableTypes.length > 0 && (
            <div className="mt-6 flex w-full flex-wrap items-center justify-center md:justify-start gap-2 border-t border-ink-900/10 pt-5">
              <button
                type="button"
                onClick={() => setSelectedType("ALL")}
                className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition-all sm:text-sm ${
                  selectedType === "ALL"
                    ? "border-ink-900 bg-ink-900 text-brand-500 shadow-md"
                    : "border-ink-200 bg-white text-ink-700 hover:border-ink-900 hover:bg-brand-100"
                }`}
              >
                {getCategoryIcon("ALL")}
                <span>Tout voir</span>
                <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[11px] font-extrabold ${selectedType === "ALL" ? "bg-brand-500/20 text-brand-300" : "bg-ink-100 text-ink-600"}`}>
                  {offers.length}
                </span>
              </button>

              {availableTypes.map(({ type, count }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition-all sm:text-sm ${
                    selectedType === type
                      ? "border-ink-900 bg-ink-900 text-brand-500 shadow-md"
                      : "border-ink-200 bg-white text-ink-700 hover:border-ink-900 hover:bg-brand-100"
                  }`}
                >
                  {getCategoryIcon(type)}
                  <span>{type}</span>
                  <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[11px] font-bold ${selectedType === type ? "bg-brand-500/20 text-brand-300" : "bg-ink-100 text-ink-600"}`}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Offers Section - Direct below header */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between border-b border-ink-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-ink-900 sm:text-xl">
              {selectedType === "ALL" ? `Toutes les offres ${content.name}` : `Offres ${content.name} : ${selectedType}`}
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {displayedOffers.length} offre{displayedOffers.length > 1 ? "s" : ""} disponible{displayedOffers.length > 1 ? "s" : ""} immédiatement
            </p>
          </div>
          <Link
            href={`/catalogue?platform=${network}`}
            className="text-xs font-semibold text-ink-900 underline decoration-brand-500 decoration-2 underline-offset-4 hover:text-brand-600 sm:text-sm"
          >
            Filtres avancés →
          </Link>
        </div>

        {services === null && (
          <div className="py-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <p className="mt-2 text-sm text-ink-400">Chargement des meilleures offres…</p>
          </div>
        )}

        {services !== null && displayedOffers.length === 0 && (
          <div className="rounded-xl2 border border-dashed border-ink-200 p-8 text-center text-ink-400">
            Aucun service disponible pour cette catégorie pour l&apos;instant.
          </div>
        )}

        {displayedOffers.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayedOffers.map((service) => (
              <ServiceCard key={service.id} item={service} />
            ))}
          </div>
        )}
      </section>

      {/* Reassurance & Value Props */}
      <section className="border-t border-ink-200 bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-center text-xs font-bold uppercase tracking-wider text-ink-400">
            La garantie Wassago sur vos commandes {content.name}
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {content.benefits.map((benefit, index) => (
              <div
                key={benefit}
                className="flex items-center gap-3 rounded-xl2 border-2 border-ink-100 bg-ink-50/50 p-4 transition-colors hover:border-ink-900 hover:bg-white"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-black text-ink-900">
                  0{index + 1}
                </span>
                <span className="text-sm font-semibold text-ink-900">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compact Bottom Banner */}
      <section className="bg-ink-900 px-6 py-10 text-center text-white">
        <h2 className="text-xl font-bold sm:text-2xl">Prêt à faire grandir votre compte {content.name} ?</h2>
        <p className="mx-auto mt-2 max-w-md text-xs text-ink-300 sm:text-sm">
          Collez votre lien, sélectionnez votre volume et payez par Mobile Money en quelques secondes.
        </p>
        <Link
          href="/catalogue"
          className="mt-5 inline-block rounded-lg border-2 border-brand-500 bg-brand-500 px-5 py-2.5 text-xs font-bold text-ink-900 transition hover:bg-ink-900 hover:text-brand-500 sm:text-sm"
        >
          Découvrir tout le catalogue
        </Link>
      </section>
    </main>
  );
}
