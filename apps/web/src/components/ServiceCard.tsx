import Link from "next/link";
import { CatalogItem } from "@/lib/types";
import { formatXof } from "@/lib/format";
import { Tooltip } from "./Tooltip";

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
          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
            <span>⚠ {item.riskWarning}</span>
            <Tooltip text="Si le nombre livré baisse après coup (compte suspendu, purge de la plateforme, etc.), ce service ne recompense pas automatiquement — et aucun chiffre n'est garanti à 100%, les réseaux sociaux gardent le contrôle final." />
          </p>
        )}
        <p className="mt-3 text-xs text-ink-400">
          Min {item.minQuantity.toLocaleString("fr-FR")} · Max {item.maxQuantity.toLocaleString("fr-FR")}
        </p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="flex items-center gap-1 text-lg font-semibold text-ink-900">
          {formatXof(item.priceClientXof)}
          <span className="text-xs font-normal text-ink-400">{UNIT_LABEL[item.unit] ?? ""}</span>
          <Tooltip text="Prix de référence pour 1000 unités. Le montant réel se calcule automatiquement selon la quantité que tu choisis au moment de commander." />
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
