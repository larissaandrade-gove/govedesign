/**
 * Substitui `src/lib/pexels.functions.ts` no build do artefato. A busca no
 * Pexels depende de uma chave de API no servidor, que não existe aqui; a
 * interface do artefato troca o campo de busca por "enviar do dispositivo".
 */
export type PexelsPhoto = {
  id: number;
  alt: string;
  medium: string;
  large2x: string;
  photographer: string;
};

export const searchPexels = async (_: { data: { query: string } }): Promise<{ photos: PexelsPhoto[] }> => {
  throw new Error("PEXELS_UNAVAILABLE");
};
