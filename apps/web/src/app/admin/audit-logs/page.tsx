"use client";

import { useEffect, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { api } from "@/lib/api";
import { AuditLogRow } from "@/lib/types";

const ACTIONS = [
  "catalog.create",
  "catalog.update",
  "catalog.delete",
  "category.create",
  "category.update",
  "category.delete",
  "coupon.create",
  "coupon.update",
  "coupon.delete",
  "exchange_rate.set",
  "order.manual_resubmit",
  "order.cancel",
  "order.refill_request",
  "ticket.status_change",
  "user.role_change",
];

export default function AdminAuditLogsPage() {
  const { token, isAdmin } = useRequireAdmin();
  const [logs, setLogs] = useState<AuditLogRow[] | null>(null);
  const [actionFilter, setActionFilter] = useState("");

  useEffect(() => {
    if (!token || !isAdmin) return;
    api.get<AuditLogRow[]>("/admin/audit-logs", token).then(setLogs);
  }, [token, isAdmin]);

  const filtered = logs?.filter((l) => !actionFilter || l.action === actionFilter);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-900">Journal d&apos;audit</h1>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900"
        >
          <option value="">Toutes les actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {!logs && <p className="text-ink-400">Chargement…</p>}

      {filtered && (
        <div className="overflow-x-auto rounded-xl2 border border-ink-100 bg-white shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Acteur</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Cible</th>
                <th className="px-4 py-3">Détails</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log) => (
                <tr key={log.id} className="border-b border-ink-50 align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-ink-400">
                    {new Date(log.createdAt).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-ink-700">{log.actorEmail}</td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-ink-50 px-1.5 py-0.5 text-xs text-ink-700">
                      {log.action}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-ink-400">
                    {log.targetId ? (
                      <span className="font-mono text-xs">{log.targetId.slice(0, 12)}…</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {log.metadata ? (
                      <details>
                        <summary className="cursor-pointer text-xs text-ink-400 hover:text-ink-600">
                          voir
                        </summary>
                        <pre className="mt-1 max-w-xs overflow-x-auto rounded-lg bg-ink-50 p-2 text-xs text-ink-600">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-400">
                    Aucune entrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
