-- Revisor de identidade visual — Gove Digital
-- Esquema SQLite (better-sqlite3). Idempotente: pode ser executado a cada boot.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Tokens de marca. Uma linha por token; `category` define o formato de `value`
-- (JSON). Categorias usadas pelo revisor:
--   color     → { "hex": "#RRGGBB", "role": "..." }
--   gradient  → { "angle": 90, "stops": [{ "offset": 0, "hex": "#..." }, ...] }
--   font      → { "family": "Montserrat", "weight": 400, "style": "normal" }
--   icon      → { "set": "lucide" | "phosphor", "name": "arrow-right", "weight": "regular" }
--   logo      → { "file": "...", "sha256": "...", "background": "dark" | "light", "colors": ["#..."] }
--   margin    → { "minMarginRatio": 0.05, "minMarginPx": 40, "minSpacingPx": 24 }
--   setting   → valores livres (tolerâncias, regras de QR code, etc.)
CREATE TABLE IF NOT EXISTS brand_tokens (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  category       TEXT    NOT NULL CHECK (category IN ('color','gradient','font','icon','logo','margin','setting')),
  name           TEXT    NOT NULL,
  value          TEXT    NOT NULL CHECK (json_valid(value)),
  notes          TEXT,
  -- 1 = valor provisório que ainda precisa ser confirmado pela Gove Digital
  is_placeholder INTEGER NOT NULL DEFAULT 0,
  updated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (category, name)
);

CREATE INDEX IF NOT EXISTS idx_brand_tokens_category ON brand_tokens (category);

-- Histórico de auditorias.
CREATE TABLE IF NOT EXISTS audit_history (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  file_name      TEXT    NOT NULL,
  file_sha256    TEXT,
  -- A = Fabric JSON, B = imagem, C = documento (PPTX/PDF/DOCX), D = HTML
  mode           TEXT    NOT NULL CHECK (mode IN ('A','B','C','D')),
  piece_type     TEXT,
  status         TEXT    NOT NULL CHECK (status IN ('aprovado','aprovado_com_ressalvas','reprovado')),
  failed_items   TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(failed_items)),
  warning_count  INTEGER NOT NULL DEFAULT 0,
  report         TEXT    NOT NULL CHECK (json_valid(report))
);

CREATE INDEX IF NOT EXISTS idx_audit_history_created ON audit_history (created_at DESC);
