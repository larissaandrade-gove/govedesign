import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, Globe, Link as LinkIcon, CursorClick, Plus, Power } from "@phosphor-icons/react";

import { clickStatsQuery, dashboardStatsQuery, recentLinksQuery } from "@/lib/links-queries";
import { IconHeader, StatusBadge } from "../components/LinkTools";

/** Dashboard: indicadores e links recentes. */
export function DashboardPage() {
  const stats = useQuery(dashboardStatsQuery);
  const links = useQuery(recentLinksQuery);
  const clicks = useQuery(clickStatsQuery);

  const indicators = [
    { label: "Total de links", value: stats.data?.totalLinks ?? 0, icon: LinkIcon },
    { label: "Links ativos", value: stats.data?.activeLinks ?? 0, icon: CheckCircle },
    { label: "Total de cliques", value: stats.data?.totalClicks ?? 0, icon: CursorClick },
  ];

  const rows = links.data ?? [];

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>

      <div className="mb-8 grid grid-cols-1 gap-3 min-[600px]:grid-cols-3 sm:gap-4">
        {indicators.map((item) => (
          <div key={item.label} className="surface p-5" data-testid={`stat-${item.label}`}>
            <span
              className={`block font-display text-4xl font-bold tabular-nums ${
                item.value > 0 ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {stats.isPending ? "—" : item.value}
            </span>
            <p className="mt-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <item.icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </p>
          </div>
        ))}
      </div>
      {stats.isError && (
        <p role="alert" className="-mt-4 mb-8 text-sm font-medium text-destructive">
          Não foi possível carregar os indicadores.
        </p>
      )}

      <section className="surface overflow-hidden" aria-labelledby="recent-title">
        <h2 id="recent-title" className="border-b border-border px-5 py-4 text-base font-semibold">
          Links recentes
        </h2>

        {rows.length > 0 ? (
          <>
            <div
              aria-hidden
              className="hidden grid-cols-[minmax(0,1fr)_minmax(0,2fr)_5rem_6rem] gap-4 border-b border-border px-5 py-2.5 text-muted-foreground min-[900px]:grid"
            >
              <IconHeader icon={LinkIcon} label="Identificador" />
              <IconHeader icon={Globe} label="URL original" />
              <IconHeader icon={CursorClick} label="Cliques" />
              <span className="text-right">
                <IconHeader icon={Power} label="Status" />
              </span>
            </div>
            <ul className="divide-y divide-border">
              {rows.map((row) => {
                const count = clicks.isPending ? "—" : (clicks.data?.get(row.id)?.count ?? 0);
                return (
                  <li key={row.id}>
                    <Link
                      to="/links/$id"
                      params={{ id: row.id }}
                      className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-0.5 px-5 py-3 text-sm transition-colors hover:bg-secondary/60 min-[900px]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_5rem_6rem]"
                    >
                      <span className="truncate font-mono font-medium text-foreground">/{row.slug}</span>
                      <span className="col-span-3 row-start-2 truncate text-xs text-muted-foreground min-[900px]:col-span-1 min-[900px]:col-start-2 min-[900px]:row-start-1 min-[900px]:text-sm">
                        {row.original_url}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 font-mono text-sm text-muted-foreground tabular-nums"
                        title={`${count} cliques`}
                      >
                        <CursorClick className="size-3.5 min-[900px]:hidden" aria-hidden />
                        {count}
                        <span className="sr-only"> cliques</span>
                      </span>
                      <span className="text-right">
                        <StatusBadge active={row.is_active} compact />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-14 text-center">
            <p className="text-sm text-muted-foreground">
              {links.isPending
                ? "Carregando links…"
                : links.isError
                  ? "Não foi possível carregar os links agora."
                  : "Nenhum link criado ainda."}
            </p>
            {!links.isPending && !links.isError && (
              <Link to="/criar-link" className="btn btn-cta">
                <Plus className="size-4" aria-hidden />
                Criar link
              </Link>
            )}
          </div>
        )}
      </section>
    </>
  );
}
