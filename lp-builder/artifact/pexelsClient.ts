/**
 * Substitui src/lib/gove/pexelsClient.ts no build do artefato. O app roda num
 * iframe srcdoc do Design System, então os caminhos relativos vão para o
 * MESMO servidor (backend/pexels.js), que guarda a chave. Sem servidor (ex.:
 * artefato no claude.ai, sem rede externa) /status falha e a busca some.
 */
import type { PexelsPage, PexelsPhoto, PexelsQuery } from "@/lib/gove/pexels.types";
import { connectorAvailable, connectorImage, connectorSearch } from "../../artifact-runtime/pexels";

/** "server": rota /api/pexels do servidor do projeto; "connector": conector Pexels Gove do claude.ai. */
let mode: Promise<"server" | "connector" | null> | null = null;
function detect() {
  mode ??= fetch("/api/pexels/status", { headers: { accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : { available: false }))
    .then((j: { available?: unknown }) => (j.available === true ? ("server" as const) : null))
    .catch(() => null)
    .then(async (m) => m ?? ((await connectorAvailable()) ? ("connector" as const) : null));
  return mode;
}

export async function pexelsAvailable(): Promise<boolean> {
  return (await detect()) !== null;
}

/** No claude.ai a foto escolhida vira data URI (a página não carrega imagens de outros sites). */
export async function resolvePexelsPhoto(photo: PexelsPhoto): Promise<PexelsPhoto> {
  if ((await detect()) !== "connector") return photo;
  return { ...photo, src: { ...photo.src, large: await connectorImage(photo.src.large, 1600) } };
}

export async function pexelsSearch(query: PexelsQuery): Promise<PexelsPage> {
  if ((await detect()) === "connector") return connectorSearch(query.q, query.page, query.perPage, query.orientation);
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
