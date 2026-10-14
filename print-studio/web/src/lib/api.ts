// Cliente da API do Print Studio. A interface é servida em /print-studio/,
// então os caminhos relativos ("api/...") resolvem para /print-studio/api/...

export type Municipio = {
  id: number;
  nome_municipio: string;
  uf: string | null;
  ddd: string;
  numero_whatsapp: string;
  incluir_logo_banco_do_brasil: boolean;
  logo_largura: number | null;
  logo_altura: number | null;
  logo_avisos: string[];
  tem_logo: boolean;
  data_criacao: string;
  data_atualizacao: string;
};

export type LogoFixo = { width: number; height: number; avisos: string[]; atualizado: string } | null;
export type LogosFixos = { gove: LogoFixo; bb: LogoFixo };
export type Imagem = { id: string; width: number; height: number };

export type Check = { level: 'ok' | 'warn' | 'error'; code: string; message: string; layout?: string; blockId?: string | null };
export type PreflightPeca = { arquivo: string; municipio: string; layout: string; checks: Check[]; ok: boolean };

export type PieceOptions = {
  includeBB: boolean;
  services: string[];
  texts: Record<string, Record<string, string>>;
  overrides: Record<string, Record<string, { dx: number; dy: number }>>;
  mockup: { imageId: string; focus: { x: number; y: number } } | null;
};
export type QueueItem = { key: string; municipioId: number; municipioNome: string; layouts: string[]; options: PieceOptions };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
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

  preflight: (items: QueueItem[]) => request<{ pecas: PreflightPeca[]; ok: boolean }>('api/preflight', jsonBody({ items })),
  exportZip: async (items: QueueItem[]) => {
    const res = await fetch('api/export', jsonBody({ items }));
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Falha na exportação.');
    return res.blob();
  },
};
