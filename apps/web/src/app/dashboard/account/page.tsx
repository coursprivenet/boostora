"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRequireAuth } from "@/lib/use-require-auth";
import { api, ApiError } from "@/lib/api";
import { AuthMeResponse } from "@/lib/types";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

export default function AccountPage() {
  const { token, loading: authLoading } = useRequireAuth();
  const [me, setMe] = useState<AuthMeResponse | null>(null);

  const [phone, setPhone] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.get<AuthMeResponse>("/auth/me", token).then((data) => {
      setMe(data);
      setPhone(data.phone ?? "");
    });
  }, [token]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setProfileError(null);
    setProfileSaved(false);
    setProfileBusy(true);
    try {
      const updated = await api.patch<AuthMeResponse>("/auth/me", { phone: phone || undefined }, token);
      setMe(updated);
      setProfileSaved(true);
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : "Erreur, réessaie");
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setPasswordError(null);
    setPasswordSaved(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas");
      return;
    }

    setPasswordBusy(true);
    try {
      await api.patch("/auth/me/password", { currentPassword, newPassword }, token);
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : "Erreur, réessaie");
    } finally {
      setPasswordBusy(false);
    }
  }

  if (authLoading || !me) return null;

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="text-xl font-semibold text-ink-900">Mon compte</h1>
      <p className="mt-1 text-sm text-ink-500">
        Membre depuis le {new Date(me.createdAt).toLocaleDateString("fr-FR")}
      </p>

      <div className="mt-6 rounded-xl2 border border-ink-100 bg-white p-6 shadow-soft">
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Profil</h2>
        <form onSubmit={saveProfile} className="flex flex-col gap-4">
          <Input label="Email" value={me.email} disabled />
          <Input
            label="Téléphone"
            placeholder="70707070"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setProfileSaved(false);
            }}
          />
          {profileError && <p className="text-sm text-rose-600">{profileError}</p>}
          {profileSaved && <p className="text-sm text-emerald-600">Profil mis à jour.</p>}
          <Button type="submit" loading={profileBusy} className="w-full">
            Enregistrer
          </Button>
        </form>
      </div>

      <div className="mt-6 rounded-xl2 border border-ink-100 bg-white p-6 shadow-soft">
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Mot de passe</h2>
        <form onSubmit={savePassword} className="flex flex-col gap-4">
          <Input
            type="password"
            label="Mot de passe actuel"
            required
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setPasswordSaved(false);
            }}
          />
          <Input
            type="password"
            label="Nouveau mot de passe"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setPasswordSaved(false);
            }}
          />
          <Input
            type="password"
            label="Confirme le nouveau mot de passe"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setPasswordSaved(false);
            }}
          />
          {passwordError && <p className="text-sm text-rose-600">{passwordError}</p>}
          {passwordSaved && <p className="text-sm text-emerald-600">Mot de passe mis à jour.</p>}
          <Button type="submit" loading={passwordBusy} className="w-full">
            Changer le mot de passe
          </Button>
        </form>
      </div>
    </main>
  );
}
