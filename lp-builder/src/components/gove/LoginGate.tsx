import { useState, type FormEvent, type ReactNode } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "@/lib/gove/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginGate({ children }: { children: ReactNode }) {
  const { ready, email, signIn } = useAuth();
  const [form, setForm] = useState({ email: "", senha: "" });
  const [erro, setErro] = useState<string | null>(null);

  if (!ready) return null;
  if (email) return <>{children}</>;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const res = signIn(form.email, form.senha);
    setErro(res.ok ? null : (res.erro ?? "Não foi possível entrar."));
  }

  return (
    <main className="gove-gradient-bg flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-white/5 p-8 backdrop-blur-md">
        <div className="text-center">
          <span
            className="mx-auto flex size-11 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--gove-accent)" }}
          >
            <Lock className="size-5" color="#20133D" aria-hidden />
          </span>
          <p
            className="mt-4 text-xs font-bold tracking-[0.2em]"
            style={{ color: "var(--gove-accent)" }}
          >
            ACESSO RESTRITO
          </p>
          <h1 className="mt-2 text-[25px] font-bold text-white">GOVE LP Builder</h1>
          <p className="mt-2 text-sm text-white/70">
            Entre com as credenciais do time de marketing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/80">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="rounded-full border-white/20 bg-white/10 text-white placeholder:text-white/40"
              placeholder="mkt@gove.digital"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha" className="text-white/80">
              Senha
            </Label>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              value={form.senha}
              onChange={(e) => setForm((f) => ({ ...f, senha: e.target.value }))}
              className="rounded-full border-white/20 bg-white/10 text-white placeholder:text-white/40"
              placeholder="••••••••"
            />
          </div>

          {erro ? (
            <p role="alert" className="text-sm font-semibold" style={{ color: "#FFC72C" }}>
              {erro}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full rounded-full font-bold tracking-wide uppercase"
            style={{ backgroundColor: "var(--gove-accent)", color: "#20133D" }}
          >
            Entrar
          </Button>
        </form>
      </div>
    </main>
  );
}
