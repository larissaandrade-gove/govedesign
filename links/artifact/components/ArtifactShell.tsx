import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Info, LayoutDashboard, Link2, Moon, Plus, Sun } from "lucide-react";
import { currentTheme, isEmbedded, setStandaloneTheme, type Theme } from "@gove/runtime";

import { GoveMark } from "@/components/GoveMark";
import { getShortDomainLabel } from "../lib/short-domain";
import { clicksCol, linksCol, ready, storageMode } from "../lib/store";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/links", label: "Meus links", icon: Link2 },
  { to: "/criar-link", label: "Criar link", icon: Plus },
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

/** Onde os dados ficam: ponto colorido sempre; texto só em telas largas. */
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
      className="inline-flex min-h-11 items-center gap-2 px-2 text-xs font-medium text-muted-foreground"
    >
      <span
        aria-hidden
        className={`size-2 rounded-full ${
          mode === "db" ? "bg-chart-4" : mode === "local" ? "bg-cta" : "bg-border"
        }`}
      />
      <span className="sr-only min-[1100px]:not-sr-only">{label}</span>
    </span>
  );
}

/**
 * Aviso único do artefato (antes repetido em todas as páginas): o link curto só
 * redireciona no servidor publicado. Fica atrás de um ícone de informação.
 */
function ShortUrlInfo() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Sobre os links curtos nesta versão"
        title="Sobre os links curtos nesta versão"
        aria-expanded={open}
        aria-controls="short-url-info"
        onClick={() => setOpen((v) => !v)}
        className="icon-btn"
      >
        <Info className="size-5" aria-hidden />
      </button>
      {open && (
        <div
          id="short-url-info"
          role="note"
          className="absolute right-0 top-12 z-40 w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-popover p-4 text-sm leading-relaxed text-popover-foreground shadow-elegant ring-1 ring-border"
        >
          Os links curtos (<span className="font-mono">{getShortDomainLabel()}/…</span>) só
          redirecionam no servidor publicado do Gove Links. Aqui, o ícone de teste abre o destino e
          registra um clique de origem “artefato”.
        </div>
      )}
    </div>
  );
}

/** Alternância de tema só quando o app roda sozinho; no Design System o tema vem dele. */
function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => currentTheme());
  if (isEmbedded()) return null;
  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = next === "dark" ? "Usar tema escuro" : "Usar tema claro";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        setStandaloneTheme(next);
        setTheme(next);
      }}
      className="icon-btn"
    >
      {theme === "dark" ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}

const navBase =
  "nav-item inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-2.5 text-sm font-medium transition-colors min-[900px]:px-3.5";

export function ArtifactShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <nav
          aria-label="Principal"
          className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2 sm:px-6"
        >
          <div className="flex min-w-0 items-center gap-2 min-[900px]:gap-6">
            <Link
              to="/dashboard"
              aria-label="Gove Links — início"
              className="flex min-h-11 items-center gap-2"
            >
              <GoveMark />
              <span className="hidden text-xs font-semibold uppercase tracking-widest text-muted-foreground min-[480px]:inline">
                Links
              </span>
            </Link>
            <ul className="flex items-center gap-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-label={item.label}
                    title={item.label}
                    className={`${navBase} text-muted-foreground hover:bg-secondary hover:text-foreground`}
                    activeProps={{
                      className: `${navBase} bg-secondary font-semibold text-foreground`,
                      "aria-current": "page",
                    }}
                  >
                    <item.icon className="size-5 shrink-0" aria-hidden />
                    <span className="sr-only min-[900px]:not-sr-only">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center">
            <StorageBadge />
            <ShortUrlInfo />
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10">{children}</main>
    </div>
  );
}
