import Link from "next/link";
import { CatalogItem } from "@/lib/types";
import { formatXof } from "@/lib/format";

const UNIT_LABEL: Record<string, string> = {
  per_1000: "/ 1000",
  per_order: "/ commande",
};

export function ServiceCard({ item }: { item: CatalogItem }) {
  return (
    <div className="flex flex-col justify-between rounded-xl2 border border-ink-100 bg-white p-5 shadow-soft transition-shadow hover:shadow-card">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-brand-500">
          {item.platform}
        </p>
        <h3 className="mt-1 text-base font-semibold text-ink-900">{item.name}</h3>
        {item.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-ink-500">{item.description}</p>
        )}
        {item.riskWarning && (
          <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
            ⚠ {item.riskWarning}
          </p>
        )}
        <p className="mt-3 text-xs text-ink-400">
          Min {item.minQuantity.toLocaleString("fr-FR")} · Max {item.maxQuantity.toLocaleString("fr-FR")}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-lg font-semibold text-ink-900">
          {formatXof(item.priceClientXof)}
          <span className="ml-1 text-xs font-normal text-ink-400">
            {UNIT_LABEL[item.unit] ?? ""}
          </span>
        </span>
        <Link
          href={`/checkout/${item.id}`}
          className="rounded-lg bg-ink-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-ink-800"
        >
          Commander
        </Link>
      </div>
    </div>
  );
}
