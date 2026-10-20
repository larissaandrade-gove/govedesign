/**
 * Substitui `src/lib/pexels.functions.ts` no build do artefato. Não há chave
 * aqui: o cliente chama as rotas do MESMO servidor que publica o Design System
 * (a chave fica nesse servidor). Se /api/pexels/status falhar ou responder
 * `available: false` (ex.: artefato aberto no claude.ai, sem rede externa), a
 * interface mostra um aviso curto e mantém o envio de imagens do dispositivo.
 */
import type {
  PexelsOrientation,
  PexelsPhoto,
  PexelsSearchResult,
} from "../../src/lib/pexels.functions";

import { connectorAvailable, connectorImage, connectorSearch } from "../../../artifact-runtime/pexels";

export type { PexelsOrientation, PexelsPhoto, PexelsSearchResult };

/** "server": rota /api/pexels do servidor do projeto; "connector": conector Pexels Gove do claude.ai. */
let mode: Promise<"server" | "connector" | null> | null = null;
function detect() {
  mode ??= (async () => {
    if (/^https?:$/.test(window.location.protocol)) {
      try {
        const r = await getJson<{ available?: boolean }>("/status");
        if (r.available === true) return "server" as const;
      } catch {
        /* sem servidor: tenta o conector */
      }
    }
    return (await connectorAvailable()) ? ("connector" as const) : null;
  })();
  return mode;
}

const BASE = "/api/pexels";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("PEXELS_UNAVAILABLE");
  return (await res.json()) as T;
}

export const pexelsStatus = async (): Promise<{ available: boolean }> => ({ available: (await detect()) !== null });

export const searchPexels = async ({
  data,
}: {
  data: { q: string; page?: number; orientation?: PexelsOrientation | ""; perPage?: number };
}): Promise<PexelsSearchResult> => {
  if ((await detect()) === "connector") {
    const r = await connectorSearch(data.q, data.page ?? 1, data.perPage ?? 12, data.orientation ?? "");
    return { photos: r.photos.map((p) => ({ ...p, avgColor: p.avgColor ?? "" })), page: r.page, total: r.total, next: r.next ? r.page + 1 : null };
  }
  const p = new URLSearchParams({ q: data.q, page: String(data.page ?? 1), per_page: String(data.perPage ?? 12) });
  if (data.orientation) p.set("orientation", data.orientation);
  const r = await getJson<Partial<PexelsSearchResult>>(`/search?${p}`);
  return { photos: r.photos ?? [], page: r.page ?? 1, total: r.total ?? 0, next: r.next ?? null };
};

/** A imagem passa pelo proxy do mesmo servidor: o canvas não fica "tainted". */
export const fetchPexelsImage = async ({ data }: { data: { url: string } }): Promise<{ src: string }> => {
  const u = new URL(data.url);
  if (u.protocol !== "https:" || u.hostname !== "images.pexels.com") throw new Error("PEXELS_BAD_URL");
  if ((await detect()) === "connector") return { src: await connectorImage(data.url) };
  return { src: `${BASE}/image?u=${encodeURIComponent(data.url)}` };
};
