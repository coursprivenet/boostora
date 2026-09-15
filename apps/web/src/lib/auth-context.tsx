"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import { AuthResponse, AuthUser } from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, phone?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "boostora_auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthResponse;
        setUser(parsed.user);
        setToken(parsed.accessToken);
      }
    } catch {
      // Corrupted/blocked storage — just fall back to logged-out state.
    }
    setLoading(false);
  }, []);

  function persist(auth: AuthResponse) {
    setUser(auth.user);
    setToken(auth.accessToken);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } catch {
      // Private browsing / storage blocked — session still works for this tab.
    }
  }

  async function login(email: string, password: string) {
    const auth = await api.post<AuthResponse>("/auth/login", { email, password });
    persist(auth);
  }

  async function register(email: string, password: string, phone?: string) {
    const auth = await api.post<AuthResponse>("/auth/register", { email, password, phone });
    persist(auth);
  }

  function logout() {
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
