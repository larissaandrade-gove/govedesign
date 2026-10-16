import { createServerFn } from "@tanstack/react-start";
import type { PexelsPage, PexelsPhoto, PexelsQuery } from "./pexels.types";

/**
 * Busca no Pexels pelo servidor (TanStack Start). A chave PEXELS_API_KEY só
 * existe no ambiente do servidor: nunca vai para o bundle do cliente.
 */
type RawPhoto = {
  id: number;
  alt?: string;
  width: number;
  height: number;
  avg_color?: string;
  photographer?: string;
  photographer_url?: string;
  url?: string;
  src?: { small?: string; medium?: string; large?: string; large2x?: string; original?: string };
};

const toPhoto = (p: RawPhoto): PexelsPhoto => ({
  id: p.id,
  alt: p.alt ?? "",
  width: p.width,
  height: p.height,
  avgColor: p.avg_color ?? null,
  photographer: p.photographer ?? "",
  photographerUrl: p.photographer_url ?? "",
  pexelsUrl: p.url ?? "",
  src: {
    thumb: p.src?.medium ?? p.src?.small ?? "",
    large: p.src?.large2x ?? p.src?.large ?? p.src?.original ?? "",
    original: p.src?.original ?? "",
  },
});

export const pexelsStatusFn = createServerFn({ method: "GET" }).handler(async () => ({
  available: Boolean(process.env["PEXELS_API_KEY"]),
}));

export const pexelsSearchFn = createServerFn({ method: "GET" })
  .inputValidator((data: PexelsQuery) => ({
    q: String(data?.q ?? "").trim().slice(0, 80),
    page: Math.max(1, Math.floor(Number(data?.page) || 1)),
    perPage: Math.min(40, Math.max(1, Math.floor(Number(data?.perPage) || 24))),
    orientation: ["landscape", "portrait", "square"].includes(String(data?.orientation))
      ? data.orientation
      : ("" as const),
  }))
  .handler(async ({ data }): Promise<PexelsPage> => {
    const key = process.env["PEXELS_API_KEY"];
    if (!key) throw new Error("Banco de imagens não configurado no servidor.");
    if (!data.q) return { photos: [], page: 1, total: 0, next: false };
    const params = new URLSearchParams({
      query: data.q,
      locale: "pt-BR",
      per_page: String(data.perPage),
      page: String(data.page),
    });
    if (data.orientation) params.set("orientation", data.orientation);
    const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
      headers: { Authorization: key },
    });
    if (res.status === 429) throw new Error("Limite de buscas do Pexels atingido. Tente em alguns minutos.");
    if (!res.ok) throw new Error("O Pexels não respondeu agora. Tente de novo.");
    const json = (await res.json()) as {
      photos?: RawPhoto[];
      page?: number;
      total_results?: number;
      next_page?: string;
    };
    return {
      photos: (json.photos ?? []).map(toPhoto).filter((p) => p.src.thumb && p.src.large),
      page: json.page ?? data.page,
      total: json.total_results ?? 0,
      next: Boolean(json.next_page),
    };
  });
