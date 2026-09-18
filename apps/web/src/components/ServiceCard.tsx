import Link from "next/link";
import { CatalogItem } from "@/lib/types";
import { formatXof } from "@/lib/format";
import { Tooltip } from "./Tooltip";

function unitLabel(item: CatalogItem) {
  if (item.unit === "per_order") return "/ commande";
  return `/ ${item.referenceQuantity.toLocaleString("fr-FR")}`;
}

// Supplier labels are sometimes entered in English. Translate only the unambiguous
// service words here; the underlying catalog data and commercial conditions stay intact.
function displayName(name: string) {
  return name
    .replace(/\bSubscribers?\b/gi, "Abonnés")
    .replace(/\bFollowers?\b/gi, "Abonnés")
    .replace(/\bLikes?\b/gi, "J'aime")
    .replace(/\bViews?\b/gi, "Vues")
    .replace(/\bComments?\b/gi, "Commentaires")
    .replace(/\bShares?\b/gi, "Partages");
}

function displayPlatform(platform: string) {
  return ({ instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", youtube: "YouTube", spotify: "Spotify", twitter: "X (Twitter)", whatsapp: "WhatsApp", snapchat: "Snapchat", linkedin: "LinkedIn", telegram: "Telegram" } as Record<string, string>)[platform] ?? platform;
}

function isGenericNoRefillWarning(warning: string | null): boolean {
  return Boolean(warning && /(?:sans|pas de) refill|r[ée]sultats? non garantis?/i.test(warning));
}

export function ServiceCard({ item }: { item: CatalogItem }) {
  return (
    <div className="flex flex-col justify-between rounded-xl2 border border-ink-200 bg-white p-5 shadow-[0_3px_12px_rgba(10,11,15,0.04)] transition-all hover:-translate-y-0.5 hover:border-ink-900 hover:shadow-card">
      <div>
        <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-900">
          {displayPlatform(item.platform)}
        </span>
        <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-ink-900">{displayName(item.name)}</h3>
        {item.description && (
          <p className="mt-1.5 line-clamp-2 text-sm text-ink-500">{item.description}</p>
        )}
        {!item.refillSupported && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-500">
            Sans refill
            <Tooltip text="Ce service n'inclut pas de remplacement automatique si une partie de la livraison baisse plus tard." />
          </p>
        )}
        {item.riskWarning && !isGenericNoRefillWarning(item.riskWarning) && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs leading-relaxed text-amber-800">
            <span>⚠️ {item.riskWarning}</span>
            <Tooltip text="Information spécifique à cette offre." />
          </p>
        )}
        <p className="mt-4 text-xs text-ink-400">
          Min {item.minQuantity.toLocaleString("fr-FR")} · Max {item.maxQuantity.toLocaleString("fr-FR")}
        </p>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-ink-100 pt-4">
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
