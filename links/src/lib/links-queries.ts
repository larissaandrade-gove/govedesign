import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

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

export const dashboardStatsQuery = queryOptions({
  queryKey: ["dashboard-stats"],
  queryFn: async () => {
    const [total, active, clicks] = await Promise.all([
      supabase.from("short_links").select("*", { count: "exact", head: true }),
      supabase
        .from("short_links")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase.from("link_clicks").select("*", { count: "exact", head: true }),
    ]);

    const error = total.error ?? active.error ?? clicks.error;
    if (error) throw error;

    return {
      totalLinks: total.count ?? 0,
      activeLinks: active.count ?? 0,
      totalClicks: clicks.count ?? 0,
    };
  },
});

/**
 * Cliques agregados por link. RLS restringe as linhas aos links do usuário,
 * então uma única consulta cobre toda a listagem.
 */
export const clickStatsQuery = queryOptions({
  queryKey: ["click-stats"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("link_clicks")
      .select("short_link_id, clicked_at");
    if (error) throw error;

    const stats = new Map<string, ClickStat>();
    for (const row of data ?? []) {
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
  const query = supabase
    .from("short_links")
    .select("id, slug, original_url, final_url, internal_name, is_active, created_at")
    .order("created_at", { ascending: false });

  const { data, error } = limit ? await query.limit(limit) : await query;
  if (error) throw error;
  return (data ?? []) as ShortLinkRow[];
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
      const { data, error } = await supabase
        .from("short_links")
        .select("id, slug, original_url, final_url, internal_name, is_active, created_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ShortLinkRow | null;
    },
  });
}

export function linkClickStatsQuery(id: string) {
  return queryOptions({
    queryKey: ["click-stats", id],
    queryFn: async () => {
      const [countResult, lastResult] = await Promise.all([
        supabase
          .from("link_clicks")
          .select("*", { count: "exact", head: true })
          .eq("short_link_id", id),
        supabase
          .from("link_clicks")
          .select("clicked_at")
          .eq("short_link_id", id)
          .order("clicked_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const error = countResult.error ?? lastResult.error;
      if (error) throw error;

      return {
        count: countResult.count ?? 0,
        lastClickAt: lastResult.data?.clicked_at ?? null,
      } satisfies ClickStat;
    },
  });
}
