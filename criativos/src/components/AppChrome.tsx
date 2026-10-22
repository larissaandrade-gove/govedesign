/**
 * Peças de interface compartilhadas entre o Gerador em lote e o Studio
 * (revisão inspirada nas Human Interface Guidelines): cabeçalho com navegação
 * segmentada, chips de formato com glifo de proporção e seções recolhíveis.
 */
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarCheck, ChevronDown, ListChecks, Megaphone, Wand2, type LucideIcon } from "lucide-react";

import type { CreativeFormat } from "@/lib/creative/renderer";

/** Rótulo visível a partir de 900px; abaixo disso fica só para leitores de tela. */
export const RESPONSIVE_LABEL = "sr-only min-[900px]:not-sr-only";

/** Abas do gerador: cada função com nome e uma linha do que faz. */
const TABS: { to: "/" | "/studio" | "/follow-ups"; modelo?: string; label: string; hint: string; icon: LucideIcon }[] = [
  { to: "/", label: "Mídia paga", hint: "Anúncios em lote para redes", icon: Megaphone },
  { to: "/follow-ups", modelo: "evento", label: "Eventos", hint: "Confirmação de presença com foto", icon: CalendarCheck },
  { to: "/follow-ups", modelo: "atualizacao", label: "Atualizações", hint: "Novidades de produto", icon: ListChecks },
  { to: "/studio", label: "Studio de cards", hint: "Um card por vez, layout livre", icon: Wand2 },
];

export function AppHeader({ actions }: { actions?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 pt-2 sm:px-6">
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-foreground">
          Criativos <span className="text-muted-foreground">GOVE</span>
        </h1>
        {actions}
      </div>
      <nav aria-label="Funções do gerador" className="mx-auto max-w-7xl overflow-x-auto px-2 sm:px-4 [scrollbar-width:none]">
        <ul className="flex min-w-max gap-1 py-1 sm:grid sm:min-w-0 sm:grid-cols-4">
          {TABS.map(({ to, modelo, label, hint, icon: Icon }) => (
            <li key={label}>
              <Link
                to={to}
                search={(modelo ? { modelo } : {}) as never}
                activeOptions={{ exact: true, includeSearch: Boolean(modelo) }}
                className="flex min-h-11 items-center gap-2 rounded-lg border-b-2 px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                activeProps={{ className: "border-primary bg-primary/10 text-foreground", "aria-current": "page" }}
                inactiveProps={{ className: "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground" }}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold leading-tight">{label}</span>
                  <span className="hidden truncate text-xs leading-tight text-muted-foreground min-[900px]:block">{hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

/** Glifo com a proporção real do formato (maior lado = 20px). */
export function FormatGlyph({ w, h, hd = false }: { w: number; h: number; hd?: boolean }) {
  const max = 20;
  const gw = Math.round(w >= h ? max : (max * w) / h);
  const gh = Math.round(h >= w ? max : (max * h) / w);
  return (
    <span className="inline-flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
      <span
        className="flex items-center justify-center rounded-[3px] border-2 border-current text-[6px] font-bold leading-none"
        style={{ width: gw, height: gh }}
      >
        {hd ? "HD" : null}
      </span>
    </span>
  );
}

/** "Feed 4:5 (1080x1350)" → "Feed 4:5". */
export const shortFormatLabel = (label: string) => label.replace(/\s*\(.*\)\s*$/, "");

export function FormatChip({
  format,
  label,
  title,
  w,
  h,
  active,
  onSelect,
}: {
  format: CreativeFormat | string;
  label: string;
  title?: string | undefined;
  w: number;
  h: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      title={title ?? label}
      onClick={onSelect}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <FormatGlyph w={w} h={h} hd={String(format).includes("1200")} />
      <span className={RESPONSIVE_LABEL}>{shortFormatLabel(label)}</span>
    </button>
  );
}

/** Seção recolhível: ícone + título curto; `summary` mostra o estado (ex.: 3/4). */
export function Section({
  icon: Icon,
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  summary?: string | undefined;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={open}
      >
        <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
        <span className="flex-1 text-sm font-semibold text-foreground">{title}</span>
        {summary && (
          <span className="max-w-[45%] truncate text-xs tabular-nums text-muted-foreground">
            {summary}
          </span>
        )}
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && <div className="space-y-3 border-t border-border p-3">{children}</div>}
    </div>
  );
}

/** Linha de ajuste com rótulo clicável (alvo ≥ 44px) e controle à direita. */
export function SettingRow({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <label
        htmlFor={htmlFor}
        className="flex min-h-11 flex-1 cursor-pointer items-center text-sm text-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
