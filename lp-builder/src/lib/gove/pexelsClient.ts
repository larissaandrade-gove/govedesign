/**
 * Acesso do cliente ao banco de imagens. No app Lovable usa as server
 * functions (a chave fica no servidor). No build do artefato este módulo é
 * trocado por artifact/pexelsClient.ts (rota /api/pexels do Design System).
 */
import { pexelsSearchFn, pexelsStatusFn } from "./pexels.functions";
import type { PexelsPage, PexelsPhoto, PexelsQuery } from "./pexels.types";

export async function pexelsAvailable(): Promise<boolean> {
  try {
    return (await pexelsStatusFn()).available;
  } catch {
    return false;
  }
}

export function pexelsSearch(query: PexelsQuery): Promise<PexelsPage> {
  return pexelsSearchFn({ data: query });
}

/** Foto pronta para usar (no artefato do claude.ai vira data URI; aqui segue como está). */
export async function resolvePexelsPhoto(photo: PexelsPhoto): Promise<PexelsPhoto> {
  return photo;
}
