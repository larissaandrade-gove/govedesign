// db/database.js para o navegador: tokens de marca e histórico de auditorias
// em coleções do artifact-runtime (capacidade `db` dentro do artefato,
// localStorage fora dele). Mesma API pública usada por auditService/modeA e
// os mesmos valores iniciais de db/seed.js.
import { collection, newId } from '../../../artifact-runtime/index.ts';
import { seedRows } from '../../../db/seed.js';

export const LOGO_DIR = '/virtual/db/assets/logos';
export const DEFAULT_DB_PATH = null;

const APP = 'revisor';
export const tokensCol = () => collection(APP, 'brand_tokens');
export const historyCol = () => collection(APP, 'audit_history');
const tokenId = (category, name) => `${category}:${name}`;
const now = () => new Date().toISOString();

/**
 * Objeto que faz as vezes do handle do better-sqlite3 para auditService.js:
 * o UPDATE do relatório completo vira no-op (o histórico guarda só o resumo).
 */
export const browserDb = Object.freeze({ prepare: () => ({ run: () => ({ changes: 0 }), get: () => undefined, all: () => [] }) });

/** Espera a primeira leitura das coleções e semeia os tokens se estiverem vazios. */
export async function openDatabase() {
  const col = tokensCol();
  await Promise.all([col.ready, historyCol().ready]);
  if (!col.all().length) await seedTokens(browserDb);
  return browserDb;
}

/** Insere os tokens iniciais sem sobrescrever o que já foi editado. */
export async function seedTokens(_db, { overwrite = false } = {}) {
  const col = tokensCol();
  const rows = seedRows();
  let order = Math.max(-1, ...col.all().map((t) => t.order ?? 0)) + 1;
  const writes = [];
  rows.forEach((r) => {
    const id = tokenId(r.category, r.name);
    const prev = col.get(id);
    if (prev && !overwrite) return;
    writes.push(col.set({ id, category: r.category, name: r.name, value: r.value, notes: null, placeholder: r.placeholder, order: prev?.order ?? order++, updatedAt: now() }));
  });
  await Promise.all(writes);
}

function docToToken(d) {
  return { id: d.id, category: d.category, name: d.name, value: d.value, notes: d.notes ?? null, placeholder: Boolean(d.placeholder), updatedAt: d.updatedAt };
}

export function listTokens(_db, category) {
  return tokensCol()
    .all()
    .filter((d) => !category || d.category === category)
    .sort((a, b) => (category ? 0 : a.category.localeCompare(b.category)) || (a.order ?? 0) - (b.order ?? 0))
    .map(docToToken);
}

export async function upsertToken(_db, { category, name, value, notes = null, placeholder = false }) {
  const col = tokensCol();
  const id = tokenId(category, name);
  const prev = col.get(id);
  const order = prev?.order ?? Math.max(-1, ...col.all().map((t) => t.order ?? 0)) + 1;
  await col.set({ id, category, name, value, notes, placeholder: Boolean(placeholder), order, updatedAt: now() });
  return docToToken(col.get(id));
}

export async function deleteToken(_db, category, name) {
  const col = tokensCol();
  const id = tokenId(category, name);
  if (!col.get(id)) return false;
  await col.remove(id);
  return true;
}

/** Igual a db/database.js: tokens prontos para as checagens. */
export function loadBrandTokens(db) {
  const all = listTokens(db);
  const by = (cat) => all.filter((t) => t.category === cat);
  const settings = Object.fromEntries(by('setting').map((t) => [t.name, t.value]));
  return {
    colors: by('color').map((t) => ({ name: t.name, placeholder: t.placeholder, ...t.value })),
    gradients: by('gradient').map((t) => ({ name: t.name, placeholder: t.placeholder, ...t.value })),
    fonts: by('font').map((t) => ({ name: t.name, placeholder: t.placeholder, ...t.value })),
    icons: by('icon').map((t) => ({ id: t.name, placeholder: t.placeholder, ...t.value })),
    logos: by('logo').map((t) => ({ name: t.name, placeholder: t.placeholder, ...t.value })),
    margins: Object.fromEntries(by('margin').map((t) => [t.name, { placeholder: t.placeholder, ...t.value }])),
    settings,
  };
}

const cut = (s, n = 240) => (s == null ? null : String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s));

/**
 * Grava o resumo da auditoria (sem imagens nem o relatório completo, para o
 * documento ficar pequeno). Síncrono como no SQLite: o cache local é
 * atualizado na hora e a escrita no db segue em segundo plano.
 */
export function recordAudit(_db, report) {
  const failed = report.checks
    .filter((c) => c.status === 'fail')
    .map((c) => ({ id: c.id, title: cut(c.title, 160), found: cut(c.found), expected: cut(c.expected) }));
  const id = newId('aud-');
  historyCol()
    .set({
      id,
      createdAt: now(),
      fileName: cut(report.file.name, 160),
      fileSha256: report.file.sha256 ?? null,
      mode: report.mode.code,
      pieceType: report.pieceType ?? null,
      status: report.status.code,
      summary: report.summary,
      categories: report.categories.map((c) => ({ key: c.key, status: c.status, count: c.count })),
      failedItems: failed.slice(0, 40),
      failedCount: failed.length,
      warningCount: report.checks.filter((c) => c.status === 'warn' || c.status === 'manual').length,
    })
    .catch(() => {
      /* sem permissão de escrita: fica só no cache local */
    });
  return id;
}

export function listAudits(_db, { limit = 50 } = {}) {
  return historyCol()
    .all()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);
}

export function getAudit(_db, id) {
  return historyCol().get(id) ?? null;
}
