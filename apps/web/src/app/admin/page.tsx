"use client";

import { useEffect, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { api } from "@/lib/api";
import { AdminStats } from "@/lib/types";
import { formatXof } from "@/lib/format";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl2 border border-ink-100 bg-white p-5 shadow-soft">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-ink-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ink-400">{sub}</p>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const { token, isAdmin } = useRequireAdmin();
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    if (!token || !isAdmin) return;
    api.get<AdminStats>("/admin/stats", token).then(setStats);
  }, [token, isAdmin]);

  if (!stats) return <p className="text-ink-400">Chargement…</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink-900">Vue d&apos;ensemble</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Chiffre d'affaires" value={formatXof(stats.totalRevenueXof)} />
        <StatCard
          label="Marge catalogue"
          value={formatXof(stats.grossMarginXof)}
          sub="majoration configurée"
        />
        <StatCard
          label="Marge de change"
          value={formatXof(stats.fxMarginXof)}
          sub="taux commercial − taux d'achat"
        />
        <StatCard label="Marge cumulée brute" value={formatXof(stats.cumulativeGrossMarginXof)} sub="avant frais de paiement" />
        <StatCard label="Marge cumulée nette" value={formatXof(stats.cumulativeNetMarginXof)} sub="après frais YengaPay / Crypto" />
        <StatCard label="Utilisateurs" value={String(stats.totalUsers)} />
        <StatCard label="Commandes totales" value={String(stats.totalOrders)} />
        <StatCard label="Commandes payées" value={String(stats.paidOrdersCount)} />
        <StatCard label="Commandes en échec" value={String(stats.failedOrders)} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl2 border border-ink-100 bg-white p-5 shadow-soft">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Commandes par statut</h2>
          <div className="flex flex-col gap-2 text-sm">
            {Object.entries(stats.ordersByStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between text-ink-600">
                <span>{status}</span>
                <span className="font-medium text-ink-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl2 border border-ink-100 bg-white p-5 shadow-soft">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Services les plus vendus</h2>
          <div className="flex flex-col gap-2 text-sm">
            {stats.topServices.length === 0 && <p className="text-ink-400">Aucune vente pour l&apos;instant.</p>}
            {stats.topServices.map((s) => (
              <div key={s.name} className="flex justify-between text-ink-600">
                <span>
                  {s.name} <span className="text-ink-400">×{s.count}</span>
                </span>
                <span className="font-medium text-ink-900">{formatXof(s.revenueXof)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
