// Utilidades comuns de pacotes OOXML (DOCX/PPTX): zip, relacionamentos e tema.
import { unzipSync } from 'fflate';
import { child, children, findAll, parseXml, path } from '../../lib/xml.js';
import { DocInputError } from '../docModel.js';

export function openPackage(buffer, kind) {
  let files;
  try {
    files = unzipSync(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
  } catch {
    throw new DocInputError(`O arquivo não é um ${kind} válido (pacote zip ilegível).`);
  }
  const cache = new Map();
  return {
    files,
    has: (p) => Boolean(files[p]),
    bytes: (p) => files[p] ?? null,
    xml(p) {
      if (!files[p]) return null;
      if (!cache.has(p)) cache.set(p, parseXml(files[p]));
      return cache.get(p);
    },
    /** Relacionamentos de uma parte → Map(rId → { target (caminho absoluto), type, external }). */
    rels(part) {
      const dir = part.slice(0, part.lastIndexOf('/') + 1);
      const relPath = `${dir}_rels/${part.slice(dir.length)}.rels`;
      const x = this.xml(relPath);
      const map = new Map();
      for (const r of findAll(x, 'Relationship')) {
        const external = r.attrs.TargetMode === 'External';
        map.set(r.attrs.Id, { target: external ? r.attrs.Target : resolvePath(dir, r.attrs.Target), type: r.attrs.Type ?? '', external });
      }
      return map;
    },
  };
}

export function resolvePath(dir, target) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = (dir + target).split('/');
  const out = [];
  for (const p of parts) {
    if (p === '..') out.pop();
    else if (p !== '.' && p !== '') out.push(p);
  }
  return out.join('/');
}

/** Tema: cores do esquema (dk1, lt1, accent1…) e fontes major/minor. */
export function readTheme(themeXml) {
  const colors = {};
  const fonts = { major: null, minor: null };
  const scheme = themeXml && findAll(themeXml, 'a:clrScheme')[0];
  for (const c of scheme?.children ?? []) {
    if (typeof c !== 'object') continue;
    const key = c.name.replace(/^a:/, '');
    const srgb = child(c, 'a:srgbClr');
    const sys = child(c, 'a:sysClr');
    const hex = srgb?.attrs.val ?? sys?.attrs.lastClr ?? (sys?.attrs.val === 'windowText' ? '000000' : sys?.attrs.val === 'window' ? 'FFFFFF' : null);
    if (hex) colors[key] = `#${hex.toUpperCase()}`;
  }
  const fs = themeXml && findAll(themeXml, 'a:fontScheme')[0];
  fonts.major = path(fs, 'a:majorFont', 'a:latin')?.attrs.typeface ?? null;
  fonts.minor = path(fs, 'a:minorFont', 'a:latin')?.attrs.typeface ?? null;
  return { colors, fonts };
}

// ---------- cores DrawingML (srgbClr/schemeClr + lumMod/lumOff/tint/shade) ----------

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
function rgbToHsl({ r, g, b }) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h / 6, s, l };
}
function hslToRgb({ h, s, l }) {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { r: f(h + 1 / 3) * 255, g: f(h) * 255, b: f(h - 1 / 3) * 255 };
}
const hexToRgb = (hex) => ({ r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16) });
const rgbToHex = ({ r, g, b }) => `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

function applyMods(hex, el) {
  let rgb = hexToRgb(hex);
  for (const m of el.children ?? []) {
    if (typeof m !== 'object') continue;
    const v = Number(m.attrs.val) / 100000;
    const n = m.name.replace(/^a:/, '');
    if (n === 'lumMod' || n === 'lumOff') {
      const hsl = rgbToHsl(rgb);
      hsl.l = n === 'lumMod' ? hsl.l * v : hsl.l + v;
      hsl.l = Math.max(0, Math.min(1, hsl.l));
      rgb = hslToRgb(hsl);
    } else if (n === 'tint') {
      rgb = { r: rgb.r + (255 - rgb.r) * (1 - v), g: rgb.g + (255 - rgb.g) * (1 - v), b: rgb.b + (255 - rgb.b) * (1 - v) };
    } else if (n === 'shade') {
      rgb = { r: rgb.r * v, g: rgb.g * v, b: rgb.b * v };
    }
  }
  return rgbToHex(rgb);
}

/**
 * Resolve um elemento de cor DrawingML (filho de solidFill).
 * @param {object} colorEl  a:srgbClr | a:schemeClr | a:sysClr | a:prstClr
 * @param {(key:string)=>string|null} scheme  resolve 'tx1'/'accent1'… → '#RRGGBB'
 */
export function drawingColor(colorEl, scheme) {
  if (!colorEl) return null;
  const n = colorEl.name.replace(/^a:/, '');
  let hex = null;
  if (n === 'srgbClr') hex = `#${colorEl.attrs.val}`;
  else if (n === 'sysClr') hex = `#${colorEl.attrs.lastClr ?? (colorEl.attrs.val === 'window' ? 'FFFFFF' : '000000')}`;
  else if (n === 'schemeClr') hex = scheme(colorEl.attrs.val);
  else if (n === 'prstClr') hex = { black: '#000000', white: '#FFFFFF', red: '#FF0000', blue: '#0000FF', green: '#008000' }[colorEl.attrs.val] ?? null;
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return null;
  return applyMods(hex.toUpperCase(), colorEl);
}

export const colorChildOf = (fillEl) => fillEl?.children?.find((c) => typeof c === 'object') ?? null;

export { child, children, findAll, path };
