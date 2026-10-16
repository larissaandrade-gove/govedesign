/**
 * Substitui src/lib/gove/pexelsClient.ts no build do artefato. O app roda num
 * iframe srcdoc do Design System, então os caminhos relativos vão para o
 * MESMO servidor (backend/pexels.js), que guarda a chave. Sem servidor (ex.:
 * artefato no claude.ai, sem rede externa) /status falha e a busca some.
 */
import type { PexelsPage, PexelsQuery } from "@/lib/gove/pexels.types";

let status: Promise<boolean> | null = null;

export function pexelsAvailable(): Promise<boolean> {
  status ??= fetch("/api/pexels/status", { headers: { accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : { available: false }))
    .then((j: { available?: unknown }) => j.available === true)
    .catch(() => false);
  return status;
}

export async function pexelsSearch(query: PexelsQuery): Promise<PexelsPage> {
  const params = new URLSearchParams({
    q: query.q,
    page: String(query.page),
    per_page: String(query.perPage),
  });
  if (query.orientation) params.set("orientation", query.orientation);
  const res = await fetch(`/api/pexels/search?${params}`, { headers: { accept: "application/json" } });
  const json = (await res.json().catch(() => ({}))) as Partial<PexelsPage> & { error?: string };
  if (!res.ok) throw new Error(json.error || "Não foi possível buscar imagens agora.");
  return {
    photos: json.photos ?? [],
    page: json.page ?? query.page,
    total: json.total ?? 0,
    next: Boolean(json.next),
  };
}
