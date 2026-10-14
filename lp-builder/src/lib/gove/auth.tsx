import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "gove-lp-auth";
// Credenciais do time de marketing, definidas em .env (VITE_LP_EMAIL / VITE_LP_PASSWORD).
// Atenção: por ser uma checagem no navegador, os valores ficam visíveis no bundle.
const ALLOWED_EMAIL = String(import.meta.env["VITE_LP_EMAIL"] ?? "").trim().toLowerCase();
const ALLOWED_PASSWORD = String(import.meta.env["VITE_LP_PASSWORD"] ?? "");

type AuthValue = {
  ready: boolean;
  email: string | null;
  signIn: (email: string, senha: string) => { ok: boolean; erro?: string };
  signOut: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      setEmail(localStorage.getItem(STORAGE_KEY));
    } catch {
      /* storage indisponível */
    }
    setReady(true);
  }, []);

  function signIn(inputEmail: string, senha: string) {
    const normalized = inputEmail.trim().toLowerCase();
    if (!ALLOWED_EMAIL || !ALLOWED_PASSWORD) {
      return { ok: false, erro: "Credenciais de acesso não configuradas." };
    }
    if (normalized !== ALLOWED_EMAIL || senha !== ALLOWED_PASSWORD) {
      return { ok: false, erro: "E-mail ou senha inválidos." };
    }
    try {
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      /* storage indisponível */
    }
    setEmail(normalized);
    return { ok: true };
  }

  function signOut() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage indisponível */
    }
    setEmail(null);
  }

  return (
    <AuthContext.Provider value={{ ready, email, signIn, signOut }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
