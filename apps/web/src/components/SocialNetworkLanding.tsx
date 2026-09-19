"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { CatalogItem } from "@/lib/types";
import { SOCIAL_NETWORKS, type SocialNetworkSlug } from "@/lib/social-networks";
import { ServiceCard } from "./ServiceCard";

export function SocialNetworkLanding({ network }: { network: SocialNetworkSlug }) {
  const content = SOCIAL_NETWORKS[network];
  const [services, setServices] = useState<CatalogItem[] | null>(null);

  useEffect(() => {
    api.get<CatalogItem[]>("/catalog").then(setServices).catch(() => setServices([]));
  }, []);

  const offers = useMemo(() => {
    if (!services) return [];
    return services
      .filter((service) => service.platform === network)
      .sort((a, b) => Number(b.refillSupported) - Number(a.refillSupported) || Number(a.priceClientXof) - Number(b.priceClientXof));
  }, [network, services]);

  return (
    <main className="overflow-hidden">
      <section className="relative border-b-2 border-ink-900 bg-[#FFFBF0] px-6 py-14 sm:py-20">
        <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full bg-brand-500/55 blur-3xl" />
        <div className="absolute -bottom-28 left-1/4 h-56 w-56 rounded-full bg-brand-300/70 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.25fr_.75fr]">
          <div className="text-center lg:text-left">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-ink-500">{content.eyebrow}</p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.94] tracking-tight text-ink-900 sm:text-6xl lg:text-7xl">
              {content.headline}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-600 sm:text-lg lg:mx-0">{content.body}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <a href="#offres" className="rounded-lg border-2 border-ink-900 bg-ink-900 px-5 py-3 text-sm font-semibold text-brand-500 transition hover:bg-brand-500 hover:text-ink-900">Voir les offres {content.name}</a>
              <Link href={`/services?platform=${network}`} className="rounded-lg border-2 border-ink-900 bg-white px-5 py-3 text-sm font-semibold text-ink-900 transition hover:bg-brand-300">Tout le catalogue</Link>
            </div>
          </div>
          <div className="mx-auto flex aspect-square w-full max-w-[330px] items-center justify-center rounded-[2.5rem] border-2 border-ink-900 bg-ink-900 p-6 shadow-[12px_12px_0_#FFD400]">
            <div className="flex h-full w-full items-center justify-center rounded-[2rem] border-2 border-brand-500 bg-brand-500 text-7xl font-black tracking-tighter text-ink-900 sm:text-8xl">{content.accent}</div>
          </div>
        </div>
      </section>

      <section className="border-b border-ink-200 bg-white px-6 py-8">
        <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-3">
          {content.benefits.map((benefit, index) => (
            <div key={benefit} className="flex items-center gap-3 rounded-xl2 border border-ink-200 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-black text-ink-900">0{index + 1}</span>
              <span className="text-sm font-semibold text-ink-900">{benefit}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="offres" className="mx-auto max-w-6xl px-6 py-14 sm:py-16">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-600">Passe à l’action</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">Les services {content.name} disponibles</h2>
            <p className="mt-2 max-w-xl text-ink-500">Choisis exactement ce que tu veux faire monter. Tu définis ta quantité avant de payer.</p>
          </div>
          <Link href={`/services?platform=${network}`} className="text-sm font-semibold text-ink-900 underline decoration-brand-500 decoration-2 underline-offset-4">Voir toutes les offres</Link>
        </div>

        {services === null && <p className="py-12 text-center text-ink-400">Chargement des offres…</p>}
        {services !== null && offers.length === 0 && <p className="py-12 text-center text-ink-400">Les offres arrivent bientôt.</p>}
        {offers.length > 0 && <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{offers.slice(0, 6).map((service) => <ServiceCard key={service.id} item={service} />)}</div>}
      </section>

      <section className="bg-ink-900 px-6 py-14 text-center">
        <h2 className="text-3xl font-semibold text-white">Ton compte {content.name} mérite plus d’impact.</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-300">Choisis ton service, ta quantité et ton paiement. Le suivi de la commande reste dans ton espace Wassago.</p>
        <a href="#offres" className="mt-7 inline-block rounded-lg border-2 border-brand-500 bg-brand-500 px-6 py-3 text-sm font-semibold text-ink-900 transition hover:bg-ink-900 hover:text-brand-500">Choisir mon service</a>
      </section>
    </main>
  );
}
