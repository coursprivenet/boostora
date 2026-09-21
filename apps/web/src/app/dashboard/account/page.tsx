"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/use-require-auth";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { AuthMeResponse, AuthResponse } from "@/lib/types";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";

export default function AccountPage() {
  const { token, loading: authLoading } = useRequireAuth();
  const { updateToken, logout } = useAuth();
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

  const [resendSaved, setResendSaved] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);

  const [logoutAllConfirming, setLogoutAllConfirming] = useState(false);
  const [logoutAllSaved, setLogoutAllSaved] = useState(false);
  const [logoutAllError, setLogoutAllError] = useState<string | null>(null);
  const [logoutAllBusy, setLogoutAllBusy] = useState(false);

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
      const auth = await api.patch<AuthResponse>(
        "/auth/me/password",
        { currentPassword, newPassword },
        token,
      );
      updateToken(auth.accessToken);
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

  async function resendVerification() {
    if (!token) return;
    setResendError(null);
    setResendBusy(true);
    try {
      await api.post("/auth/me/resend-verification", undefined, token);
      setResendSaved(true);
    } catch (err) {
      setResendError(err instanceof ApiError ? err.message : "Erreur, réessaie");
    } finally {
      setResendBusy(false);
    }
  }

  async function handleLogoutAll() {
    if (!token) return;
    setLogoutAllError(null);
    setLogoutAllBusy(true);
    try {
      const auth = await api.post<AuthResponse>("/auth/me/logout-all-sessions", undefined, token);
      updateToken(auth.accessToken);
      setLogoutAllSaved(true);
      setLogoutAllConfirming(false);
    } catch (err) {
      setLogoutAllError(err instanceof ApiError ? err.message : "Erreur, réessaie");
    } finally {
      setLogoutAllBusy(false);
    }
  }

  if (authLoading || !me) return null;

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="text-xl font-semibold text-ink-900">Mon compte</h1>
      <p className="mt-1 text-sm text-ink-500">
        Membre depuis le {new Date(me.createdAt).toLocaleDateString("fr-FR")}
      </p>

      {me.role === "ADMIN" && (
        <div className="mt-4 rounded-xl2 border-2 border-brand-500 bg-brand-50 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ink-900">Espace Administrateur</p>
              <p className="text-xs text-ink-600">Gérer les commandes, catalogue, coupons et taux</p>
            </div>
            <Link
              href="/admin"
              className="shrink-0 rounded-lg border-2 border-ink-900 bg-ink-900 px-3 py-1.5 text-xs font-bold text-brand-500 hover:bg-brand-500 hover:text-ink-900"
            >
              Ouvrir l&apos;Admin →
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-xl2 border border-ink-100 bg-white p-6 shadow-soft">
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Profil</h2>
        <form onSubmit={saveProfile} className="flex flex-col gap-4">
          <div>
            <Input label="Email" value={me.email} disabled />
            <div className="mt-1.5 flex items-center gap-2">
              {me.emailVerifiedAt ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Email vérifié
                </span>
              ) : (
                <>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Email non vérifié
                  </span>
                  <button
                    type="button"
                    disabled={resendBusy || resendSaved}
                    onClick={resendVerification}
                    className="text-xs font-medium text-ink-600 hover:underline disabled:text-ink-300"
                  >
                    {resendSaved ? "Lien envoyé" : "Renvoyer l'email"}
                  </button>
                </>
              )}
            </div>
            {resendError && <p className="mt-1 text-xs text-rose-600">{resendError}</p>}
          </div>
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

      <div className="mt-6 rounded-xl2 border border-ink-100 bg-white p-6 shadow-soft">
        <h2 className="mb-1 text-sm font-semibold text-ink-900">Sessions</h2>
        <p className="mb-4 text-sm text-ink-500">
          Déconnecte toutes les autres sessions actives (autres navigateurs, autres appareils)
          sans changer ton mot de passe.
        </p>
        {logoutAllError && <p className="mb-2 text-sm text-rose-600">{logoutAllError}</p>}
        {logoutAllSaved && (
          <p className="mb-2 text-sm text-emerald-600">Toutes les autres sessions ont été déconnectées.</p>
        )}
        {logoutAllConfirming ? (
          <div className="flex gap-3">
            <Button
              variant="secondary"
              loading={logoutAllBusy}
              onClick={handleLogoutAll}
              className="flex-1 !text-rose-600"
            >
              Confirmer la déconnexion
            </Button>
            <Button variant="ghost" onClick={() => setLogoutAllConfirming(false)}>
              Annuler
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            className="w-full !text-rose-600"
            onClick={() => {
              setLogoutAllConfirming(true);
              setLogoutAllSaved(false);
            }}
          >
            Déconnecter les autres sessions
          </Button>
        )}
      </div>

      <div className="mt-6 rounded-xl2 border border-ink-100 bg-white p-6 shadow-soft">
        <h2 className="mb-1 text-sm font-semibold text-ink-900">Déconnexion</h2>
        <p className="mb-4 text-sm text-ink-500">
          Ferme ta session sur cet appareil en toute sécurité.
        </p>
        <Button
          variant="secondary"
          className="w-full !border-rose-300 !text-rose-600 hover:!bg-rose-50"
          onClick={logout}
        >
          Se déconnecter de cet appareil
        </Button>
      </div>
    </main>
  );
}
