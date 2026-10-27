// Monta o VectorCraft, ferramenta interna de revisão e diagramação dos arquivos dos apps
// (não faz parte do Design System):
//   vectorcraft/dist/index.html          (barra Gove + carregador)
//   vectorcraft/dist/vectorcraft/        (editor em WebAssembly: .js do wasm-bindgen, o .wasm em
//                                         gzip dividido em partes e as fontes da marca)
//
// Uso:
//   node vectorcraft/scripts/build-web.mjs                 só a página (reaproveita o .wasm já montado)
//   node vectorcraft/scripts/build-web.mjs --src <dir>     recompila o .wasm do código-fonte do VectorCraft
//
// Recompilar pede: Rust >= 1.95 com o alvo wasm32-unknown-unknown, wasm-bindgen-cli na
// versão do Cargo.lock do VectorCraft e, de preferência, wasm-opt (binaryen).
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const WEB = join(ROOT, 'vectorcraft/web');
const OUT_HTML = join(ROOT, 'vectorcraft/dist/index.html');
const OUT_DIR = join(ROOT, 'vectorcraft/dist/vectorcraft');
const NAME = 'vectorcraft-web';
// .wasm em gzip, em partes de 12 MB: cabe no git sem arquivos grandes demais
const PART_BYTES = 12 * 1024 * 1024;
const PARTS = join(OUT_DIR, 'parts.json');

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...opts });
const has = (cmd) => {
  try {
    execFileSync(cmd, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const srcIdx = process.argv.indexOf('--src');
if (srcIdx > 0) {
  const src = resolve(process.argv[srcIdx + 1]);
  // Relógio do navegador na build web (PDF/X precisa da data de criação)
  for (const patch of readdirSync(join(ROOT, 'vectorcraft/patches')).filter((f) => f.endsWith('.patch'))) {
    const file = join(ROOT, 'vectorcraft/patches', patch);
    try {
      execFileSync('patch', ['-p1', '-N', '--dry-run', '-i', file], { cwd: src, stdio: 'ignore' });
      run('patch', ['-p1', '-N', '-i', file], { cwd: src });
    } catch {
      console.log(`${patch}: já aplicado`);
    }
  }
  // Tamanho primeiro: o editor tem ~1100 comandos
  const env = { ...process.env, CARGO_PROFILE_RELEASE_OPT_LEVEL: 'z', CARGO_PROFILE_RELEASE_LTO: 'fat', CARGO_PROFILE_RELEASE_PANIC: 'abort', CARGO_TARGET_DIR: join(src, 'target-z') };
  run('cargo', ['build', '--release', '--target', 'wasm32-unknown-unknown', '-p', NAME, '--bin', NAME], { cwd: src, env });
  const wasm = join(src, 'target-z/wasm32-unknown-unknown/release', `${NAME}.wasm`);
  const tmp = join(src, 'target-z/gove-web');
  rmSync(tmp, { recursive: true, force: true });
  run('wasm-bindgen', ['--target', 'web', '--no-typescript', '--weak-refs', '--out-name', NAME, '--out-dir', tmp, wasm]);
  const bg = join(tmp, `${NAME}_bg.wasm`);
  if (has('wasm-opt')) run('wasm-opt', ['-Oz', '--strip-debug', '--strip-producers', '--enable-bulk-memory', '--enable-nontrapping-float-to-int', '--enable-sign-ext', '--enable-mutable-globals', '--enable-reference-types', '--enable-multivalue', bg, '-o', bg]);
  else console.warn('wasm-opt ausente: o .wasm fica maior (instale binaryen ou `cargo install wasm-opt`).');

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });
  copyFileSync(join(tmp, `${NAME}.js`), join(OUT_DIR, `${NAME}.js`));
  const raw = readFileSync(bg);
  const gz = gzipSync(raw, { level: 9 });
  const parts = [];
  for (let i = 0; i * PART_BYTES < gz.length; i++) {
    // Extensão .wasm: servido como application/wasm (o conteúdo é gzip; o carregador lê os bytes)
    const name = `${NAME}_bg.gz.part${String(i).padStart(2, '0')}.wasm`;
    writeFileSync(join(OUT_DIR, name), gz.subarray(i * PART_BYTES, (i + 1) * PART_BYTES));
    parts.push(name);
  }
  writeFileSync(PARTS, JSON.stringify({ wasmBytes: raw.length, gzipBytes: gz.length, parts }, null, 1) + '\n');
  for (const f of ['LICENSE-MIT', 'LICENSE-APACHE']) if (existsSync(join(src, f))) copyFileSync(join(src, f), join(OUT_DIR, f));
  console.log(`wasm: ${(raw.length / 1e6).toFixed(1)} MB · gzip: ${(gz.length / 1e6).toFixed(1)} MB em ${parts.length} parte(s)`);
}

if (!existsSync(PARTS)) {
  console.error(`Falta ${PARTS}: rode com --src <código-fonte do VectorCraft>.`);
  process.exit(1);
}
// Fontes da marca (as mesmas dos PDFs do Print Studio), carregadas no editor ao abrir
const { FONT_FILES } = await import(join(ROOT, 'print-studio/shared/tokens.js'));
const FONTS_SRC = join(ROOT, 'print-studio/server/fonts');
mkdirSync(join(OUT_DIR, 'fonts'), { recursive: true });
for (const f of [...Object.values(FONT_FILES), 'OFL.txt']) copyFileSync(join(FONTS_SRC, f), join(OUT_DIR, 'fonts', f));

// Barra Gove: um módulo só, embutido na página; o editor fica em vectorcraft/
const require = createRequire(join(ROOT, 'design-system/package.json'));
const esbuild = require('esbuild');
const { outputFiles } = await esbuild.build({
  entryPoints: [join(WEB, 'boot.js')],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  write: false,
  legalComments: 'none',
});
const js = outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = readFileSync(join(WEB, 'index.html'), 'utf8').replace('/*__GOVE_MAIN__*/', () => js);
writeFileSync(OUT_HTML, html);
console.log(`ok: ${OUT_HTML}`);
