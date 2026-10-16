// PowerPoint (.pptx) → modelo normalizado.
// Texto: a:r/a:rPr de cada slide, com herança (lstStyle da forma → placeholder
// do layout → placeholder do mestre → txStyles do mestre → defaultTextStyle).
// Tamanho em centésimos de pt (sz), fonte a:latin (+mj-lt/+mn-lt → tema), cor
// solidFill (srgbClr/schemeClr resolvido pelo clrMap + tema). Texto com
// gradiente não é avaliado (gradientes ficam fora da análise).
// Logomarca: p:pic cujo nome/descrição/arquivo contém "logo"/"gove".
import { DocInputError, imageColors, isLogoName } from '../docModel.js';
import { textOf } from '../../lib/xml.js';
import { child, children, colorChildOf, drawingColor, findAll, openPackage, path, readTheme } from './ooxml.js';

const DEFAULT_SZ = 1800; // 18 pt: padrão do PowerPoint quando nada define sz
const FILL_TAGS = ['a:solidFill', 'a:gradFill', 'a:noFill', 'a:pattFill', 'a:blipFill'];

const relOfType = (rels, suffix) => [...rels.values()].find((r) => r.type.endsWith(suffix))?.target ?? null;

export async function parsePptx(buffer) {
  const pkg = openPackage(buffer, 'PowerPoint (.pptx)');
  const pres = pkg.xml('ppt/presentation.xml');
  if (!pres) throw new DocInputError('O arquivo não é um PowerPoint (.pptx) válido: falta ppt/presentation.xml.');
  const presEl = child(pres, 'p:presentation');
  const presRels = pkg.rels('ppt/presentation.xml');
  const slidePaths = children(child(presEl, 'p:sldIdLst'), 'p:sldId')
    .map((s) => presRels.get(s.attrs['r:id'])?.target)
    .filter((p) => p && pkg.has(p));
  const defaultTextStyle = child(presEl, 'p:defaultTextStyle');

  const texts = [];
  const logos = new Map(); // media → logo
  const doneParts = new Set();

  const ctxCache = new Map();
  const masterCtx = (masterPath) => {
    if (ctxCache.has(masterPath)) return ctxCache.get(masterPath);
    const master = child(pkg.xml(masterPath), 'p:sldMaster');
    const mRels = pkg.rels(masterPath);
    const theme = readTheme(pkg.xml(relOfType(mRels, '/theme')));
    const ctx = {
      path: masterPath,
      el: master,
      rels: mRels,
      theme,
      clrMap: { ...(child(master, 'p:clrMap')?.attrs ?? {}) },
      txStyles: child(master, 'p:txStyles'),
    };
    ctxCache.set(masterPath, ctx);
    return ctx;
  };

  for (const [i, sp] of slidePaths.entries()) {
    const slide = child(pkg.xml(sp), 'p:sld');
    const rels = pkg.rels(sp);
    const layoutPath = relOfType(rels, '/slideLayout');
    const layout = layoutPath ? child(pkg.xml(layoutPath), 'p:sldLayout') : null;
    const layoutRels = layoutPath ? pkg.rels(layoutPath) : new Map();
    const masterPath = relOfType(layoutRels, '/slideMaster');
    const m = masterPath ? masterCtx(masterPath) : { theme: { colors: {}, fonts: {} }, clrMap: {}, txStyles: null, el: null, rels: new Map() };
    const ovr = path(slide, 'p:clrMapOvr', 'a:overrideClrMapping')?.attrs;
    const clrMap = ovr ? { ...m.clrMap, ...ovr } : m.clrMap;
    const scheme = (key) => m.theme.colors[clrMap[key] ?? key] ?? null;
    const font = (tf) => (tf === '+mj-lt' ? m.theme.fonts.major : tf === '+mn-lt' ? m.theme.fonts.minor : tf?.startsWith('+') ? null : tf);
    const env = { scheme, font, layout, master: m.el, txStyles: m.txStyles, defaultTextStyle, minorFont: m.theme.fonts.minor };

    const where = `Slide ${i + 1}`;
    const bg = slideBackground([slide, layout, m.el], env.scheme);
    collectTexts(child(slide, 'p:cSld'), env, where, texts, { placeholders: true });
    await collectLogos(pkg, child(slide, 'p:cSld'), rels, where, logos, bg);

    // Elementos fixos de layout/mestre (texto que não é placeholder e logomarcas)
    for (const [part, el, partRels, label] of [
      [layoutPath, layout, layoutRels, `Layout de ${where}`],
      [masterPath, m.el, m.rels, 'Slide mestre'],
    ]) {
      if (!part || !el || doneParts.has(part)) continue;
      doneParts.add(part);
      if (el.name === 'p:sldLayout' && el.attrs.showMasterSp === '0') continue;
      collectTexts(child(el, 'p:cSld'), env, label, texts, { placeholders: false });
      await collectLogos(pkg, child(el, 'p:cSld'), partRels, label, logos, bg);
    }
  }

  return { format: 'PPTX', texts, logos: [...logos.values()], targets: [], units: { slides: slidePaths.length } };
}

// ------------------------------------------------------------------- texto

function phInfo(sp) {
  const ph = path(sp, 'p:nvSpPr', 'p:nvPr', 'p:ph');
  if (!ph) return null;
  return { type: ph.attrs.type ?? 'body', idx: ph.attrs.idx ?? null };
}

function findPh(root, info, { byIdx = true } = {}) {
  if (!root || !info) return null;
  const all = findAll(root, 'p:sp').map((s) => ({ s, ph: phInfo(s) })).filter((x) => x.ph);
  const norm = (t) => (t === 'ctrTitle' ? 'title' : t === 'subTitle' || t === 'obj' ? 'body' : t);
  return (
    (byIdx && info.idx != null && all.find((x) => x.ph.idx === info.idx)?.s) ||
    all.find((x) => x.ph.type === info.type)?.s ||
    all.find((x) => norm(x.ph.type) === norm(info.type))?.s ||
    null
  );
}

const lvlDef = (lstStyle, lvl) => path(lstStyle, `a:lvl${lvl + 1}pPr`, 'a:defRPr');

function collectTexts(cSld, env, where, out, { placeholders }) {
  const tree = child(cSld, 'p:spTree');
  if (!tree) return;
  for (const sp of findAll(tree, 'p:sp')) {
    const txBody = child(sp, 'p:txBody');
    if (!txBody) continue;
    const ph = phInfo(sp);
    if (ph && !placeholders) continue; // placeholders de layout/mestre são só modelos
    const layoutPh = ph ? findPh(env.layout, ph) : null;
    const masterPh = ph ? findPh(env.master, ph, { byIdx: false }) : null;
    const styleKind = !ph ? 'p:otherStyle' : ph.type === 'title' || ph.type === 'ctrTitle' ? 'p:titleStyle' : ['dt', 'ftr', 'sldNum', 'hdr'].includes(ph.type) ? 'p:otherStyle' : 'p:bodyStyle';
    const lstChain = [
      child(txBody, 'a:lstStyle'),
      path(layoutPh, 'p:txBody', 'a:lstStyle'),
      path(masterPh, 'p:txBody', 'a:lstStyle'),
      ...(ph ? [child(env.txStyles, styleKind)] : [env.defaultTextStyle, child(env.txStyles, 'p:otherStyle')]),
      ...(ph ? [env.defaultTextStyle] : []),
    ].filter(Boolean);
    const scaleAttr = path(txBody, 'a:bodyPr', 'a:normAutofit')?.attrs.fontScale;
    const fontScale = scaleAttr ? Number(scaleAttr) / 100000 : 1;
    const name = path(sp, 'p:nvSpPr', 'p:cNvPr')?.attrs.name;
    pushParagraphs(txBody, lstChain, fontScale, env, `${where} · ${name ?? 'caixa de texto'}`, out);
  }
  // Tabelas
  for (const tc of findAll(tree, 'a:tc')) {
    const txBody = child(tc, 'a:txBody');
    if (txBody) pushParagraphs(txBody, [child(txBody, 'a:lstStyle'), env.defaultTextStyle, child(env.txStyles, 'p:otherStyle')].filter(Boolean), 1, env, `${where} · tabela`, out);
  }
}

function pushParagraphs(txBody, lstChain, fontScale, env, where, out) {
  for (const p of children(txBody, 'a:p')) {
    const pPr = child(p, 'a:pPr');
    const lvl = Number(pPr?.attrs.lvl ?? 0);
    const chain = [child(pPr, 'a:defRPr'), ...lstChain.map((l) => lvlDef(l, lvl))].filter(Boolean);
    for (const r of p.children.filter((c) => typeof c === 'object' && (c.name === 'a:r' || c.name === 'a:fld'))) {
      const text = textOf(child(r, 'a:t'));
      if (!text.trim()) continue;
      const rPrs = [child(r, 'a:rPr'), ...chain].filter(Boolean);
      const sz = rPrs.find((x) => x.attrs.sz)?.attrs.sz;
      const latinEl = rPrs.map((x) => child(x, 'a:latin')).find((x) => x?.attrs.typeface);
      const fontName = latinEl ? env.font(latinEl.attrs.typeface) : env.minorFont;
      const fillHolder = rPrs.find((x) => FILL_TAGS.some((t) => child(x, t)));
      let color = null;
      let colorNote = null;
      if (fillHolder) {
        const solid = child(fillHolder, 'a:solidFill');
        if (solid) color = drawingColor(colorChildOf(solid), env.scheme);
        else colorNote = 'gradiente/sem preenchimento — não avaliado';
      } else {
        color = env.scheme('tx1');
        colorNote = 'cor padrão do tema (tx1)';
      }
      const bold = rPrs.find((x) => x.attrs.b != null)?.attrs.b;
      out.push({
        text,
        font: fontName ?? null,
        weight: bold === '1' || bold === 'true' ? 700 : 400,
        sizePt: ((Number(sz ?? DEFAULT_SZ) / 100) * fontScale),
        color,
        colorNote: color ? (fillHolder ? null : colorNote) : colorNote,
        where,
      });
    }
  }
}

// --------------------------------------------------------------- logomarca

/** Fundo do slide: p:bg do slide → layout → mestre (cor sólida; imagem/gradiente = indefinido). */
function slideBackground(els, scheme) {
  for (const el of els) {
    const bg = path(el, 'p:cSld', 'p:bg');
    if (!bg) continue;
    const solid = path(bg, 'p:bgPr', 'a:solidFill');
    if (solid) return { color: drawingColor(colorChildOf(solid), scheme), note: 'fundo do slide' };
    const ref = child(bg, 'p:bgRef');
    if (ref) {
      const c = colorChildOf(ref);
      if (c) return { color: drawingColor(c, scheme), note: 'fundo do slide (tema)' };
    }
    return { color: null, note: 'fundo do slide com imagem/gradiente' };
  }
  return { color: scheme('bg1') ?? '#FFFFFF', note: 'fundo padrão do tema (bg1)' };
}

async function collectLogos(pkg, cSld, rels, where, logos, bg) {
  for (const pic of findAll(cSld, 'p:pic')) {
    const nv = path(pic, 'p:nvPicPr', 'p:cNvPr')?.attrs ?? {};
    const blip = findAll(pic, 'a:blip')[0];
    const svgId = findAll(pic, '*:svgBlip')[0]?.attrs['r:embed'];
    const rasterId = blip?.attrs['r:embed'];
    const target = rels.get(svgId)?.target ?? rels.get(rasterId)?.target ?? null;
    if (!isLogoName(nv.name, nv.descr, nv.title, target)) continue;
    const key = target ?? `${where}:${nv.name}`;
    if (logos.has(key)) {
      logos.get(key).uses += 1;
      continue;
    }
    const colors = target ? await imageColors(pkg.bytes(target)) : null;
    logos.set(key, {
      colors,
      where,
      source: [nv.name, target?.split('/').pop()].filter(Boolean).join(' · '),
      note: target ? (colors ? null : 'imagem sem cores legíveis') : 'imagem externa/vinculada',
      background: bg?.color ?? null,
      backgroundNote: bg?.note,
      box: boxOf(pic),
      uses: 1,
    });
  }
}

function boxOf(pic) {
  const ext = path(pic, 'p:spPr', 'a:xfrm', 'a:ext')?.attrs;
  return ext ? { w: Number(ext.cx), h: Number(ext.cy) } : null;
}
