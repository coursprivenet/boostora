"use client";

import { useEffect, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { api } from "@/lib/api";
import { UserRole, UserRow } from "@/lib/types";

const ROLES: UserRole[] = ["CLIENT", "SUPPORT", "ADMIN"];

export default function AdminUsersPage() {
  const { token, isAdmin, user: me } = useRequireAdmin();
  const [users, setUsers] = useState<UserRow[] | null>(null);

  function load() {
    if (!token) return;
    api.get<UserRow[]>("/users", token).then(setUsers);
  }

  useEffect(() => {
    if (!token || !isAdmin) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  async function changeRole(id: string, role: UserRole) {
    if (!token) return;
    await api.patch(`/users/${id}/role`, { role }, token);
    load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink-900">Utilisateurs</h1>

      {!users && <p className="text-ink-400">Chargement…</p>}

      {users && (
        <div className="overflow-x-auto rounded-xl2 border border-ink-100 bg-white shadow-soft">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Commandes</th>
                <th className="px-4 py-3">Inscrit le</th>
                <th className="px-4 py-3">Rôle</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-ink-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-ink-900">{u.email}</td>
                  <td className="px-4 py-3 text-ink-500">{u.phone ?? "Non renseigné"}</td>
                  <td className="px-4 py-3 text-ink-500">{u.ordersCount}</td>
                  <td className="px-4 py-3 text-ink-400">
                    {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={u.id === me?.id}
                      onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                      className="rounded-lg border border-ink-200 px-2 py-1 text-sm text-ink-900 disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
