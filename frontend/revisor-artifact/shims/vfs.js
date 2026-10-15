// Sistema de arquivos virtual, só leitura, com o que os módulos do backend
// leem do disco: variações do @fontsource/montserrat, .woff2 embutidos e os
// SVGs do @phosphor-icons/core (sintetizados a partir do índice comprimido).
import { Buffer } from 'buffer';
import { inflateSync, strFromU8 } from 'fflate';
import { FONTSOURCE_FILES, FONTSOURCE_WOFF2_B64, ICONS_DEFLATE_B64 } from '../.generated/data.js';

export const VROOT = '/virtual/node_modules';
const FONT_DIR = `${VROOT}/@fontsource/montserrat`;
const PH_DIR = `${VROOT}/@phosphor-icons/core/assets`;

let _icons;
/** Índice de ícones (descomprimido sob demanda, uma vez). */
export function iconData() {
  if (!_icons) {
    const bin = Uint8Array.from(atob(ICONS_DEFLATE_B64), (c) => c.charCodeAt(0));
    _icons = JSON.parse(strFromU8(inflateSync(bin)));
  }
  return _icons;
}

let _ph;
function phosphorFiles(weight) {
  _ph ??= Object.fromEntries(Object.entries(iconData().phosphor).map(([w, list]) => [w, new Map(list)]));
  return _ph[weight] ?? null;
}

const enoent = (p) => Object.assign(new Error(`ENOENT: no such file or directory, '${p}'`), { code: 'ENOENT' });
const norm = (p) => String(p).replace(/\/+/g, '/').replace(/\/$/, '');

export function readdirSync(p) {
  const path = norm(p);
  if (path === FONT_DIR) return [...FONTSOURCE_FILES];
  if (path === PH_DIR) return Object.keys(iconData().phosphor);
  if (path.startsWith(`${PH_DIR}/`)) {
    const files = phosphorFiles(path.slice(PH_DIR.length + 1));
    if (files) return [...files.keys()];
  }
  throw enoent(path);
}

function fileBytes(path) {
  if (path.startsWith(`${FONT_DIR}/`)) {
    const b64 = FONTSOURCE_WOFF2_B64[path.slice(FONT_DIR.length + 1)];
    if (b64) return Buffer.from(b64, 'base64');
  }
  if (path.startsWith(`${PH_DIR}/`)) {
    const [weight, file] = path.slice(PH_DIR.length + 1).split('/');
    const ds = phosphorFiles(weight)?.get(file);
    if (ds) return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">${ds.map((d) => `<path d="${d}"/>`).join('')}</svg>`);
  }
  return null;
}

export function existsSync(p) {
  const path = norm(p);
  if (path === FONT_DIR || path === PH_DIR) return true;
  return fileBytes(path) != null;
}

export function readFileSync(p, enc) {
  const path = norm(p);
  const b = fileBytes(path);
  if (!b) throw enoent(path);
  const encoding = typeof enc === 'string' ? enc : enc?.encoding;
  return encoding ? b.toString(encoding) : b;
}

// Escrita: o artefato não tem disco. auditService só grava quando recebe
// storageDir, o que o build do navegador nunca passa.
export function writeFileSync() {
  throw new Error('Sistema de arquivos indisponível no navegador.');
}
export function mkdirSync() {}

export default { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync };
