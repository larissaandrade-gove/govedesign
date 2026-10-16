// Acesso ao SQLite (better-sqlite3): tokens de marca e histórico de auditorias.
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedRows } from './seed.js';

const DB_DIR = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DB_PATH = process.env.GOVE_REVISOR_DB || join(DB_DIR, 'revisor.sqlite');
// Arquivos oficiais da logomarca: brand/logos/ (ver brand/logos.js).
export const LOGO_DIR = process.env.GOVE_LOGO_DIR || join(DB_DIR, '..', 'brand', 'logos');

export function openDatabase(path = DEFAULT_DB_PATH, { seed = true } = {}) {
  const db = new Database(path);
  const schema = readFileSync(join(DB_DIR, 'schema.sql'), 'utf8');
  db.exec(schema);
  migrateHistoryModes(db, schema);
  if (seed) seedTokens(db);
  return db;
}

/** Bancos antigos aceitavam só os modos A/B: recria audit_history com o CHECK novo. */
function migrateHistoryModes(db, schema) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'audit_history'").get();
  if (!row || row.sql.includes("'C'")) return;
  const create = /CREATE TABLE IF NOT EXISTS audit_history \([\s\S]*?\n\);/.exec(schema)[0].replace('IF NOT EXISTS audit_history', 'audit_history_v2');
  db.transaction(() => {
    db.exec(create);
    db.exec('INSERT INTO audit_history_v2 SELECT * FROM audit_history; DROP TABLE audit_history; ALTER TABLE audit_history_v2 RENAME TO audit_history;');
    db.exec('CREATE INDEX IF NOT EXISTS idx_audit_history_created ON audit_history (created_at DESC);');
  })();
}

/** Insere os tokens iniciais sem sobrescrever o que já foi editado. */
export function seedTokens(db, { overwrite = false } = {}) {
  const verb = overwrite ? 'INSERT OR REPLACE' : 'INSERT OR IGNORE';
  const stmt = db.prepare(
    `${verb} INTO brand_tokens (category, name, value, is_placeholder) VALUES (?, ?, ?, ?)`,
  );
  const tx = db.transaction((rows) => {
    for (const r of rows) stmt.run(r.category, r.name, JSON.stringify(r.value), r.placeholder ? 1 : 0);
  });
  tx(seedRows());
  if (!overwrite) migratePlaceholders(db);
}

/**
 * Tokens que eram provisórios e agora têm valor oficial no seed são
 * atualizados; logos provisórias que saíram do seed são removidas. Valores
 * editados (não provisórios) nunca são tocados.
 */
function migratePlaceholders(db) {
  const rows = seedRows();
  const upd = db.prepare(
    `UPDATE brand_tokens SET value = ?, is_placeholder = 0, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE category = ? AND name = ? AND is_placeholder = 1`,
  );
  const logoNames = rows.filter((r) => r.category === 'logo').map((r) => r.name);
  db.transaction(() => {
    for (const r of rows.filter((x) => !x.placeholder)) upd.run(JSON.stringify(r.value), r.category, r.name);
    db.prepare(
      `DELETE FROM brand_tokens WHERE category = 'logo' AND is_placeholder = 1 AND name NOT IN (${logoNames.map(() => '?').join(',') || "''"})`,
    ).run(...logoNames);
  })();
}

function rowToToken(row) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    value: JSON.parse(row.value),
    notes: row.notes,
    placeholder: row.is_placeholder === 1,
    updatedAt: row.updated_at,
  };
}

export function listTokens(db, category) {
  const rows = category
    ? db.prepare('SELECT * FROM brand_tokens WHERE category = ? ORDER BY id').all(category)
    : db.prepare('SELECT * FROM brand_tokens ORDER BY category, id').all();
  return rows.map(rowToToken);
}

export function upsertToken(db, { category, name, value, notes = null, placeholder = false }) {
  db.prepare(
    `INSERT INTO brand_tokens (category, name, value, notes, is_placeholder)
     VALUES (@category, @name, @value, @notes, @placeholder)
     ON CONFLICT (category, name) DO UPDATE SET
       value = excluded.value,
       notes = excluded.notes,
       is_placeholder = excluded.is_placeholder,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
  ).run({ category, name, value: JSON.stringify(value), notes, placeholder: placeholder ? 1 : 0 });
  return rowToToken(
    db.prepare('SELECT * FROM brand_tokens WHERE category = ? AND name = ?').get(category, name),
  );
}

export function deleteToken(db, category, name) {
  return db.prepare('DELETE FROM brand_tokens WHERE category = ? AND name = ?').run(category, name).changes > 0;
}

/**
 * Carrega todos os tokens num objeto pronto para as checagens.
 * Cada item mantém `placeholder` para o relatório poder avisar quando a
 * referência ainda é provisória.
 */
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
    margins: Object.fromEntries(
      by('margin').map((t) => [t.name, { placeholder: t.placeholder, ...t.value }]),
    ),
    settings,
  };
}

export function recordAudit(db, report) {
  const failed = report.checks
    .filter((c) => c.status === 'fail')
    .map((c) => ({ id: c.id, title: c.title, found: c.found, expected: c.expected }));
  const warnings = report.checks.filter((c) => c.status === 'warn' || c.status === 'manual').length;
  const info = db
    .prepare(
      `INSERT INTO audit_history (file_name, file_sha256, mode, piece_type, status, failed_items, warning_count, report)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      report.file.name,
      report.file.sha256 ?? null,
      report.mode.code,
      report.pieceType ?? null,
      report.status.code,
      JSON.stringify(failed),
      warnings,
      JSON.stringify(report),
    );
  return Number(info.lastInsertRowid);
}

export function listAudits(db, { limit = 50 } = {}) {
  return db
    .prepare(
      `SELECT id, created_at, file_name, mode, piece_type, status, failed_items, warning_count
       FROM audit_history ORDER BY id DESC LIMIT ?`,
    )
    .all(limit)
    .map((r) => ({ ...r, failed_items: JSON.parse(r.failed_items) }));
}

export function getAudit(db, id) {
  const row = db.prepare('SELECT * FROM audit_history WHERE id = ?').get(id);
  if (!row) return null;
  return { ...row, failed_items: JSON.parse(row.failed_items), report: JSON.parse(row.report) };
}
