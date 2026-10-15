/**
 * Substitui src/lib/gove/auth.tsx no build do artefato.
 * Dentro do Design System o acesso é controlado pelo compartilhamento do
 * claude.ai, então não há tela de login nem credenciais no bundle.
 */
import type { ReactNode } from "react";

type AuthValue = {
  ready: boolean;
  email: string | null;
  signIn: (email: string, senha: string) => { ok: boolean; erro?: string };
  signOut: () => void;
};

const value: AuthValue = {
  ready: true,
  email: null,
  signIn: () => ({ ok: true }),
  signOut: () => {},
};

export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth(): AuthValue {
  return value;
}
