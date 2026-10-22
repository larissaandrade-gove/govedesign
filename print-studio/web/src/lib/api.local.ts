// Implementação 100% no navegador do cliente da API do Print Studio, usada no
// build de artefato (vite.artifact.config.ts troca `@/lib/api` por este módulo).
// Mesmo contrato de `api.ts`: dados nas coleções do artifact-runtime (db do
// artefato ou localStorage), arquivos via putFile (assets ou IndexedDB), PDFs e
// .zip gerados aqui mesmo.
import { zipSync } from 'fflate';
import { collection, deleteFile, fileUrl, getFile, putFile, saveFile, type Doc } from '../../../../artifact-runtime/index.ts';
import { BB_SCHEMES, LAYOUTS, bbBlockingChecks, buildLayout, isEmail, onlyDigits, pdfFileName } from '../../../shared/layout.js';
import { ImageInputError, imageSize, prepareLogo } from '@/lib/images.browser';
import { measure, renderPiece } from '@/lib/pdf.browser';
import type { Check, Imagem, LogoFixo, LogosFixos, Municipio, PreflightPeca, QueueItem } from './api';

export type { Check, Imagem, LogoFixo, LogosFixos, Municipio, PieceOptions, PreflightPeca, QueueItem } from './api';

const APP = 'print-studio';
const MAX_UPLOAD = 25 * 1024 * 1024;

type MunicipioDoc = Doc & Omit<Municipio, 'id' | 'tem_logo'> & { num: number; logo_file: string | null };
type LogoDoc = Doc & { file: string; width: number; height: number; avisos: string[]; atualizado: string };

const municipiosCol = collection<MunicipioDoc>(APP, 'municipios');
const logosCol = collection<LogoDoc>(APP, 'logos-fixos');

// ------------------------------------------------------------ URLs de arquivos
// <img> precisa de URL síncrona: resolvemos (fileUrl é assíncrono) ao listar e
// guardamos aqui.
const urls = new Map<string, string>();
async function resolveUrl(id: string | null | undefined) {
  if (!id || urls.has(id)) return;
  const u = await fileUrl(id).catch(() => null);
  if (u) urls.set(id, u);
}
const urlOf = (id: string | null | undefined) => (id ? urls.get(id) ?? '' : ''); // URLs resolvidas por fileUrl()

// ------------------------------------------------------------------ municípios
const toMunicipio = (d: MunicipioDoc): Municipio => {
  const { id: _id, num, logo_file, ...rest } = d;
  return { ...rest, id: num, logo_avisos: rest.logo_avisos ?? [], tem_logo: Boolean(logo_file) };
};

function validateMunicipio(form: FormData) {
  const get = (k: string) => String(form.get(k) ?? '');
  const nome = get('nome_municipio').trim();
  const ddd = onlyDigits(get('ddd'));
  const numero = onlyDigits(get('numero_whatsapp'));
  const uf = get('uf').trim().toUpperCase();
  if (!nome) throw new Error('Informe o nome do município.');
  if (ddd.length !== 2) throw new Error('DDD deve ter 2 dígitos.');
  if (numero.length < 8 || numero.length > 9) throw new Error('Número de WhatsApp deve ter 8 ou 9 dígitos.');
  if (uf && !/^[A-Z]{2}$/.test(uf)) throw new Error('UF deve ter 2 letras.');
  const endereco = get('endereco').trim().slice(0, 200);
  const email = get('email').trim().slice(0, 120);
  if (email && !isEmail(email)) throw new Error('E-mail inválido.');
  const bb = get('incluir_logo_banco_do_brasil');
  return { nome_municipio: nome, uf: uf || null, ddd, numero_whatsapp: numero, incluir_logo_banco_do_brasil: ['true', '1', 'on'].includes(bb), endereco: endereco || null, email: email || null };
}

function uploadedFile(form: FormData, field: string): File | null {
  const f = form.get(field);
  if (!(f instanceof File) || !f.size) return null;
  if (f.size > MAX_UPLOAD) throw new ImageInputError('Arquivo acima de 25 MB.');
  return f;
}

let lastNum = 0;
function nextNum() {
  const used = Math.max(0, ...municipiosCol.all().map((d) => d.num ?? 0));
  lastNum = Math.max(Date.now(), used + 1, lastNum + 1);
  return lastNum;
}

const municipioDoc = (id: number) => municipiosCol.get(String(id));

// ------------------------------------------------------------ peças (PDF/ZIP)
type Piece = { layoutId: string; municipio: Municipio; input: Record<string, unknown>; files: Parameters<typeof renderPiece>[2]; extra: Check[] };

async function pieces(items: QueueItem[]): Promise<Piece[]> {
  if (!Array.isArray(items) || !items.length) throw new Error('A fila de exportação está vazia.');
  await Promise.all([municipiosCol.ready, logosCol.ready]);
  const blobs = new Map<string, Promise<Blob | null>>();
  const blob = (id: string | null | undefined) => {
    if (!id) return Promise.resolve(null);
    if (!blobs.has(id)) blobs.set(id, getFile(id).catch(() => null));
    return blobs.get(id)!;
  };
  const list: Piece[] = [];
  for (const item of items) {
    const doc = municipioDoc(Number(item.municipioId));
    if (!doc) throw new Error(`Município ${item.municipioNome ?? item.municipioId} não encontrado.`);
    const municipio = toMunicipio(doc);
    const gove = logosCol.get('gove');
    const bb = logosCol.get('bb');
    const opts = item.options ?? ({} as QueueItem['options']);
    const [goveBlob, bbBlob, prefBlob, mockBlob] = await Promise.all([blob(gove?.file), blob(bb?.file), blob(doc.logo_file), blob(opts.mockup?.imageId)]);
    const mockDims = mockBlob ? await imageSize(mockBlob).catch(() => null) : null;
    const identity = (opts.identity ?? municipio.identidade) === 'bb' ? 'bb' : 'gove';
    // Identidade BB: logomarca do Banco do Brasil obrigatória
    const includeBB = identity === 'bb' || (opts.includeBB ?? municipio.incluir_logo_banco_do_brasil);
    const dims = (w?: number | null, h?: number | null, b?: Blob | null) => (w && h && b ? { width: w, height: h } : null);

    const extra: Check[] = [];
    const missingFile = (label: string) => extra.push({ level: 'error', code: 'arquivo', message: `${label}: arquivo não disponível neste navegador — envie-o novamente.` });
    if (gove && !goveBlob) missingFile('Logo da Gove');
    if (bb && includeBB && !bbBlob) missingFile('Logo do Banco do Brasil');
    if (doc.logo_file && !prefBlob) missingFile('Logo da prefeitura');
    if (opts.mockup?.imageId && !mockBlob) missingFile('Imagem do mockup');

    for (const layoutId of item.layouts ?? []) {
      if (!LAYOUTS.some((l: { id: string }) => l.id === layoutId)) throw new Error(`Layout desconhecido: ${layoutId}`);
      list.push({
        layoutId,
        municipio,
        extra,
        input: {
          municipio,
          identity,
          bbScheme: opts.bbScheme ?? municipio.bb_esquema ?? 'capa',
          includeBB,
          services: opts.services ?? [],
          texts: opts.texts?.[layoutId] ?? {},
          overrides: opts.overrides?.[layoutId] ?? {},
          mockup: {
            mode: 'upload', // só captura enviada (tela gerada removida)
            ...(mockDims && opts.mockup ? { imageId: opts.mockup.imageId, ...mockDims, focus: opts.mockup.focus } : {}),
          },
          assets: {
            // Sem upload em "Logos fixos", vale a logomarca oficial (brand/logos)
            gove: gove ? dims(gove.width, gove.height, goveBlob) : { official: true },
            bb: dims(bb?.width, bb?.height, bbBlob),
            prefeitura: dims(doc.logo_largura, doc.logo_altura, prefBlob),
          },
        },
        files: { logos: { gove: goveBlob, bb: bbBlob, prefeitura: prefBlob }, mockup: mockBlob },
      });
    }
  }
  if (!list.length) throw new Error('Selecione ao menos um layout.');
  return list;
}

// ------------------------------------------------------------------------ api
export const api = {
  municipios: async (q = '') => {
    await municipiosCol.ready;
    const t = q.trim().toLowerCase();
    const docs = municipiosCol
      .all()
      .filter((d) => !t || `${d.nome_municipio} ${d.uf ?? ''}`.toLowerCase().includes(t))
      .sort((a, b) => a.nome_municipio.localeCompare(b.nome_municipio, 'pt-BR', { sensitivity: 'base' }));
    await Promise.all(docs.map((d) => resolveUrl(d.logo_file)));
    return docs.map(toMunicipio);
  },

  saveMunicipio: async (form: FormData, id?: number): Promise<Municipio> => {
    await municipiosCol.ready;
    const prev = id ? municipioDoc(id) : undefined;
    if (id && !prev) throw new Error('Município não encontrado.');
    const data = validateMunicipio(form);
    const file = uploadedFile(form, 'logo');
    const now = new Date().toISOString();
    const num = prev?.num ?? nextNum();
    let logo = prev
      ? { logo_file: prev.logo_file, logo_largura: prev.logo_largura, logo_altura: prev.logo_altura, logo_avisos: prev.logo_avisos ?? [] }
      : { logo_file: null as string | null, logo_largura: null as number | null, logo_altura: null as number | null, logo_avisos: [] as string[] };
    if (file) {
      const prepared = await prepareLogo(file);
      const stored = await putFile(prepared.blob);
      urls.set(stored.id, stored.url);
      if (prev?.logo_file) void deleteFile(prev.logo_file);
      logo = { logo_file: stored.id, logo_largura: prepared.width, logo_altura: prepared.height, logo_avisos: prepared.warnings };
    }
    const doc: MunicipioDoc = {
      id: String(num),
      num,
      ...data,
      identidade: prev?.identidade ?? 'gove',
      bb_esquema: prev?.bb_esquema ?? 'capa',
      ...logo,
      data_criacao: prev?.data_criacao ?? now,
      data_atualizacao: now,
    };
    await municipiosCol.set(doc);
    return toMunicipio(doc);
  },

  deleteMunicipio: async (id: number) => {
    await municipiosCol.ready;
    const doc = municipioDoc(id);
    if (!doc) throw new Error('Município não encontrado.');
    await municipiosCol.remove(doc.id);
    if (doc.logo_file) void deleteFile(doc.logo_file);
  },

  setIdentidade: async (id: number, identidade: 'gove' | 'bb', bb_esquema: string): Promise<Municipio> => {
    await municipiosCol.ready;
    const prev = municipioDoc(id);
    if (!prev) throw new Error('Município não encontrado.');
    const esquema = BB_SCHEMES.some((s: { id: string }) => s.id === bb_esquema) ? bb_esquema : 'capa';
    const doc: MunicipioDoc = { ...prev, identidade: identidade === 'bb' ? 'bb' : 'gove', bb_esquema: esquema, data_atualizacao: new Date().toISOString() };
    await municipiosCol.set(doc);
    return toMunicipio(doc);
  },

  municipioLogoUrl: (m: Municipio) => urlOf(municipioDoc(m.id)?.logo_file),

  logosFixos: async (): Promise<LogosFixos> => {
    await logosCol.ready;
    const view = (k: 'gove' | 'bb'): LogoFixo => {
      const d = logosCol.get(k);
      return d ? { width: d.width, height: d.height, avisos: d.avisos ?? [], atualizado: d.atualizado } : null;
    };
    const official: LogoFixo = { width: 2000, height: 637, avisos: [], atualizado: '', official: true };
    await Promise.all(['gove', 'bb'].map((k) => resolveUrl(logosCol.get(k)?.file)));
    return { gove: view('gove') ?? official, bb: view('bb') };
  },

  saveLogoFixo: async (chave: 'gove' | 'bb', file: File) => {
    if (chave !== 'gove' && chave !== 'bb') throw new Error('Logo fixo inválido.');
    if (file.size > MAX_UPLOAD) throw new ImageInputError('Arquivo acima de 25 MB.');
    await logosCol.ready;
    const prepared = await prepareLogo(file);
    const stored = await putFile(prepared.blob);
    urls.set(stored.id, stored.url);
    const prev = logosCol.get(chave);
    await logosCol.set({ id: chave, file: stored.id, width: prepared.width, height: prepared.height, avisos: prepared.warnings, atualizado: new Date().toISOString() });
    if (prev?.file) void deleteFile(prev.file);
    return { width: prepared.width, height: prepared.height, avisos: prepared.warnings };
  },

  logoFixoUrl: (chave: 'gove' | 'bb', _v = '') => urlOf(logosCol.get(chave)?.file),

  uploadImagem: async (file: File): Promise<Imagem> => {
    if (file.size > MAX_UPLOAD) throw new ImageInputError('Arquivo acima de 25 MB.');
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new ImageInputError('Imagem ilegível. Envie JPG, PNG ou WebP.');
    const { width, height } = await imageSize(file);
    const stored = await putFile(file);
    urls.set(stored.id, stored.url);
    return { id: stored.id, width, height };
  },

  imagemUrl: (id: string) => urlOf(id),

  preflight: async (items: QueueItem[]) => {
    const results: PreflightPeca[] = [];
    for (const p of await pieces(items)) {
      const { report, layout } = await renderPiece(p.layoutId, p.input, p.files);
      const checks: Check[] = [...(layout.checks as Check[]), ...p.extra, ...report];
      results.push({
        arquivo: pdfFileName(p.layoutId, p.municipio),
        municipio: p.municipio.nome_municipio,
        layout: layout.layout.name,
        checks,
        ok: !checks.some((c) => c.level === 'error'),
      });
    }
    return { pecas: results, ok: results.every((r) => r.ok) };
  },

  exportZip: async (items: QueueItem[]) => {
    const files: Record<string, Uint8Array> = {};
    const list = await pieces(items);
    // Identidade BB: paleta, contraste 4,5:1 e tipografia são regra — sem exportar mesmo assim
    for (const p of list) {
      if (p.input.identity !== 'bb') continue;
      const blocking = bbBlockingChecks((buildLayout(p.layoutId, p.input, measure) as { checks?: Check[] }).checks) as Check[];
      if (blocking.length) throw new Error(`Identidade Banco do Brasil — ${p.municipio.nome_municipio}: ${blocking.map((c) => c.message).join(' ')}`);
    }
    for (const p of list) {
      const { bytes } = await renderPiece(p.layoutId, p.input, p.files);
      let name = pdfFileName(p.layoutId, p.municipio);
      for (let i = 2; files[name]; i++) name = name.replace(/(_\d+)?\.pdf$/, `_${i}.pdf`);
      files[name] = bytes;
    }
    const zip = zipSync(files, { level: 6 });
    return new Blob([zip as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
  },

  /** Entrega o arquivo ao visitante (capacidade `downloads` dentro do artefato). */
  download: async (filename: string, blob: Blob): Promise<'saved' | 'declined'> => {
    const r = await saveFile(filename, blob);
    if (r === 'error') throw new Error('Não foi possível baixar o arquivo neste ambiente.');
    return r;
  },

  /** Avisa quando municípios ou logos mudam (outra pessoa no artefato, outra aba). */
  onChange: (cb: () => void) => {
    const a = municipiosCol.subscribe(() => cb());
    const b = logosCol.subscribe(() => cb());
    return () => {
      a();
      b();
    };
  },
};
