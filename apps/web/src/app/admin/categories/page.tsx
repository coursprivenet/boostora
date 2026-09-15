"use client";

import { useEffect, useState } from "react";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { api, ApiError } from "@/lib/api";
import { Category } from "@/lib/types";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

export default function AdminCategoriesPage() {
  const { token, isAdmin } = useRequireAdmin();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    if (!token) return;
    api.get<Category[]>("/categories/all", token).then(setCategories);
  }

  useEffect(() => {
    if (!token || !isAdmin) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  async function create() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/categories", { name, slug }, token);
      setName("");
      setSlug("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!token) return;
    await api.delete(`/categories/${id}`, token);
    load();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-ink-900">Catégories</h1>

      <div className="mb-6 flex items-end gap-3 rounded-xl2 border border-ink-100 bg-white p-5 shadow-soft">
        <Input label="Nom" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
          placeholder="instagram-followers"
        />
        <Button loading={busy} disabled={!name || !slug} onClick={create}>
          Ajouter
        </Button>
      </div>
      {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

      {!categories && <p className="text-ink-400">Chargement…</p>}
      {categories && (
        <div className="overflow-hidden rounded-xl2 border border-ink-100 bg-white shadow-soft">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between border-b border-ink-50 px-4 py-3 text-sm last:border-0"
            >
              <div>
                <span className="font-medium text-ink-900">{c.name}</span>
                <span className="ml-2 text-ink-400">{c.slug}</span>
              </div>
              <button
                onClick={() => remove(c.id)}
                className="text-xs font-medium text-rose-600 hover:text-rose-800"
              >
                Supprimer
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="p-6 text-center text-ink-400">Aucune catégorie.</p>
          )}
        </div>
      )}
    </div>
  );
}
