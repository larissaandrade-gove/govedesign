// Repositório do Print Studio (SQLite via better-sqlite3 + arquivos em disco).
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = process.env.PRINT_STUDIO_DATA || join(ROOT, 'data');
export const FILES_DIR = join(DATA_DIR, 'arquivos');

const SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS municipios (
  id                           INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_municipio               TEXT    NOT NULL,
  uf                           TEXT,
  ddd                          TEXT    NOT NULL CHECK (length(ddd) = 2),
  numero_whatsapp              TEXT    NOT NULL CHECK (length(numero_whatsapp) BETWEEN 8 AND 9),
  incluir_logo_banco_do_brasil INTEGER NOT NULL DEFAULT 0,
  endereco                     TEXT,
  email                        TEXT,
  logo_original                TEXT,
  logo_hires                   TEXT,
  logo_largura                 INTEGER,
  logo_altura                  INTEGER,
  logo_avisos                  TEXT    NOT NULL DEFAULT '[]',
  data_criacao                 TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  data_atualizacao             TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Logos fixos do sistema (não são por município): "gove" e "bb"
CREATE TABLE IF NOT EXISTS logos_fixos (
  chave            TEXT PRIMARY KEY CHECK (chave IN ('gove','bb')),
  original         TEXT NOT NULL,
  hires            TEXT NOT NULL,
  largura          INTEGER NOT NULL,
  altura           INTEGER NOT NULL,
  avisos           TEXT NOT NULL DEFAULT '[]',
  data_atualizacao TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Imagens enviadas para o mockup do celular
CREATE TABLE IF NOT EXISTS imagens (
  id         TEXT PRIMARY KEY,
  arquivo    TEXT NOT NULL,
  largura    INTEGER NOT NULL,
  altura     INTEGER NOT NULL,
  criado_em  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
`;

export function openPrintDb(path = join(DATA_DIR, 'print-studio.sqlite')) {
  mkdirSync(FILES_DIR, { recursive: true });
  const db = new Database(path);
  db.exec(SCHEMA);
  migrate(db);
  return db;
}

/** Migração segura: só acrescenta colunas que faltam (bases criadas antes dos campos novos). */
function migrate(db) {
  const cols = new Set(db.prepare('PRAGMA table_info(municipios)').all().map((c) => c.name));
  const add = { endereco: 'TEXT', email: 'TEXT' };
  db.transaction(() => {
    for (const [c, type] of Object.entries(add)) if (!cols.has(c)) db.exec(`ALTER TABLE municipios ADD COLUMN ${c} ${type}`);
  })();
}

const toMunicipio = (r) =>
  r && {
    ...r,
    incluir_logo_banco_do_brasil: r.incluir_logo_banco_do_brasil === 1,
    logo_avisos: JSON.parse(r.logo_avisos),
    tem_logo: Boolean(r.logo_hires),
  };

export function listMunicipios(db, q = '') {
  const like = `%${q.trim()}%`;
  return db
    .prepare('SELECT * FROM municipios WHERE nome_municipio LIKE ? OR uf LIKE ? ORDER BY nome_municipio COLLATE NOCASE')
    .all(like, like)
    .map(toMunicipio);
}

export const getMunicipio = (db, id) => toMunicipio(db.prepare('SELECT * FROM municipios WHERE id = ?').get(id));

export function saveMunicipio(db, data, id = null) {
  const row = {
    nome_municipio: data.nome_municipio,
    uf: data.uf || null,
    ddd: data.ddd,
    numero_whatsapp: data.numero_whatsapp,
    incluir_logo_banco_do_brasil: data.incluir_logo_banco_do_brasil ? 1 : 0,
    endereco: data.endereco || null,
    email: data.email || null,
  };
  if (id) {
    db.prepare(
      `UPDATE municipios SET nome_municipio=@nome_municipio, uf=@uf, ddd=@ddd, numero_whatsapp=@numero_whatsapp,
       incluir_logo_banco_do_brasil=@incluir_logo_banco_do_brasil, endereco=@endereco, email=@email, data_atualizacao=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=@id`,
    ).run({ ...row, id });
    return getMunicipio(db, id);
  }
  const info = db
    .prepare(
      `INSERT INTO municipios (nome_municipio, uf, ddd, numero_whatsapp, incluir_logo_banco_do_brasil, endereco, email)
       VALUES (@nome_municipio, @uf, @ddd, @numero_whatsapp, @incluir_logo_banco_do_brasil, @endereco, @email)`,
    )
    .run(row);
  return getMunicipio(db, Number(info.lastInsertRowid));
}

export function setMunicipioLogo(db, id, logo) {
  db.prepare(
    `UPDATE municipios SET logo_original=?, logo_hires=?, logo_largura=?, logo_altura=?, logo_avisos=?,
     data_atualizacao=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?`,
  ).run(logo.original, logo.hires, logo.width, logo.height, JSON.stringify(logo.warnings), id);
  return getMunicipio(db, id);
}

export const deleteMunicipio = (db, id) => db.prepare('DELETE FROM municipios WHERE id = ?').run(id).changes > 0;

export function getLogosFixos(db) {
  const rows = db.prepare('SELECT * FROM logos_fixos').all();
  return Object.fromEntries(rows.map((r) => [r.chave, { ...r, avisos: JSON.parse(r.avisos) }]));
}

export function setLogoFixo(db, chave, logo) {
  db.prepare(
    `INSERT INTO logos_fixos (chave, original, hires, largura, altura, avisos) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (chave) DO UPDATE SET original=excluded.original, hires=excluded.hires, largura=excluded.largura,
     altura=excluded.altura, avisos=excluded.avisos, data_atualizacao=strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
  ).run(chave, logo.original, logo.hires, logo.width, logo.height, JSON.stringify(logo.warnings));
}

export function saveImagem(db, img) {
  db.prepare('INSERT INTO imagens (id, arquivo, largura, altura) VALUES (?, ?, ?, ?)').run(img.id, img.file, img.width, img.height);
  return { id: img.id, width: img.width, height: img.height };
}

export const getImagem = (db, id) => db.prepare('SELECT * FROM imagens WHERE id = ?').get(id);
