// Identificação de ícones Lucide / Phosphor.
//
// Dois caminhos:
//  1. Referência explícita no objeto (gove.icon, iconSet/iconName ou name "lucide:arrow-right").
//  2. Assinatura geométrica: os `d` dos paths do objeto Fabric são normalizados
//     com o parser de paths do próprio Fabric e comparados com os paths dos
//     pacotes `lucide` e `@phosphor-icons/core`.
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { icons as lucideIcons } from 'lucide';
import { icons as phosphorMeta } from '@phosphor-icons/core';
import { util } from 'fabric/node';

const require = createRequire(import.meta.url);
// O pacote só exporta os SVGs individualmente; resolvemos um deles para achar a pasta.
const PHOSPHOR_ASSETS = dirname(dirname(require.resolve('@phosphor-icons/core/assets/regular/acorn.svg')));
export const PHOSPHOR_WEIGHTS = ['regular', 'bold', 'fill', 'duotone', 'light', 'thin'];

export const pascalToKebab = (s) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Za-z])(\d)/g, '$1-$2')
    .toLowerCase();

let _lucideNames;
export function lucideNames() {
  _lucideNames ??= new Set(Object.keys(lucideIcons).map(pascalToKebab));
  return _lucideNames;
}

let _phosphorNames;
export function phosphorNames() {
  _phosphorNames ??= new Set(phosphorMeta.map((i) => i.name));
  return _phosphorNames;
}

export function iconExists(set, name) {
  if (set === 'lucide') return lucideNames().has(name);
  if (set === 'phosphor') return phosphorNames().has(name);
  return false;
}

// ---------- assinatura de paths ----------

/** Normaliza um path (string `d` ou array de comandos do Fabric) numa string comparável. */
export function pathSignature(path) {
  const parsed = typeof path === 'string' ? util.parsePath(path) : path;
  const simple = util.makePathSimpler(parsed);
  return simple
    .map((cmd) => cmd.map((v, i) => (i === 0 ? v : Math.round(Number(v) * 10) / 10)).join(' '))
    .join(' ');
}

const setKey = (sigs) => [...sigs].sort().join('|');

let _index;
/** Índice assinatura → [{ set, name, weight }], construído sob demanda. */
function signatureIndex() {
  if (_index) return _index;
  _index = new Map();
  const add = (key, entry) => {
    if (!key) return;
    if (!_index.has(key)) _index.set(key, []);
    _index.get(key).push(entry);
  };
  for (const [pascal, node] of Object.entries(lucideIcons)) {
    const ds = node.filter(([tag]) => tag === 'path').map(([, attrs]) => attrs.d);
    if (ds.length) add(setKey(ds.map(pathSignature)), { set: 'lucide', name: pascalToKebab(pascal), weight: null });
  }
  for (const weight of PHOSPHOR_WEIGHTS) {
    const dir = join(PHOSPHOR_ASSETS, weight);
    for (const file of readdirSync(dir)) {
      const svg = readFileSync(join(dir, file), 'utf8');
      const ds = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
      const name = file.replace(/\.svg$/, '').replace(new RegExp(`-${weight}$`), '');
      if (ds.length) add(setKey(ds.map(pathSignature)), { set: 'phosphor', name, weight });
    }
  }
  return _index;
}

/** Procura ícones cujos paths coincidem exatamente com os paths informados. */
export function identifyByPaths(paths) {
  if (!paths.length) return [];
  let sigs;
  try {
    sigs = paths.map(pathSignature);
  } catch {
    return [];
  }
  return signatureIndex().get(setKey(sigs)) ?? [];
}

/** Extrai uma referência explícita de ícone de um objeto Fabric serializado. */
export function explicitIconRef(obj) {
  const g = obj.gove?.icon ?? obj.data?.icon;
  if (g?.set && g?.name) return { set: String(g.set).toLowerCase(), name: g.name, weight: g.weight ?? null };
  if (obj.iconSet && obj.iconName) {
    return { set: String(obj.iconSet).toLowerCase(), name: obj.iconName, weight: obj.iconWeight ?? null };
  }
  const m = /^(lucide|phosphor):([a-z0-9-]+)(?::([a-z]+))?$/i.exec(obj.name ?? '');
  if (m) return { set: m[1].toLowerCase(), name: m[2], weight: m[3] ?? null };
  return null;
}

/** Coleta os paths de um objeto Path ou de um Group de Paths (serializados). */
export function collectPaths(obj) {
  if (obj.type?.toLowerCase() === 'path' && obj.path) return [obj.path];
  if (Array.isArray(obj.objects)) return obj.objects.flatMap(collectPaths);
  return [];
}

export function isApprovedIcon(ref, approvedIcons, policy = { mode: 'list' }) {
  if (!ref || !['lucide', 'phosphor'].includes(ref.set)) return false;
  if (policy.mode === 'set') return iconExists(ref.set, ref.name);
  return approvedIcons.some(
    (a) =>
      a.set === ref.set &&
      a.name === ref.name &&
      (a.set !== 'phosphor' || !a.weight || !ref.weight || a.weight === ref.weight),
  );
}
