import { createServerFn } from "@tanstack/react-start";

export type PexelsPhoto = {
  id: number;
  alt: string;
  medium: string;
  large2x: string;
  photographer: string;
};

/**
 * Busca fotos no Pexels. A chave da API vive apenas no servidor (secret
 * PEXELS_API_KEY) e nunca é enviada ao front-end.
 */
export const searchPexels = createServerFn({ method: "GET" })
  .inputValidator((data: { query: string }) => ({
    query: String(data?.query ?? "").slice(0, 80),
  }))
  .handler(async ({ data }): Promise<{ photos: PexelsPhoto[] }> => {
    const key = process.env["PEXELS_API_KEY"];
    if (!key) throw new Error("PEXELS_UNAVAILABLE");
    const query = data.query.trim();
    if (!query) return { photos: [] };

    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12`,
      { headers: { Authorization: key } },
    );
    if (!res.ok) throw new Error("PEXELS_UNAVAILABLE");

    const json = (await res.json()) as {
      photos?: {
        id: number;
        alt?: string;
        photographer?: string;
        src?: { medium?: string; large2x?: string };
      }[];
    };

    return {
      photos: (json.photos ?? [])
        .filter((p) => p.src?.medium && p.src?.large2x)
        .map((p) => ({
          id: p.id,
          alt: p.alt ?? "",
          medium: p.src!.medium!,
          large2x: p.src!.large2x!,
          photographer: p.photographer ?? "",
        })),
    };
  });
