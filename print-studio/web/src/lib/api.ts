// Cliente da API do Print Studio. A interface é servida em /print-studio/,
// então os caminhos relativos ("api/...") resolvem para /print-studio/api/...
import { unzipSync } from 'fflate';

export type Municipio = {
  id: number;
  nome_municipio: string;
  uf: string | null;
  ddd: string;
  numero_whatsapp: string;
  incluir_logo_banco_do_brasil: boolean;
  /** Identidade visual preferida das peças do município (persistida no Editor). */
  identidade?: 'gove' | 'bb';
  /** Esquema de cores BB do Kit (KIT_BB_SCHEMES: só 'azul-claro'; ids antigos são migrados). */
  bb_esquema?: string;
  endereco?: string | null;
  email?: string | null;
  /** Site do domicílio eletrônico (opcional): QR e faixa do modelo Portal Cidadão. */
  url_domicilio?: string | null;
  /** Captura automática do site (tela do celular no Portal Cidadão) e quando foi feita. */
  captura_imagem_id?: string | null;
  captura_em?: string | null;
  logo_largura: number | null;
  logo_altura: number | null;
  logo_avisos: string[];
  tem_logo: boolean;
  data_criacao: string;
  data_atualizacao: string;
};

/** `official`: logomarca oficial da Gove (brand/logos), usada quando nada foi enviado. */
export type LogoFixo = { width: number; height: number; avisos: string[]; atualizado: string; official?: boolean } | null;
export type LogosFixos = { gove: LogoFixo; bb: LogoFixo };
export type Imagem = { id: string; width: number; height: number };

export type Check = { level: 'ok' | 'warn' | 'error'; code: string; message: string; layout?: string; blockId?: string | null };
export type PreflightPeca = { arquivo: string; municipio: string; layout: string; checks: Check[]; ok: boolean };

export type Model = 'whatsapp' | 'portal';
export type PieceOptions = {
  /** Modelo (pauta) das peças: WhatsApp (padrão) ou Portal Cidadão. */
  model?: Model;
  identity?: 'gove' | 'bb';
  bbScheme?: string;
  includeBB: boolean;
  services: string[];
  texts: Record<string, Record<string, string>>;
  overrides: Record<string, Record<string, { dx: number; dy: number }>>;
  /** `source: 'captura'`: a fila usa a captura mais recente do site do município. */
  mockup: { mode?: 'upload'; imageId?: string; focus?: { x: number; y: number }; source?: 'envio' | 'captura' } | null;
};
export type QueueItem = { key: string; municipioId: number; municipioNome: string; layouts: string[]; options: PieceOptions };

/** .zip gerado e os PDFs que estão nele (para baixar de novo sem gerar tudo outra vez). */
export type ExportFiles = { zip: Blob; files: { name: string; blob: Blob }[] };
/** Resultado real de um download (mesmo contrato de `saveFileDetailed` do artifact-runtime). */
export type SaveOutcome = 'saved' | 'declined' | 'rate_limited' | 'unavailable' | 'too_large' | 'error';
/** `frame`: janela que fez o download; `attempts`: cada tentativa, `janela:código` (diagnóstico em "Detalhes"). */
export type SaveFrame = 'principal' | 'pai' | 'próprio' | 'ponte' | 'navegador';
export type SaveResult = { outcome: SaveOutcome; code: string; method: 'capacidade' | 'navegador'; frame?: SaveFrame; attempts?: string[] };

/** Mensagem em PT-BR quando o servidor do Kit não responde (o navegador diz só "Failed to fetch"). */
const OFFLINE = 'Sem conexão com o servidor do Kit de Boas-Vindas (VPN ligada?). Tente de novo.';
async function net(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(OFFLINE);
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await net(url, init);
  if (!res.ok) {
    let msg = `Erro ${res.status}`;
    try {
      msg = (await res.json()).error ?? msg;
    } catch {
      /* corpo não é JSON */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const jsonBody = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export const api = {
  municipios: (q = '') => request<Municipio[]>(`api/municipios?q=${encodeURIComponent(q)}`),
  saveMunicipio: (form: FormData, id?: number) =>
    request<Municipio>(id ? `api/municipios/${id}` : 'api/municipios', { method: id ? 'PUT' : 'POST', body: form }),
  deleteMunicipio: (id: number) => request<void>(`api/municipios/${id}`, { method: 'DELETE' }),
  setIdentidade: (id: number, identidade: 'gove' | 'bb') =>
    request<Municipio>(`api/municipios/${id}/identidade`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identidade }) }),
  municipioLogoUrl: (m: Municipio) => `api/municipios/${m.id}/logo?v=${encodeURIComponent(m.data_atualizacao)}`,

  logosFixos: () => request<LogosFixos>('api/logos-fixos'),
  saveLogoFixo: (chave: 'gove' | 'bb', file: File) => {
    const form = new FormData();
    form.append('logo', file);
    return request<{ width: number; height: number; avisos: string[] }>(`api/logos-fixos/${chave}`, { method: 'PUT', body: form });
  },
  logoFixoUrl: (chave: 'gove' | 'bb', v = '') => `api/logos-fixos/${chave}/imagem?v=${encodeURIComponent(v)}`,

  uploadImagem: (file: File) => {
    const form = new FormData();
    form.append('imagem', file);
    return request<Imagem>('api/imagens', { method: 'POST', body: form });
  },
  imagemUrl: (id: string) => `api/imagens/${id}`,

  /** Captura a tela do celular a partir do site do domicílio eletrônico do município (servidor). */
  capturarSite: (municipioId: number) =>
    request<Imagem & { capturadoEm: string; site: string }>(`api/municipios/${municipioId}/captura`, { method: 'POST' }),

  preflight: (items: QueueItem[]) => request<{ pecas: PreflightPeca[]; ok: boolean }>('api/preflight', jsonBody({ items })),
  exportZip: async (items: QueueItem[]): Promise<ExportFiles> => {
    const res = await net('api/export', jsonBody({ items }));
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Falha na exportação.');
    const zip = await res.blob();
    const entries = unzipSync(new Uint8Array(await zip.arrayBuffer()));
    const files = Object.entries(entries)
      .filter(([name]) => name.toLowerCase().endsWith('.pdf'))
      .map(([name, bytes]) => ({ name: name.split('/').pop()!, blob: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }) }));
    return { zip, files };
  },

  /** Entrega o arquivo gerado ao usuário (download comum do navegador). */
  download: async (filename: string, blob: Blob): Promise<SaveResult> => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return { outcome: 'saved', code: 'saved', method: 'navegador', frame: 'navegador', attempts: ['navegador:saved'] };
  },

  /** Dentro do artefato do claude.ai (download pede confirmação)? No servidor: nunca. */
  insideArtifact: () => false,

  /** Avisa quando os dados mudam fora desta aba (no servidor: nunca). */
  onChange: (_cb: () => void): (() => void) => () => undefined,
};
