// VectorCraft no Gove Design System: barra de produção gráfica (abrir peça,
// amostras CMYK GOVE/BB, converter para CMYK, checar e exportar PDF/X-1a) sobre
// o editor vetorial, comandado pela API `window.vectorcraft`.
import { FONT_FILES } from '../../print-studio/shared/tokens.js';
import { PALETTES } from './palettes.js';
import { takeHandoff } from '../../shared/handoff.js';

const $ = (id) => document.getElementById(id);
const vc = () => window.vectorcraft;

/* ---------------------------------------------------------------- avisos */

let toastTimer = 0;
function toast(text, kind = 'info') {
  const el = $('gv-toast');
  el.textContent = text;
  el.dataset.kind = kind;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), kind === 'error' ? 9000 : 5000);
}

function report(title, items) {
  const box = $('gv-report');
  $('gv-report-title').textContent = title;
  const list = $('gv-report-list');
  list.replaceChildren(
    ...items.map(({ level, text }) => {
      const li = document.createElement('li');
      li.dataset.level = level;
      li.textContent = text;
      return li;
    }),
  );
  box.hidden = false;
}

/* ------------------------------------------------------ download/claude */

function findClaude() {
  for (const w of [window, window.parent, window.top]) {
    try {
      if (w && w.claude && typeof w.claude.use === 'function') return w.claude;
    } catch {
      /* outra origem */
    }
  }
  return null;
}

async function saveFile(filename, blob) {
  const c = findClaude();
  if (c) {
    const downloads = await c.use('downloads').catch(() => null);
    if (downloads) {
      try {
        await downloads.save({ filename, data: blob });
        return 'saved';
      } catch (e) {
        if (e?.code === 'declined') return 'declined';
        throw new Error(e?.message || 'Não foi possível baixar o arquivo.');
      }
    }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'saved';
}

const b64ToBytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/* ------------------------------------------------------------- comandos */

let current = 'peca';

async function ready() {
  for (let i = 0; i < 600 && !vc(); i++) await new Promise((r) => setTimeout(r, 100));
  if (!vc()) throw new Error('O VectorCraft ainda não carregou.');
  return vc();
}

async function openBytes(name, bytes) {
  const api = await ready();
  current = name.replace(/\.[^.]+$/, '') || 'peca';
  api.openFile(name, bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
  $('gv-doc').textContent = name;
}

async function hasDocument() {
  const info = await vc()?.inspect().catch(() => null);
  return info?.activeDocument != null;
}

async function addPalette(id) {
  const p = PALETTES[id];
  const api = await ready();
  if (!(await hasDocument())) return toast('Abra ou crie um documento antes de adicionar as amostras.', 'error');
  const list = await api.execute('swatch.list', {});
  const existing = new Set((list.swatches ?? []).map((s) => s.name));
  const names = [];
  for (const c of p.colors) {
    if (existing.has(c.name)) continue;
    const [cy, m, y, k] = c.cmyk;
    const r = await api.execute('swatch.new', { name: c.name, color: { c: cy, m, y, k }, global: true });
    names.push(r.name);
  }
  if (!names.length) return toast(`As amostras ${p.label} já estão no documento.`);
  // Grupo de cores próprio no painel Amostras
  if ((list.groups ?? []).some((g) => g.name === p.group)) await api.execute('swatch.move', { names, group: p.group });
  else await api.execute('swatch.newGroup', { name: p.group, swatches: names });
  toast(`${names.length} amostras CMYK ${p.label} adicionadas no grupo “${p.group}”.`);
}

async function toCmyk() {
  const api = await ready();
  if (!(await hasDocument())) return toast('Abra uma peça primeiro.', 'error');
  await api.execute('file.documentColorMode', { mode: 'cmyk' });
  toast('Documento em CMYK. As cores RGB foram separadas pelas configurações de cor.');
}

// PDF/X-4 (padrão): transparência, vetores e texto vivos, tudo convertido para o CMYK do
// perfil de saída. PDF/X-1a: PDF 1.3 sem transparência — o achatamento pode virar imagem.
const PDFX = {
  x4: { label: 'PDF/X-4', file: 'PDFX-4', standard: 'pdfX4', output: { conversion: 'destination' } },
  x1a: { label: 'PDF/X-1a', file: 'PDFX-1a', standard: 'pdfX1a', flattenerPreset: 'high' },
};
const pdfOptions = ({ label: _l, file: _f, ...opts }) => ({ ...opts, marks: { trim: true, registration: false, colorBars: false, pageInfo: false }, bleed: { useDocument: true } });
const warnText = (w) => (typeof w === 'string' ? w : w.message ?? JSON.stringify(w));

async function check() {
  const api = await ready();
  if (!(await hasDocument())) return toast('Abra uma peça primeiro.', 'error');
  const items = [];
  const s = await api.execute('document.pdfSettings', { ...pdfOptions(PDFX.x4), includeDocument: true }).catch((e) => ({ error: e.message }));
  if (s.error) items.push({ level: 'error', text: s.error });
  for (const w of s.warnings ?? []) items.push({ level: 'warn', text: warnText(w) });
  const fonts = await api.execute('text.missingFonts', {}).catch(() => null);
  for (const f of fonts?.fonts ?? []) items.push({ level: 'error', text: `Fonte ${f.status === 'missing' ? 'ausente' : 'substituída'}: ${f.family} ${f.style} (no lugar: ${f.resolved?.family ?? '?'} ${f.resolved?.style ?? ''}).` });
  if (!items.length) items.push({ level: 'ok', text: 'Pronto para a gráfica: fontes disponíveis, cores convertidas para CMYK na exportação e sangria do documento.' });
  report('Checagem de impressão', items);
}

async function exportPdfx(kind) {
  const preset = PDFX[kind];
  const api = await ready();
  if (!(await hasDocument())) return toast('Abra uma peça primeiro.', 'error');
  const out = await api.execute('document.exportPdf', pdfOptions(preset));
  // Nome da aba ativa (o Print Studio abre uma aba por layout)
  const info = await api.inspect().catch(() => null);
  const title = info?.documents?.[info.activeDocument]?.title ?? current;
  const name = `${title.replace(/\.[^.]+$/, '') || 'peca'}_${preset.file}.pdf`;
  const r = await saveFile(name, new Blob([b64ToBytes(out.dataBase64)], { type: 'application/pdf' }));
  if (r === 'saved') toast(`${name} pronto para a gráfica.`);
  if (out.warnings?.length) report(`Avisos do ${preset.label}`, out.warnings.map((w) => ({ level: 'warn', text: warnText(w) })));
}

/* ------------------------------------------------------------------ UI */

const guard = (fn) => async (...a) => {
  try {
    await fn(...a);
  } catch (e) {
    toast(e?.message || 'Algo deu errado.', 'error');
  }
};

$('gv-open').addEventListener('click', () => $('gv-file').click());
$('gv-file').addEventListener(
  'change',
  guard(async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) await openBytes(f.name, new Uint8Array(await f.arrayBuffer()));
  }),
);
$('gv-gove').addEventListener('click', guard(() => addPalette('gove')));
$('gv-bb').addEventListener('click', guard(() => addPalette('bb')));
$('gv-cmyk').addEventListener('click', guard(toCmyk));
$('gv-check').addEventListener('click', guard(check));
$('gv-export').addEventListener('click', guard(() => exportPdfx('x4')));
$('gv-export-x1a').addEventListener('click', guard(() => exportPdfx('x1a')));
$('gv-report-close').addEventListener('click', () => ($('gv-report').hidden = true));

// Peça enviada pelo Print Studio (ou outro app do ecossistema)
async function receive() {
  const h = await takeHandoff('vectorcraft');
  if (!h?.files?.length) return;
  for (const f of h.files) await openBytes(f.name, f.bytes);
  const n = h.files.length;
  toast(`${n === 1 ? `Peça recebida${h.from ? ` do ${h.from}` : ''}: ${h.files[0].name}` : `${n} peças recebidas${h.from ? ` do ${h.from}` : ''}, uma por aba`}.`);
}
window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || e.data?.type !== 'gove:vectorcraft-open') return;
  guard(() => openBytes(e.data.name, e.data.bytes))();
});
window.addEventListener('focus', guard(receive));

/** Montserrat e as fontes BB: o texto das peças do Print Studio abre na fonte certa. */
async function loadBrandFonts() {
  const api = await ready();
  if (typeof api.addFont !== 'function') return;
  await Promise.all(
    Object.values(FONT_FILES).map(async (file) => {
      try {
        const r = await fetch(new URL(`./vectorcraft/fonts/${file}`, location.href));
        if (r.ok) api.addFont(new Uint8Array(await r.arrayBuffer()));
      } catch {
        /* sem a fonte: o editor usa a substituta e avisa */
      }
    }),
  );
}

export function started() {
  guard(async () => {
    await loadBrandFonts();
    await receive();
  })();
}
