import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X, LogOut } from "lucide-react";

import { GoveMark } from "./GoveMark";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/links", label: "Meus links" },
  { to: "/criar-link", label: "Criar link" },
] as const;

function initialsFrom(email: string | null) {
  if (!email) return "GV";
  const name = email.split("@")[0] ?? "";
  const parts = name.split(/[._-]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0]![0]! + parts[1]![0]! : name.slice(0, 2);
  return letters.toUpperCase();
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <nav className="animate-entrance flex items-center justify-between border-b border-border py-4">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" aria-label="Gove Links">
              <GoveMark />
            </Link>
            <div className="hidden items-center gap-6 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  activeProps={{ className: "text-sm font-semibold text-primary" }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="grid size-8 place-items-center rounded-full bg-secondary"
              title={email ?? undefined}
            >
              <span className="text-[10px] font-bold text-muted-foreground">
                {initialsFrom(email)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sair"
              className="hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground md:flex"
            >
              <LogOut className="size-3.5" />
              Sair
            </button>
            <button
              type="button"
              aria-label="Abrir navegação"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground md:hidden"
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </nav>

        {open && (
          <div className="flex flex-col border-b border-border py-2 md:hidden">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "py-2.5 text-sm font-semibold text-primary" }}
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2 py-2.5 text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="size-3.5" />
              Sair
            </button>
          </div>
        )}

        <div className="pt-12">{children}</div>
      </div>
    </div>
  );
}
