import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { GoveMark } from "@/components/GoveMark";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar — Gove Links" },
      {
        name: "description",
        content:
          "Acesso institucional ao Gove Links, o encurtador de links da equipe de marketing da Gove.",
      },
      { property: "og:title", content: "Entrar — Gove Links" },
      {
        property: "og:description",
        content: "Acesso institucional ao encurtador de links interno da Gove.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: "/dashboard", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "E-mail ou senha inválidos."
          : signInError.message,
      );
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-20 text-foreground">
      <div className="animate-entrance w-full max-w-[400px]">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-block">
            <GoveMark size="md" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Acesso Institucional</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Marketing e Comunicação Interna
          </p>
        </div>

        <div className="rounded-xl bg-card p-8 shadow-sm ring-1 ring-border">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="label-caps ml-0.5 block text-muted-foreground"
              >
                E-mail Corporativo
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="nome@gove.digital"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="label-caps ml-0.5 block text-muted-foreground"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm transition-all focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar na Plataforma"}
            </button>
          </form>

          <p className="mt-5 border-t border-border pt-4 text-[11px] leading-relaxed text-muted-foreground">
            As contas são criadas internamente pela administração. Não há cadastro
            público.
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            © 2026 Gove Tecnologia
          </p>
        </div>
      </div>
    </div>
  );
}
