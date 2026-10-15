import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { currentTheme, isEmbedded, setStandaloneTheme, type Theme } from "@gove/runtime";

import { GoveMark } from "@/components/GoveMark";
import { clicksCol, linksCol, ready, storageMode } from "../lib/store";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/links", label: "Meus links" },
  { to: "/criar-link", label: "Criar link" },
] as const;

function useStorageMode() {
  const [mode, setMode] = useState(storageMode());
  useEffect(() => {
    let alive = true;
    const update = () => alive && setMode(storageMode());
    ready().then(update);
    const offA = linksCol.subscribe(update);
    const offB = clicksCol.subscribe(update);
    return () => {
      alive = false;
      offA();
      offB();
    };
  }, []);
  return mode;
}

function StorageBadge() {
  const mode = useStorageMode();
  const label =
    mode === "db"
      ? "Dados compartilhados neste artefato"
      : mode === "local"
        ? "Dados salvos só neste navegador"
        : "Conectando aos dados…";
  return (
    <span
      title={label}
      className="hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground sm:inline-flex"
    >
      <span
        className={`size-1.5 rounded-full ${
          mode === "db" ? "bg-chart-4" : mode === "local" ? "bg-accent" : "bg-border"
        }`}
      />
      {label}
    </span>
  );
}

/** Alternância de tema só quando o app roda sozinho; no Design System o tema vem dele. */
function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => currentTheme());
  if (isEmbedded()) return null;
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      aria-label={next === "dark" ? "Usar tema escuro" : "Usar tema claro"}
      title={next === "dark" ? "Tema escuro" : "Tema claro"}
      onClick={() => {
        setStandaloneTheme(next);
        setTheme(next);
      }}
      className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

export function ArtifactShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <nav className="flex items-center justify-between gap-4 border-b border-border py-4">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" aria-label="Gove Links — início" className="flex items-center gap-2">
              <GoveMark />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Links
              </span>
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

          <div className="flex items-center gap-2">
            <StorageBadge />
            <ThemeToggle />
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
          </div>
        )}

        <div className="pt-10">{children}</div>
      </div>
    </div>
  );
}
