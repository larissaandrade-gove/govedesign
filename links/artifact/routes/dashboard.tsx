import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { clickStatsQuery, dashboardStatsQuery, recentLinksQuery } from "@/lib/links-queries";
import { PublicUrlNotice } from "../components/LinkTools";

const columns = ["Identificador", "URL Original", "Cliques", "Status"];

function pad(value: number) {
  return value < 10 ? `0${value}` : String(value);
}

/** Dashboard do app publicado, com cliques por link e o aviso do artefato. */
export function DashboardPage() {
  const stats = useQuery(dashboardStatsQuery);
  const links = useQuery(recentLinksQuery);
  const clicks = useQuery(clickStatsQuery);

  const indicators = [
    { label: "Total de links", value: stats.data?.totalLinks ?? 0 },
    { label: "Links ativos", value: stats.data?.activeLinks ?? 0 },
    { label: "Total de cliques", value: stats.data?.totalClicks ?? 0 },
  ];

  const rows = links.data ?? [];

  return (
    <>
      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Indicadores e links recentes do encurtador interno da Gove.
        </p>
      </header>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        {indicators.map((item) => (
          <div
            key={item.label}
            className="rounded-xl bg-card p-6 ring-1 ring-border"
            data-testid={`stat-${item.label}`}
          >
            <p className="label-caps mb-4 text-muted-foreground">{item.label}</p>
            <div className="flex items-baseline gap-2">
              <span
                className={`font-mono text-4xl font-light ${
                  item.value > 0 ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {stats.isPending ? "—" : pad(item.value)}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {stats.isError ? "Erro" : stats.isPending ? "Carregando" : "Atualizado"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider">Links Recentes</h2>
          <Link
            to="/criar-link"
            className="text-[11px] font-bold uppercase tracking-widest text-accent-ink transition-opacity hover:opacity-80"
          >
            Novo Link +
          </Link>
        </div>

        <div className="relative">
          <div className="hidden grid-cols-4 border-b border-border/50 px-6 py-3 md:grid">
            {columns.map((col, i) => (
              <div
                key={col}
                className={`label-caps text-[10px] text-muted-foreground ${
                  i === columns.length - 1 ? "text-right" : ""
                }`}
              >
                {col}
              </div>
            ))}
          </div>

          {rows.length > 0 ? (
            <ul className="divide-y divide-border/50">
              {rows.map((row) => (
                <li key={row.id}>
                  <Link
                    to="/links/$id"
                    params={{ id: row.id }}
                    className="grid grid-cols-1 gap-1 px-6 py-4 text-sm transition-colors hover:bg-secondary/60 md:grid-cols-4 md:items-center md:gap-0"
                  >
                    <span className="font-mono text-xs font-medium text-foreground">/{row.slug}</span>
                    <span className="truncate pr-4 text-xs text-muted-foreground">{row.original_url}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {clicks.isPending ? "—" : (clicks.data?.get(row.id)?.count ?? 0)}
                      <span className="md:hidden"> cliques</span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest md:text-right">
                      <span className={row.is_active ? "text-accent-ink" : "text-muted-foreground"}>
                        {row.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full border border-dashed border-border">
                <div className="size-2 rounded-full bg-border" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">
                {links.isPending ? "Carregando links" : "Nenhum link gerado"}
              </h3>
              <p className="mt-2 max-w-[280px] text-xs leading-relaxed text-muted-foreground">
                {links.isError
                  ? "Não foi possível carregar os links agora."
                  : "Sua fila de links recentes está vazia. Comece a encurtar URLs para visualizar as métricas aqui."}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        <PublicUrlNotice />
      </div>
    </>
  );
}
