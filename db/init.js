// Cria/atualiza o banco de tokens.
//   npm run db:init                  → cria tabelas e insere tokens que faltam
//   npm run db:init -- --reseed      → sobrescreve os tokens com os valores de seed.js
//   npm run db:init -- --hash-logos  → calcula o sha256 dos arquivos em db/assets/logos
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_DB_PATH, LOGO_DIR, listTokens, openDatabase, seedTokens, upsertToken } from './database.js';

const args = new Set(process.argv.slice(2));
const db = openDatabase(DEFAULT_DB_PATH);

if (args.has('--reseed')) {
  seedTokens(db, { overwrite: true });
  console.log('Tokens sobrescritos com os valores de db/seed.js');
}

if (args.has('--hash-logos')) {
  for (const t of listTokens(db, 'logo')) {
    const path = join(LOGO_DIR, t.value.file);
    if (!existsSync(path)) {
      console.warn(`  [faltando] ${path}`);
      continue;
    }
    const sha256 = createHash('sha256').update(readFileSync(path)).digest('hex');
    upsertToken(db, { ...t, value: { ...t.value, sha256 } });
    console.log(`  ${t.value.file} → ${sha256}`);
  }
}

const counts = db.prepare('SELECT category, COUNT(*) n, SUM(is_placeholder) p FROM brand_tokens GROUP BY category').all();
console.log(`Banco: ${DEFAULT_DB_PATH}`);
for (const c of counts) console.log(`  ${c.category.padEnd(9)} ${c.n} token(s)${c.p ? `, ${c.p} provisório(s)` : ''}`);
db.close();
