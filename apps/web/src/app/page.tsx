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

export default async function HomePage() {
  let services: CatalogItem[] = [];
  try {
    services = await api.get<CatalogItem[]>("/catalog");
  } catch {
    services = [];
  }
  const grouped = groupByCategory(services);

  return (
    <main>
      <section className="border-b border-ink-100 bg-[#FFFBF0] px-6 py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <h1 className="mx-auto max-w-xl text-4xl font-semibold tracking-tight text-ink-900 lg:mx-0">
              Développe ta présence sur les réseaux sociaux
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-ink-500 lg:mx-0">
              Followers, vues, likes et engagement, livrés rapidement et payables en Mobile Money
              (Orange, Moov, Coris, Telecel).
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- static illustration asset, not a dynamic/optimized image */}
          <img
            src="/illustrations/hero.svg"
            alt=""
            className="animate-hero-float mx-auto w-full max-w-lg lg:max-w-none"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        {grouped.size === 0 && (
          <p className="text-center text-ink-400">Catalogue en cours de préparation.</p>
        )}
        {Array.from(grouped.entries()).map(([category, items]) => (
          <div key={category} className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-ink-900">{category}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
