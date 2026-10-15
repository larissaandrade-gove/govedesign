// Revisor de identidade visual — versão 100% no navegador (artefato do Design System).
// Reaproveita backend/services/auditService.js, as checagens dos Modos A e B, o
// relatório JSON/HTML e o ZIP; as dependências de Node são trocadas por shims
// (ver vite.config.js). Sem chamadas de rede.
import '../shims/globals.js';
import { config as fabricConfig } from 'fabric';
import { isEmbedded, saveFile, setStandaloneTheme, syncTheme, currentTheme } from '../../../artifact-runtime/index.ts';
import { AuditInputError, runAudit } from '../../../backend/services/auditService.js';
import { auditEntries, zipToBuffer } from '../../../backend/report/package.js';
import { generateQr } from '../../../backend/lib/qrcode.js';
import { browserDb, historyCol, listAudits, loadBrandTokens, openDatabase } from '../shims/database.js';
import { FONTSOURCE_WOFF2_B64 } from '../.generated/data.js';

// O preview do Modo A é renderizado em 1:1 com o artboard, como no Node.
fabricConfig.configure({ devicePixelRatio: 1 });

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const OVERALL = { aprovado: 'ok', aprovado_com_ressalvas: 'warn', reprovado: 'fail' };
const STATUS_LABEL = { aprovado: '✅ Aprovado', aprovado_com_ressalvas: '⚠️ Com ressalvas', reprovado: '❌ Reprovado' };

/* ------------------------------------------------------------------ tema */
syncTheme(updateThemeToggle);
const toggle = $('#theme-toggle');
function updateThemeToggle() {
  const dark = currentTheme() === 'dark';
  toggle.setAttribute('aria-pressed', String(dark));
  toggle.textContent = dark ? 'Tema claro' : 'Tema escuro';
}
if (!isEmbedded()) {
  toggle.hidden = false;
  updateThemeToggle();
  toggle.addEventListener('click', () => {
    setStandaloneTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    updateThemeToggle();
  });
}

/* ---------------------------------------------------------------- fontes */
// Montserrat embutida (mesmos .woff2 do @fontsource usados no relatório):
// a interface usa, e o Fabric mede os textos do Modo A com a fonte real.
async function loadMontserrat() {
  await Promise.allSettled(
    Object.entries(FONTSOURCE_WOFF2_B64).map(async ([path, b64]) => {
      const m = /-(\d{3})-(normal|italic)\.woff2$/.exec(path);
      if (!m) return;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const face = new FontFace('Montserrat', bytes, { weight: m[1], style: m[2] });
      await face.load();
      document.fonts.add(face);
    }),
  );
}

const ready = Promise.all([loadMontserrat(), openDatabase()]).then(([, db]) => db);
const session = new Map(); // id → { report, html, preview } (só nesta página)

/* -------------------------------------------------------------- downloads */
const baseName = (n) => String(n).replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'peca';
const pngDataUrl = (buf) => `data:image/png;base64,${buf.toString('base64')}`;

async function deliver(filename, data, statusEl) {
  statusEl.textContent = 'Preparando o arquivo…';
  try {
    const outcome = await saveFile(filename, data);
    statusEl.textContent =
      outcome === 'saved' ? `Arquivo ${filename} entregue.` : outcome === 'declined' ? 'Download cancelado.' : 'Não foi possível baixar o arquivo neste ambiente.';
  } catch {
    statusEl.textContent = 'Não foi possível baixar o arquivo neste ambiente.';
  }
}

const standaloneHtml = (a) => (a.preview ? a.html.replace('src="preview-anotado.png"', `src="${pngDataUrl(a.preview)}"`) : a.html);

async function downloadZip(a, statusEl) {
  const zip = await zipToBuffer(auditEntries({ report: a.report, html: a.html, preview: a.preview }));
  await deliver(`revisao-identidade-${baseName(a.report.file.name)}.zip`, new Blob([zip], { type: 'application/zip' }), statusEl);
}
const downloadHtml = (a, statusEl) =>
  deliver(`revisao-identidade-${baseName(a.report.file.name)}.html`, new Blob([standaloneHtml(a)], { type: 'text/html;charset=utf-8' }), statusEl);
const downloadJson = (a, statusEl) =>
  deliver(`revisao-identidade-${baseName(a.report.file.name)}.json`, new Blob([JSON.stringify(a.report, null, 2)], { type: 'application/json' }), statusEl);

/* --------------------------------------------------------------- auditoria */
const form = $('#audit-form');
let current = null;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button[type="submit"]');
  const status = $('#form-status');
  const data = new FormData(form);
  const file = data.get('file');
  if (!file?.size) {
    status.textContent = 'Envie a peça no campo "Peça".';
    return;
  }
  btn.disabled = true;
  status.textContent = 'Revisando a peça…';
  try {
    const db = await ready;
    let regions;
    const regionsFile = data.get('regions');
    if (regionsFile?.size) {
      try {
        regions = JSON.parse(await regionsFile.text());
      } catch {
        throw new AuditInputError('Metadados de regiões não são um JSON válido.');
      }
    }
    const w = Number(data.get('artboardWidth'));
    const h = Number(data.get('artboardHeight'));
    const result = await runAudit({
      db,
      file: { name: file.name, buffer: Buffer.from(await file.arrayBuffer()), mimetype: file.type || undefined },
      regions,
      pieceType: data.get('pieceType') || undefined,
      artboard: w > 0 && h > 0 ? { width: w, height: h } : undefined,
    });
    session.set(result.id, result);
    current = result;
    status.textContent = '';
    renderResult(result);
    renderHistory();
  } catch (err) {
    if (!(err instanceof AuditInputError)) console.warn('[revisor]', err);
    status.textContent = err instanceof AuditInputError ? err.message : 'Erro ao processar a peça. Confira se o arquivo é um Fabric.js JSON ou uma imagem PNG/JPG válida.';
  } finally {
    btn.disabled = false;
  }
});

function renderResult({ report, preview }) {
  $('#result').hidden = false;
  $('#r-mode').textContent = `Modo ${report.mode.code} · ${report.mode.name}${report.pieceType ? ` · ${report.pieceType}` : ''}`;
  $('#r-file').textContent = report.file.name;
  const pill = $('#r-status');
  pill.className = `pill ${OVERALL[report.status.code]}`;
  pill.textContent = `${report.status.icon} ${report.status.label}`;
  $('#r-callouts').innerHTML = [
    ...report.limitations.map((l) => `<div class="callout"><p>${esc(l)}</p></div>`),
    ...report.notices.map((n) => `<div class="callout info"><p>${esc(n)}</p></div>`),
  ].join('');
  const s = report.summary;
  $('#r-tiles').innerHTML = `
    <div class="tile ok"><b>${s.pass}</b><span>✅ Conformes</span></div>
    <div class="tile warn"><b>${s.warn}</b><span>⚠️ Atenção</span></div>
    <div class="tile warn"><b>${s.manual}</b><span>⚠️ Revisão manual</span></div>
    <div class="tile fail"><b>${s.fail}</b><span>❌ Não conformes</span></div>`;
  $('#r-dl-status').textContent = '';
  const fig = $('#r-figure');
  const img = $('#r-preview');
  if (preview) {
    img.src = pngDataUrl(preview);
    fig.hidden = false;
  } else {
    img.removeAttribute('src');
    fig.hidden = true;
  }
  $('#r-checks').innerHTML = report.checks
    .filter((c) => c.status !== 'skip')
    .map(
      (c) => `<li class="check ${c.status}">
        <strong>${c.number}. ${c.icon} ${esc(c.title)}</strong>
        ${c.found != null ? `<p>Encontrado: ${esc(c.found)}</p>` : ''}
        ${c.expected != null ? `<p>Esperado: ${esc(c.expected)}</p>` : ''}
        ${c.suggestion ? `<p class="fix">Como corrigir: ${esc(c.suggestion)}</p>` : ''}
      </li>`,
    )
    .join('');
  $('#result').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

$('#r-zip').addEventListener('click', () => current && downloadZip(current, $('#r-dl-status')));
$('#r-html').addEventListener('click', () => current && downloadHtml(current, $('#r-dl-status')));
$('#r-json').addEventListener('click', () => current && downloadJson(current, $('#r-dl-status')));

/* --------------------------------------------------------------- histórico */
function renderHistory() {
  const rows = listAudits(browserDb, { limit: 20 });
  const mode = historyCol().mode();
  $('#store-mode').textContent = mode === 'db' ? 'Compartilhado no Design System' : mode === 'local' ? 'Salvo só neste navegador' : '';
  $('#history').innerHTML = rows.length
    ? rows
        .map((r) => {
          const here = session.has(r.id);
          return `<tr>
          <td>${esc(new Date(r.createdAt).toLocaleString('pt-BR'))}</td>
          <td class="file">${esc(r.fileName)}</td>
          <td>${esc(r.mode)}</td>
          <td>${STATUS_LABEL[r.status] ?? esc(r.status)}</td>
          <td>${Number(r.failedCount ?? r.failedItems?.length ?? 0)}</td>
          <td>${here ? `<button type="button" class="link" data-dl="html" data-id="${esc(r.id)}">Relatório</button> · <button type="button" class="link" data-dl="zip" data-id="${esc(r.id)}">ZIP</button>` : '<span class="muted" title="Os arquivos ficam disponíveis só na página em que a revisão foi feita">—</span>'}</td>
        </tr>`;
        })
        .join('')
    : '<tr><td colspan="6">Nenhuma auditoria ainda.</td></tr>';
}
$('#history').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-dl]');
  const a = b && session.get(b.dataset.id);
  if (!a) return;
  const st = $('#r-dl-status');
  if (b.dataset.dl === 'zip') downloadZip(a, st);
  else downloadHtml(a, st);
});
historyCol().subscribe(renderHistory);
ready.then(renderHistory, renderHistory);
renderHistory();

/* ----------------------------------------------------------------- QR code */
$('#qr-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const out = $('#qr-out');
  try {
    const db = await ready;
    const qr = await generateQr(loadBrandTokens(db), String(fd.get('text') ?? ''), { width: Number(fd.get('width')) });
    const url = pngDataUrl(qr.data);
    out.innerHTML = `<img src="${url}" alt="QR code gerado"><div><button type="button" class="btn-primary" id="qr-dl">Baixar PNG</button>${qr.adjustments.length ? `<p>${esc(qr.adjustments.join(' | '))}</p>` : ''}<p class="form-status" id="qr-status" role="status" aria-live="polite"></p></div>`;
    $('#qr-dl').addEventListener('click', () => deliver('qrcode-gove.png', new Blob([qr.data], { type: 'image/png' }), $('#qr-status')));
  } catch (err) {
    out.textContent = err.message;
  }
});
