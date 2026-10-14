import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { dashboardStatsQuery, recentLinksQuery } from "@/lib/links-queries";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Gove Links" },
      {
        name: "description",
        content:
          "Painel do Gove Links com indicadores de links criados, links ativos e cliques totais.",
      },
      { property: "og:title", content: "Dashboard — Gove Links" },
      {
        property: "og:description",
        content: "Indicadores e links recentes do encurtador interno da Gove.",
      },
    ],
  }),
  component: DashboardPage,
});

const columns = ["Identificador", "URL Original", "Cliques", "Status"];

function pad(value: number) {
  return value < 10 ? `0${value}` : String(value);
}

function DashboardPage() {
  const stats = useQuery(dashboardStatsQuery);
  const links = useQuery(recentLinksQuery);

  const indicators = [
    { label: "Total de links", value: stats.data?.totalLinks ?? 0 },
    { label: "Links ativos", value: stats.data?.activeLinks ?? 0 },
    { label: "Total de cliques", value: stats.data?.totalClicks ?? 0 },
  ];

  const rows = links.data ?? [];

  return (
    <>
      <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        {indicators.map((item, i) => (
          <div
            key={item.label}
            className="animate-entrance rounded-xl bg-card p-6 ring-1 ring-border"
            style={{ animationDelay: `${100 + i * 50}ms` }}
          >
            <p className="label-caps mb-4 text-muted-foreground">{item.label}</p>
            <div className="flex items-baseline gap-2">
              <span
                className={`font-mono text-4xl font-light ${
                  item.value > 0 ? "text-foreground" : "text-foreground/20"
                }`}
              >
                {stats.isPending ? "—" : pad(item.value)}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground/60">
                {stats.isError ? "Erro" : stats.isPending ? "Carregando" : "Atualizado"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div
        className="animate-entrance overflow-hidden rounded-xl bg-card ring-1 ring-border"
        style={{ animationDelay: "300ms" }}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider">Links Recentes</h2>
          <Link
            to="/criar-link"
            className="text-[11px] font-bold uppercase tracking-widest text-accent transition-opacity hover:opacity-80"
          >
            Novo Link +
          </Link>
        </div>

        <div className="relative">
          <div className="hidden grid-cols-4 border-b border-border/50 px-6 py-3 md:grid">
            {columns.map((col, i) => (
              <div
                key={col}
                className={`label-caps text-[10px] text-muted-foreground/60 ${
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
                <li
                  key={row.id}
                  className="grid grid-cols-1 gap-1 px-6 py-4 text-sm md:grid-cols-4 md:items-center md:gap-0"
                >
                  <span className="font-mono text-xs font-medium text-foreground">
                    /{row.slug}
                  </span>
                  <span className="truncate pr-4 text-xs text-muted-foreground">
                    {row.original_url}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">—</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest md:text-right">
                    <span className={row.is_active ? "text-accent" : "text-muted-foreground"}>
                      {row.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </span>
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
                  : "Sua fila de links recentes está vazia. Comece a encurtar URLs para visualizar as métricas de performance aqui."}
              </p>
            </div>
          )}

          <div className="animate-line-grow absolute bottom-0 left-0 h-1 bg-accent/20" />
        </div>
      </div>

      <div
        className="animate-entrance mt-12 grid grid-cols-1 items-start gap-8 md:grid-cols-2 md:gap-12"
        style={{ animationDelay: "400ms" }}
      >
        <div className="space-y-3">
          <h4 className="label-caps text-[11px] tracking-widest text-muted-foreground">
            Documentação Interna
          </h4>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Utilize slugs descritivos para facilitar a identificação em campanhas de
            marketing. O rastreamento UTM será implementado na próxima fase de
            desenvolvimento.
          </p>
        </div>
        <div className="flex md:justify-end">
          <div className="rounded border border-primary/10 bg-primary/5 px-4 py-2">
            <p className="text-[10px] font-medium uppercase tracking-tight text-primary">
              Sistema em conformidade com diretrizes Gove v2.1
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
