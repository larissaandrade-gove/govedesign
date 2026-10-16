// PDF → modelo normalizado, com pdf.js (build legacy, sem worker: o
// WorkerMessageHandler roda na mesma thread, no Node e no navegador).
// Texto: lista de operadores de cada página — cor de preenchimento atual,
// nome real da fonte (commonObjs) e tamanho = tamanho da fonte × escala
// vertical da matriz (Tm × CTM), em pt.
// Logomarca: conteúdo marcado (Figure/Artifact…) cuja estrutura tem texto
// alternativo com "logo"/"gove"; cores = preenchimentos vetoriais e imagens
// dentro dele; fundo = último retângulo preenchido sob o centro da logomarca
// (ou a página branca).
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import * as worker from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import { DocInputError, isLogoName, pixelColors } from '../docModel.js';

// Sem worker separado (bundle único no navegador; no Node não há Worker web).
globalThis.pdfjsWorker ??= worker;

const OPS = pdfjs.OPS;
const mul = (m, n) => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const arr = (a) => (a ? Array.from({ length: 6 }, (_, i) => Number(a[i])) : [1, 0, 0, 1, 0, 0]);

function toHexColor(args) {
  if (!args) return null;
  const a = args[0];
  if (typeof a === 'string' && /^#[0-9a-f]{6}$/i.test(a)) return a.toUpperCase();
  if (args.length >= 3 && args.slice(0, 3).every((v) => typeof v === 'number')) {
    const s = args.slice(0, 3).map((v) => (v <= 1 && args.every((x) => x <= 1) ? Math.round(v * 255) : Math.round(v)));
    return `#${s.map((v) => v.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  }
  return null;
}

export async function parsePdf(buffer) {
  const data = new Uint8Array(buffer.buffer ? buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) : buffer);
  let doc;
  let task;
  try {
    task = pdfjs.getDocument({
      data,
      disableFontFace: true,
      fontExtraProperties: true,
      useSystemFonts: false,
      isEvalSupported: false,
      useWorkerFetch: false,
      // Imagens como pixels crus (sem ImageBitmap), iguais no Node e no navegador
      isOffscreenCanvasSupported: false,
      isImageDecoderSupported: false,
      verbosity: 0,
    });
    doc = await task.promise;
  } catch (e) {
    throw new DocInputError(e?.name === 'PasswordException' ? 'O PDF está protegido por senha.' : 'O arquivo não é um PDF válido.');
  }
  const texts = [];
  const logos = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      await readPage(page, p, texts, logos);
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return { format: 'PDF', texts, logos, targets: [], units: { pages: doc.numPages } };
}

async function logoMcids(page) {
  const out = new Map(); // mcid → rótulo
  let tree = null;
  try {
    tree = await page.getStructTree();
  } catch {
    return out;
  }
  const walk = (n, inherited) => {
    const label = n.alt && isLogoName(n.alt) ? n.alt : inherited;
    for (const c of n.children ?? []) {
      if (c.type === 'content' && label) {
        const m = /_mc(\d+)$/.exec(c.id ?? '');
        if (m) out.set(Number(m[1]), label);
      } else if (c.children) walk(c, label);
    }
  };
  if (tree) walk(tree, null);
  return out;
}

async function readPage(page, pageNo, texts, logos) {
  const ops = await page.getOperatorList();
  const logoMc = await logoMcids(page);
  const view = page.view; // [x0, y0, x1, y1]
  const where = `Página ${pageNo}`;

  let ctm = [1, 0, 0, 1, 0, 0];
  let fill = '#000000';
  let font = null;
  let fontSize = 0;
  let tm = [1, 0, 0, 1, 0, 0];
  let tlm = [1, 0, 0, 1, 0, 0];
  let leading = 0;
  const stack = [];
  const mcStack = [];
  const fills = []; // retângulos preenchidos { box, color } em espaço da página
  const logoAcc = new Map(); // rótulo → { colors:Set, box, images:[] }

  const fontName = (id) => {
    try {
      const f = page.commonObjs.get(id);
      return f?.name ?? f?.fallbackName ?? null;
    } catch {
      return null;
    }
  };
  const currentLogo = () => {
    for (let i = mcStack.length - 1; i >= 0; i--) if (mcStack[i] != null) return mcStack[i];
    return null;
  };
  const logoEntry = (label) => {
    if (!logoAcc.has(label)) logoAcc.set(label, { colors: new Set(), box: null, pixelHex: [] });
    return logoAcc.get(label);
  };
  const grow = (e, box) => {
    e.box = e.box ? [Math.min(e.box[0], box[0]), Math.min(e.box[1], box[1]), Math.max(e.box[2], box[2]), Math.max(e.box[3], box[3])] : box;
  };
  const boxOf = (m, x0, y0, x1, y1) => {
    const pts = [apply(m, x0, y0), apply(m, x1, y0), apply(m, x0, y1), apply(m, x1, y1)];
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  };
  const pushText = (str) => {
    if (!str.trim()) return;
    const m = mul(tm, ctm);
    const scale = Math.hypot(m[2], m[3]);
    const size = fontSize * scale;
    const prev = texts.at(-1);
    const fam = fontName(font);
    // Junta trechos consecutivos com o mesmo estilo
    if (prev && prev._page === pageNo && prev._key === `${fam}|${fill}|${size.toFixed(2)}`) {
      prev.text += /\s$/.test(prev.text) || /^\s/.test(str) ? str : ` ${str}`;
      return;
    }
    texts.push({ text: str, font: fam, sizePt: size, color: fill, where, _page: pageNo, _key: `${fam}|${fill}|${size.toFixed(2)}` });
  };

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const a = ops.argsArray[i];
    switch (fn) {
      case OPS.save:
        stack.push({ ctm, fill, font, fontSize });
        break;
      case OPS.restore: {
        const s = stack.pop();
        if (s) ({ ctm, fill, font, fontSize } = s);
        break;
      }
      case OPS.transform:
        ctm = mul(arr(a), ctm);
        break;
      case OPS.paintFormXObjectBegin:
        stack.push({ ctm, fill, font, fontSize });
        if (a?.[0]) ctm = mul(arr(a[0]), ctm);
        break;
      case OPS.paintFormXObjectEnd: {
        const s = stack.pop();
        if (s) ({ ctm, fill, font, fontSize } = s);
        break;
      }
      case OPS.setFillRGBColor:
      case OPS.setFillGray:
      case OPS.setFillCMYKColor:
      case OPS.setFillColor: {
        const h = toHexColor(a);
        if (h) fill = h;
        break;
      }
      case OPS.beginText:
        tm = [1, 0, 0, 1, 0, 0];
        tlm = [1, 0, 0, 1, 0, 0];
        break;
      case OPS.setFont:
        font = a[0];
        fontSize = Number(a[1]) || 0;
        break;
      case OPS.setTextMatrix:
        tm = arr(a[0]?.length != null || a[0]?.[0] != null ? a[0] : a);
        tlm = tm;
        break;
      case OPS.setLeading:
        leading = Number(a[0]) || 0;
        break;
      case OPS.moveText:
      case OPS.setLeadingMoveText:
        if (fn === OPS.setLeadingMoveText) leading = -Number(a[1]) || leading;
        tlm = mul([1, 0, 0, 1, Number(a[0]), Number(a[1])], tlm);
        tm = tlm;
        break;
      case OPS.nextLine:
        tlm = mul([1, 0, 0, 1, 0, -leading], tlm);
        tm = tlm;
        break;
      case OPS.showText:
      case OPS.showSpacedText:
      case OPS.nextLineShowText:
      case OPS.nextLineSetSpacingShowText: {
        const glyphs = (Array.isArray(a?.[0]) ? a[0] : a?.at?.(-1) ?? []).filter((g) => g && typeof g === 'object');
        const str = glyphs.map((g) => g.unicode ?? '').join('');
        const lg = currentLogo();
        if (lg) logoEntry(lg).colors.add(fill);
        else pushText(str);
        break;
      }
      case OPS.beginMarkedContentProps: {
        const mcid = typeof a?.[1] === 'number' ? a[1] : a?.[1]?.mcid ?? a?.[1]?.MCID;
        mcStack.push(mcid != null && logoMc.has(mcid) ? logoMc.get(mcid) : null);
        break;
      }
      case OPS.beginMarkedContent:
        mcStack.push(null);
        break;
      case OPS.endMarkedContent:
        mcStack.pop();
        break;
      case OPS.constructPath: {
        // pdf.js ≥ 4: [op de pintura, [dados], minMax]
        const paint = a?.[0];
        const minMax = a?.[2];
        const isFill = [OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke].includes(paint);
        if (!isFill || !minMax) break;
        const box = boxOf(ctm, minMax[0], minMax[1], minMax[2], minMax[3]);
        const lg = currentLogo();
        if (lg) {
          const e = logoEntry(lg);
          e.colors.add(fill);
          grow(e, box);
        } else fills.push({ box, color: fill });
        break;
      }
      case OPS.paintImageXObject:
      case OPS.paintInlineImageXObject: {
        const lg = currentLogo();
        if (!lg) break;
        const e = logoEntry(lg);
        grow(e, boxOf(ctm, 0, 0, 1, 1));
        const img = fn === OPS.paintInlineImageXObject ? a[0] : await getObj(page, a[0]);
        if (img?.bitmap && typeof OffscreenCanvas !== 'undefined') {
          const c = new OffscreenCanvas(img.bitmap.width, img.bitmap.height);
          const ctx = c.getContext('2d');
          ctx.drawImage(img.bitmap, 0, 0);
          const d = ctx.getImageData(0, 0, c.width, c.height);
          e.pixelHex.push(...pixelColors({ data: d.data, width: d.width, height: d.height, channels: 4 }));
        } else if (img?.data && img.width && img.height) {
          const channels = img.data.length / (img.width * img.height);
          if (channels === 3 || channels === 4) e.pixelHex.push(...pixelColors({ data: img.data, width: img.width, height: img.height, channels }));
        }
        break;
      }
      default:
        break;
    }
  }

  for (const [label, e] of logoAcc) {
    const colors = [...new Set([...e.colors, ...e.pixelHex])];
    let background = '#FFFFFF';
    let backgroundNote = 'página branca';
    if (e.box) {
      const cx = (e.box[0] + e.box[2]) / 2;
      const cy = (e.box[1] + e.box[3]) / 2;
      const under = fills.filter((f) => f.box[0] <= cx && f.box[2] >= cx && f.box[1] <= cy && f.box[3] >= cy).at(-1);
      if (under) {
        background = under.color;
        backgroundNote = 'forma preenchida sob a logomarca';
      }
    }
    logos.push({
      colors: colors.length ? colors : null,
      where,
      source: `texto alternativo “${label}”`,
      note: colors.length ? null : 'conteúdo sem cores legíveis',
      background,
      backgroundNote,
      box: e.box ? { w: e.box[2] - e.box[0], h: e.box[3] - e.box[1] } : null,
    });
  }
  void view;
  for (const t of texts) {
    delete t._key;
    delete t._page;
  }
}

function getObj(page, id) {
  return new Promise((resolve) => {
    try {
      page.objs.get(id, resolve);
    } catch {
      resolve(null);
    }
  });
}
