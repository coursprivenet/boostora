"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { CatalogItem } from "@/lib/types";
import { ServiceCard } from "@/components/ServiceCard";

function groupByCategory(items: CatalogItem[]) {
  const groups = new Map<string, CatalogItem[]>();
  for (const item of items) {
    const key = item.category.name;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return groups;
}

export default function ServicesPage() {
  const [services, setServices] = useState<CatalogItem[] | null>(null);
  const [error, setError] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<CatalogItem[]>("/catalog")
      .then(setServices)
      .catch(() => setError(true));
  }, []);

  const platforms = useMemo(() => {
    if (!services) return [];
    return Array.from(new Set(services.map((s) => s.platform))).sort();
  }, [services]);

  const filtered = useMemo(() => {
    if (!services) return [];
    return platformFilter ? services.filter((s) => s.platform === platformFilter) : services;
  }, [services, platformFilter]);

  const grouped = groupByCategory(filtered);

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
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setPlatformFilter(null)}
              className={`rounded-full border-2 border-ink-900 px-4 py-1.5 text-sm font-semibold uppercase transition-colors ${
                platformFilter === null ? "bg-ink-900 text-brand-500" : "bg-white text-ink-900 hover:bg-brand-300/40"
              }`}
            >
              Tous
            </button>
            {platforms.map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`rounded-full border-2 border-ink-900 px-4 py-1.5 text-sm font-semibold uppercase transition-colors ${
                  platformFilter === p ? "bg-ink-900 text-brand-500" : "bg-white text-ink-900 hover:bg-brand-300/40"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-center text-rose-600">Impossible de charger le catalogue.</p>}
        {!error && services === null && <p className="text-center text-ink-400">Chargement…</p>}
        {services !== null && services.length === 0 && (
          <p className="text-center text-ink-400">Catalogue en cours de préparation.</p>
        )}

        {Array.from(grouped.entries()).map(([category, items]) => (
          <div key={category} className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-ink-900">{category}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((item) => (
                <ServiceCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
