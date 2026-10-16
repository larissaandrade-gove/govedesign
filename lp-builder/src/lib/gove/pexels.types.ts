/** Formato comum das fotos do Pexels (servidor Lovable e rota /api/pexels do Design System). */
export type PexelsOrientation = "" | "landscape" | "portrait" | "square";

export interface PexelsPhoto {
  id: number;
  alt: string;
  width: number;
  height: number;
  avgColor: string | null;
  photographer: string;
  photographerUrl: string;
  pexelsUrl: string;
  src: { thumb: string; large: string; original: string };
}

export interface PexelsPage {
  photos: PexelsPhoto[];
  page: number;
  total: number;
  next: boolean;
}

export interface PexelsQuery {
  q: string;
  page: number;
  orientation: PexelsOrientation;
  perPage: number;
}
