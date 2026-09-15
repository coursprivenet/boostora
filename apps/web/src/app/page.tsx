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
      <section className="border-b border-ink-100 bg-gradient-to-b from-white to-ink-50 px-6 py-20 text-center">
        <h1 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight text-ink-900">
          Développe ta présence sur les réseaux sociaux
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-ink-500">
          Followers, vues, likes et engagement, livrés rapidement et payables en Mobile Money
          (Orange, Moov, Coris, Telecel).
        </p>
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
