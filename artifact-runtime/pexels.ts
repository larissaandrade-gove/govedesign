/**
 * Pexels pelo conector "Pexels Gove" do claude.ai. Dentro do artefato a página
 * não alcança sites externos; a busca e as imagens vêm pelo conector da
 * organização (backend/pexels-mcp.js ou o Worker em integrations/pexels-connector/worker),
 * com a chave só no conector.
 */
import { capability } from './index';

/** Nome do conector exatamente como cadastrado no claude.ai. */
export const PEXELS_CONNECTOR = 'Pexels Gove';

export type ConnectorPhoto = {
  id: number;
  alt: string;
  width: number;
  height: number;
  avgColor: string | null;
  photographer: string;
  photographerUrl: string;
  pexelsUrl: string;
  src: { thumb: string; large: string; original: string };
};
export type ConnectorPage = { photos: ConnectorPhoto[]; page: number; total: number; next: boolean };

const payloadOf = (r: any) => {
  if (r?.payload && typeof r.payload === 'object') return r.payload;
  const text = r?.content?.find?.((c: any) => c?.type === 'text')?.text;
  return text ? JSON.parse(text) : null;
};

/** Guia para ligar o conector (claude.ai → Configurações → Conectores). */
export const PEXELS_GUIDE_URL = 'https://github.com/larissaandrade-gove/govedesign/blob/HEAD/integrations/pexels-connector/README.md';

/**
 * Erro do conector com a mensagem pronta para a tela. `guideUrl` vem quando falta
 * ligar o conector: os apps mostram o link do guia junto da mensagem.
 */
export class PexelsConnectorError extends Error {
  guideUrl?: string;
  constructor(message: string, guideUrl?: string) {
    super(message);
    this.name = 'PexelsConnectorError';
    if (guideUrl) this.guideUrl = guideUrl;
  }
}

/** Mensagem curta por código de erro do conector. */
export function connectorMessage(e: any): string {
  switch (e?.code) {
    case 'server_not_connected':
    case 'server_not_found':
      return 'Ligue o conector Pexels Gove em claude.ai → Configurações → Conectores. Enquanto isso, envie uma imagem do dispositivo.';
    case 'not_in_manifest':
    case 'consent_required':
    case 'approval_required':
      return 'O Pexels Gove não foi permitido nesta página. Recarregue e aceite a permissão, ou envie uma imagem do dispositivo.';
    case 'needs_reauth':
      return 'Reconecte o Pexels Gove em claude.ai → Configurações → Conectores.';
    case 'rate_limited':
      return 'Muitas buscas seguidas. Tente em alguns segundos.';
    case 'tool_error':
      // Mensagem do próprio conector (ex.: limite de buscas do Pexels atingido).
      if (typeof e?.message === 'string' && e.message.trim() && e.message.length < 300) return e.message.trim();
      return 'Busca indisponível no momento. Envie uma imagem do dispositivo.';
    default:
      return 'Busca indisponível no momento. Envie uma imagem do dispositivo.';
  }
}

/** Erro pronto para a tela; o guia aparece quando falta ligar o conector. */
function connectorError(e: any): PexelsConnectorError {
  const missing = e?.code === 'server_not_connected' || e?.code === 'server_not_found';
  return new PexelsConnectorError(connectorMessage(e), missing ? PEXELS_GUIDE_URL : undefined);
}

/** O conector está declarado e disponível nesta página do claude.ai? */
export async function connectorAvailable(): Promise<boolean> {
  return (await capability('mcp')) !== null;
}

export async function connectorSearch(q: string, page = 1, perPage = 12, orientation = ''): Promise<ConnectorPage> {
  const mcp = await capability('mcp');
  if (!mcp) throw new Error('Banco de imagens indisponível.');
  try {
    const r = await mcp.callTool(PEXELS_CONNECTOR, 'search_photos', { query: q, page, per_page: perPage, ...(orientation ? { orientation } : {}) });
    const d = payloadOf(r) ?? {};
    return { photos: d.photos ?? [], page: d.page ?? page, total: d.total ?? 0, next: Boolean(d.next) };
  } catch (e) {
    throw connectorError(e);
  }
}

/** Foto em data URI (pode ir para o canvas e para o HTML exportado). */
export async function connectorImage(url: string, width = 1600): Promise<string> {
  const mcp = await capability('mcp');
  if (!mcp) throw new Error('Banco de imagens indisponível.');
  try {
    const r = await mcp.callTool(PEXELS_CONNECTOR, 'get_image', { url, width });
    const d = payloadOf(r);
    if (!d?.dataUrl) throw new Error('sem imagem');
    return d.dataUrl as string;
  } catch (e) {
    throw connectorError(e);
  }
}

/** Captura a tela do celular de um site público (Print Studio, Portal Cidadão), em data URI. */
export async function connectorCapture(url: string): Promise<{ dataUrl: string; url: string }> {
  const mcp = await capability('mcp');
  if (!mcp) throw new Error('Captura indisponível: o conector da Gove não está ligado nesta página. Envie a captura manualmente.');
  try {
    const r = await mcp.callTool(PEXELS_CONNECTOR, 'capture_site', { url });
    const d = payloadOf(r);
    if (!d?.dataUrl) throw new Error('sem imagem');
    return { dataUrl: d.dataUrl as string, url: d.url as string };
  } catch (e: any) {
    if (e?.code === 'tool_error' && e?.message) throw new Error(e.message);
    if (e?.code === 'server_not_connected' || e?.code === 'not_in_manifest') throw new Error('Conector da Gove não conectado: envie a captura manualmente.');
    throw new Error(e?.message === 'sem imagem' ? 'O site não devolveu uma captura.' : connectorMessage(e));
  }
}
