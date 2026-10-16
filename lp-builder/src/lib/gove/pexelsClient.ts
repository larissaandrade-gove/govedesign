/**
 * Acesso do cliente ao banco de imagens. No app Lovable usa as server
 * functions (a chave fica no servidor). No build do artefato este módulo é
 * trocado por artifact/pexelsClient.ts (rota /api/pexels do Design System).
 */
import { pexelsSearchFn, pexelsStatusFn } from "./pexels.functions";
import type { PexelsPage, PexelsQuery } from "./pexels.types";

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
