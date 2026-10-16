// Word (.docx) → modelo normalizado.
// Texto: w:r de document.xml, cabeçalhos e rodapés. Propriedades efetivas =
// docDefaults ← estilo de parágrafo (basedOn) ← estilo de caractere ← w:rPr
// direto. Fonte w:rFonts/@ascii (ou @asciiTheme → tema), tamanho w:sz em
// meio-ponto, cor w:color (@val ou @themeColor → tema; "auto" = preto).
// Logomarca: imagens com "logo"/"gove" no nome/descrição/arquivo, e imagens
// dos cabeçalhos (onde a logomarca costuma ficar).
import { DocInputError, imageColors, isLogoName } from '../docModel.js';
import { textOf } from '../../lib/xml.js';
import { child, children, findAll, openPackage, path, readTheme } from './ooxml.js';

const W_DEFAULT_SZ = 20; // 10 pt: padrão do Word quando nada define w:sz

const THEME_COLOR = {
  text1: 'dk1', dark1: 'dk1', background1: 'lt1', light1: 'lt1', text2: 'dk2', dark2: 'dk2', background2: 'lt2', light2: 'lt2',
  accent1: 'accent1', accent2: 'accent2', accent3: 'accent3', accent4: 'accent4', accent5: 'accent5', accent6: 'accent6',
  hyperlink: 'hlink', followedHyperlink: 'folHlink',
};

export async function parseDocx(buffer) {
  const pkg = openPackage(buffer, 'Word (.docx)');
  const docPath = 'word/document.xml';
  const doc = pkg.xml(docPath);
  if (!doc) throw new DocInputError('O arquivo não é um Word (.docx) válido: falta word/document.xml.');
  const docRels = pkg.rels(docPath);
  const themePath = [...docRels.values()].find((r) => r.type.endsWith('/theme'))?.target ?? 'word/theme/theme1.xml';
  const theme = readTheme(pkg.xml(themePath));
  const styles = readStyles(pkg.xml('word/styles.xml'));
  const env = { theme, styles };

  const texts = [];
  const logos = [];
  const seen = new Set();

  // Fundo da página (w:background) — padrão branco.
  const pageBg = path(doc, 'w:document', 'w:background')?.attrs['w:color'];
  const background = pageBg && /^[0-9a-f]{6}$/i.test(pageBg) ? `#${pageBg.toUpperCase()}` : '#FFFFFF';

  const parts = [{ part: docPath, label: 'Corpo', rels: docRels, header: false }];
  for (const r of docRels.values()) {
    if (r.type.endsWith('/header')) parts.push({ part: r.target, label: 'Cabeçalho', header: true });
    if (r.type.endsWith('/footer')) parts.push({ part: r.target, label: 'Rodapé', header: false });
  }
  for (const p of parts) {
    const root = pkg.xml(p.part);
    if (!root) continue;
    const rels = p.rels ?? pkg.rels(p.part);
    const paras = findAll(root, 'w:p', { skip: (e) => e.name === 'mc:Fallback' });
    paras.forEach((para, i) => {
      for (const r of runsOf(para)) {
        const text = children(r, 'w:t').map(textOf).join('');
        if (!text.trim()) continue;
        texts.push({ ...runProps(para, r, env), text, where: `${p.label} · parágrafo ${i + 1}` });
      }
    });
    // Imagens (DrawingML e VML)
    for (const d of findAll(root, 'w:drawing')) {
      const pr = findAll(d, 'wp:docPr')[0]?.attrs ?? {};
      const svgId = findAll(d, '*:svgBlip')[0]?.attrs['r:embed'];
      const rid = findAll(d, 'a:blip')[0]?.attrs['r:embed'];
      const target = rels.get(svgId)?.target ?? rels.get(rid)?.target ?? null;
      const ext = findAll(d, 'wp:extent')[0]?.attrs;
      await addLogo({ name: pr.name, descr: pr.descr ?? pr.title, target, box: ext ? { w: Number(ext.cx), h: Number(ext.cy) } : null }, p);
    }
    for (const im of findAll(root, 'v:imagedata')) {
      const target = rels.get(im.attrs['r:id'])?.target ?? null;
      await addLogo({ name: im.attrs['o:title'], descr: null, target, box: null }, p);
    }
  }

  async function addLogo({ name, descr, target, box }, p) {
    if (!(isLogoName(name, descr, target) || p.header)) return;
    const key = target ?? `${p.part}:${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    const colors = target ? await imageColors(pkg.bytes(target)) : null;
    logos.push({
      colors,
      where: p.label,
      source: [name, target?.split('/').pop()].filter(Boolean).join(' · '),
      note: target ? (colors ? null : 'imagem sem cores legíveis') : 'imagem externa/vinculada',
      background,
      backgroundNote: pageBg ? 'fundo da página' : 'página branca (padrão)',
      box,
    });
  }

  return { format: 'DOCX', texts, logos, targets: [], units: {} };
}

/** Runs de um parágrafo, sem descer em parágrafos aninhados (caixas de texto). */
function runsOf(para) {
  const out = [];
  const walk = (el) => {
    for (const c of el.children) {
      if (typeof c !== 'object') continue;
      if (c.name === 'w:r') out.push(c);
      else if (!['w:p', 'w:drawing', 'w:pict', 'mc:AlternateContent', 'w:txbxContent', 'w:pPr', 'w:del'].includes(c.name)) walk(c);
    }
  };
  walk(para);
  return out;
}

function readStyles(x) {
  const map = new Map();
  let defaultPara = null;
  const root = child(x, 'w:styles');
  for (const s of children(root, 'w:style')) {
    const id = s.attrs['w:styleId'];
    map.set(id, { type: s.attrs['w:type'], basedOn: child(s, 'w:basedOn')?.attrs['w:val'] ?? null, rPr: child(s, 'w:rPr') });
    if (s.attrs['w:type'] === 'paragraph' && (s.attrs['w:default'] === '1' || s.attrs['w:default'] === 'true')) defaultPara = id;
  }
  return { map, defaultPara, docDefaults: path(root, 'w:docDefaults', 'w:rPrDefault', 'w:rPr') };
}

function styleChain(styles, id) {
  const out = [];
  const seen = new Set();
  while (id && !seen.has(id) && styles.map.has(id)) {
    seen.add(id);
    const s = styles.map.get(id);
    if (s.rPr) out.push(s.rPr);
    id = s.basedOn;
  }
  return out;
}

function runProps(para, run, { theme, styles }) {
  const pStyle = path(para, 'w:pPr', 'w:pStyle')?.attrs['w:val'] ?? styles.defaultPara;
  const rStyle = path(run, 'w:rPr', 'w:rStyle')?.attrs['w:val'];
  // Ordem de prioridade (primeiro que define vence)
  const chain = [child(run, 'w:rPr'), ...styleChain(styles, rStyle), ...styleChain(styles, pStyle), styles.docDefaults].filter(Boolean);
  const first = (tag, attrTest) => chain.map((r) => child(r, tag)).find((e) => e && attrTest(e.attrs));

  const fontsEl = first('w:rFonts', (a) => a['w:ascii'] || a['w:asciiTheme'] || a['w:hAnsi'] || a['w:hAnsiTheme']);
  let font = null;
  if (fontsEl) {
    const t = fontsEl.attrs['w:asciiTheme'] ?? fontsEl.attrs['w:hAnsiTheme'];
    font = t ? (t.startsWith('major') ? theme.fonts.major : theme.fonts.minor) : fontsEl.attrs['w:ascii'] ?? fontsEl.attrs['w:hAnsi'];
  } else font = theme.fonts.minor;

  const szEl = first('w:sz', (a) => a['w:val']);
  const sizePt = Number(szEl?.attrs['w:val'] ?? W_DEFAULT_SZ) / 2;

  const colorEl = first('w:color', (a) => a['w:val'] || a['w:themeColor']);
  let color = null;
  let colorNote = null;
  if (colorEl?.attrs['w:themeColor']) {
    color = theme.colors[THEME_COLOR[colorEl.attrs['w:themeColor']] ?? colorEl.attrs['w:themeColor']] ?? null;
    if (!color && /^[0-9a-f]{6}$/i.test(colorEl.attrs['w:val'] ?? '')) color = `#${colorEl.attrs['w:val'].toUpperCase()}`;
  } else if (colorEl && colorEl.attrs['w:val'] !== 'auto') {
    color = /^[0-9a-f]{6}$/i.test(colorEl.attrs['w:val']) ? `#${colorEl.attrs['w:val'].toUpperCase()}` : null;
  } else {
    color = '#000000';
    colorNote = 'cor automática do Word = preto';
  }
  const b = first('w:b', () => true);
  const bold = b ? b.attrs['w:val'] !== '0' && b.attrs['w:val'] !== 'false' : false;
  return { font, weight: bold ? 700 : 400, sizePt, color, colorNote };
}
