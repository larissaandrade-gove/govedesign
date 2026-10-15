/**
 * `@/lib/links-queries` no build do artefato: mesmas query options do módulo
 * original, lidas das coleções do artifact-runtime (react-query continua igual).
 */
import { queryOptions } from "@tanstack/react-query";

import { clicksCol, linksCol, ready, type LinkClickDoc, type ShortLinkDoc } from "./store";

export type ShortLinkRow = {
  id: string;
  slug: string;
  original_url: string;
  final_url: string;
  internal_name: string | null;
  is_active: boolean;
  created_at: string;
};

export type ClickStat = { count: number; lastClickAt: string | null };

function toRow(doc: ShortLinkDoc): ShortLinkRow {
  return {
    id: doc.id,
    slug: doc.slug,
    original_url: doc.original_url,
    final_url: doc.final_url,
    internal_name: doc.internal_name ?? null,
    is_active: doc.is_active !== false,
    created_at: doc.created_at,
  };
}

function existingLinkIds() {
  return new Set(linksCol.all().map((l) => l.id));
}

/** Cliques de links que ainda existem (exclusões removem o histórico). */
function liveClicks(): LinkClickDoc[] {
  const ids = existingLinkIds();
  return clicksCol.all().filter((c) => ids.has(c.short_link_id));
}

export const dashboardStatsQuery = queryOptions({
  queryKey: ["dashboard-stats"],
  queryFn: async () => {
    await ready();
    const links = linksCol.all();
    return {
      totalLinks: links.length,
      activeLinks: links.filter((l) => l.is_active !== false).length,
      totalClicks: liveClicks().length,
    };
  },
});

export const clickStatsQuery = queryOptions({
  queryKey: ["click-stats"],
  queryFn: async () => {
    await ready();
    const stats = new Map<string, ClickStat>();
    for (const row of liveClicks()) {
      const current = stats.get(row.short_link_id) ?? { count: 0, lastClickAt: null };
      current.count += 1;
      if (!current.lastClickAt || row.clicked_at > current.lastClickAt) {
        current.lastClickAt = row.clicked_at;
      }
      stats.set(row.short_link_id, current);
    }
    return stats;
  },
});

async function fetchLinks(limit?: number) {
  await ready();
  const rows = linksCol
    .all()
    .map(toRow)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
  return limit ? rows.slice(0, limit) : rows;
}

export const recentLinksQuery = queryOptions({
  queryKey: ["links", "recent"],
  queryFn: () => fetchLinks(5),
});

export const allLinksQuery = queryOptions({
  queryKey: ["links", "all"],
  queryFn: () => fetchLinks(),
});

export function linkDetailQuery(id: string) {
  return queryOptions({
    queryKey: ["links", "detail", id],
    queryFn: async () => {
      await ready();
      const doc = linksCol.get(id);
      return doc ? toRow(doc) : null;
    },
  });
}

export function linkClickStatsQuery(id: string) {
  return queryOptions({
    queryKey: ["click-stats", id],
    queryFn: async () => {
      await ready();
      let count = 0;
      let lastClickAt: string | null = null;
      for (const c of clicksCol.all()) {
        if (c.short_link_id !== id) continue;
        count += 1;
        if (!lastClickAt || c.clicked_at > lastClickAt) lastClickAt = c.clicked_at;
      }
      return { count, lastClickAt } satisfies ClickStat;
    },
  });
}

/** Exclusivo do artefato: últimos cliques registrados de um link. */
export function linkClicksQuery(id: string, limit = 20) {
  return queryOptions({
    queryKey: ["click-stats", id, "list", limit],
    queryFn: async () => {
      await ready();
      return clicksCol
        .all()
        .filter((c) => c.short_link_id === id)
        .sort((a, b) => (a.clicked_at < b.clicked_at ? 1 : -1))
        .slice(0, limit);
    },
  });
}
