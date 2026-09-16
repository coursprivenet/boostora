import Link from "next/link";
import { CatalogItem } from "@/lib/types";
import { formatXof } from "@/lib/format";
import { Tooltip } from "./Tooltip";

function unitLabel(item: CatalogItem) {
  if (item.unit === "per_order") return "/ commande";
  return `/ ${item.referenceQuantity.toLocaleString("fr-FR")}`;
}

export function ServiceCard({ item }: { item: CatalogItem }) {
  return (
    <div className="flex flex-col justify-between rounded-xl2 border-2 border-ink-900 bg-white p-5 transition-transform hover:-translate-y-0.5">
      <div>
        <span className="inline-flex items-center rounded-full border-2 border-ink-900 bg-brand-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-900">
          {item.platform}
        </span>
        <h3 className="mt-2 text-base font-semibold text-ink-900">{item.name}</h3>
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1 text-lg font-semibold text-ink-900">
          {formatXof(item.priceClientXof)}
          <span className="text-xs font-normal text-ink-400">{unitLabel(item)}</span>
          <Tooltip text={`Prix de référence pour ${item.referenceQuantity.toLocaleString("fr-FR")} unités (la quantité minimum utile pour ce service). Le montant réel se calcule automatiquement selon la quantité que tu choisis au moment de commander.`} />
        </span>
        <Link
          href={`/checkout/${item.id}`}
          className="shrink-0 rounded-lg border-2 border-ink-900 bg-ink-900 px-3.5 py-2 text-sm font-semibold text-brand-500 transition-colors hover:bg-brand-500 hover:text-ink-900"
        >
          Commander
        </Link>
      </div>
    </div>
  );
}
