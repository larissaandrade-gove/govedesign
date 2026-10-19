import { createServerFn } from "@tanstack/react-start";

/**
 * Integração com o Pexels. A chave (PEXELS_API_KEY) vive só no servidor e
 * nunca é enviada ao front-end. As mesmas formas de resposta são usadas pelo
 * cliente do artefato (artifact/shims/pexels.ts → /api/pexels/* do Design System).
 */

export type PexelsOrientation = "landscape" | "portrait" | "square";

export type PexelsPhoto = {
  id: number;
  alt: string;
  width: number;
  height: number;
  avgColor: string;
  photographer: string;
  photographerUrl: string;
  pexelsUrl: string;
  src: { thumb: string; large: string; original: string };
};

export type PexelsSearchResult = {
  photos: PexelsPhoto[];
  page: number;
  total: number;
  next: number | null;
};

const IMAGE_HOST = "images.pexels.com";

function apiKey() {
  return process.env["PEXELS_API_KEY"] ?? "";
}

export const pexelsStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ available: boolean }> => ({ available: Boolean(apiKey()) }),
);

export const searchPexels = createServerFn({ method: "GET" })
  .inputValidator(
    (data: {
      q: string;
      page?: number;
      orientation?: PexelsOrientation | "";
      perPage?: number;
    }) => ({
      q: String(data?.q ?? "").slice(0, 80),
      page: Math.max(1, Math.min(100, Math.floor(Number(data?.page) || 1))),
      orientation: (["landscape", "portrait", "square"] as const).includes(
        data?.orientation as PexelsOrientation,
      )
        ? (data.orientation as PexelsOrientation)
        : "",
      perPage: Math.max(3, Math.min(30, Math.floor(Number(data?.perPage) || 12))),
    }),
  )
  .handler(async ({ data }): Promise<PexelsSearchResult> => {
    const key = apiKey();
    if (!key) throw new Error("PEXELS_UNAVAILABLE");
    const q = data.q.trim();
    if (!q) return { photos: [], page: 1, total: 0, next: null };
    const params = new URLSearchParams({
      query: q,
      page: String(data.page),
      per_page: String(data.perPage),
      locale: "pt-BR",
    });
    if (data.orientation) params.set("orientation", data.orientation);
    const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
      headers: { Authorization: key },
    });
    if (!res.ok) throw new Error("PEXELS_UNAVAILABLE");
    const json = (await res.json()) as {
      page?: number;
      total_results?: number;
      next_page?: string;
      photos?: {
        id: number;
        alt?: string;
        width?: number;
        height?: number;
        avg_color?: string;
        url?: string;
        photographer?: string;
        photographer_url?: string;
        src?: { medium?: string; large2x?: string; original?: string; tiny?: string };
      }[];
    };
    const photos = (json.photos ?? [])
      .filter((p) => p.src?.medium && p.src?.large2x)
      .map((p) => ({
        id: p.id,
        alt: p.alt ?? "",
        width: p.width ?? 0,
        height: p.height ?? 0,
        avgColor: p.avg_color ?? "#5B6770",
        photographer: p.photographer ?? "",
        photographerUrl: p.photographer_url ?? "https://www.pexels.com",
        pexelsUrl: p.url ?? "https://www.pexels.com",
        src: {
          thumb: p.src!.medium!,
          large: p.src!.large2x!,
          original: p.src!.original ?? p.src!.large2x!,
        },
      }));
    const page = json.page ?? data.page;
    return {
      photos,
      page,
      total: json.total_results ?? photos.length,
      next: json.next_page ? page + 1 : null,
    };
  });

/**
 * Baixa a imagem no servidor e devolve como data URL: o canvas a desenha sem
 * ficar "tainted" (o export PNG continua funcionando). Só aceita images.pexels.com.
 */
export const fetchPexelsImage = createServerFn({ method: "GET" })
  .inputValidator((data: { url: string }) => ({ url: String(data?.url ?? "") }))
  .handler(async ({ data }): Promise<{ src: string }> => {
    let u: URL;
    try {
      u = new URL(data.url);
    } catch {
      throw new Error("PEXELS_BAD_URL");
    }
    if (u.protocol !== "https:" || u.hostname !== IMAGE_HOST) throw new Error("PEXELS_BAD_URL");
    const res = await fetch(u);
    if (!res.ok) throw new Error("PEXELS_UNAVAILABLE");
    const type = res.headers.get("content-type") ?? "image/jpeg";
    if (!type.startsWith("image/")) throw new Error("PEXELS_BAD_URL");
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 12 * 1024 * 1024) throw new Error("PEXELS_TOO_LARGE");
    return { src: `data:${type};base64,${buf.toString("base64")}` };
  });
