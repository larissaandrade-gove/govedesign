// Versão HTML legível do relatório, no visual Gove (tema Noturno).
// A Montserrat é embutida a partir do @fontsource/montserrat para o arquivo
// funcionar offline dentro do ZIP.
import { embeddedFontFaces } from '../lib/fonts.js';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

let _fonts;
const fontFaces = () =>
  (_fonts ??= embeddedFontFaces([
    { weight: 600, style: 'normal' },
    { weight: 700, style: 'normal' },
  ]));

const STATUS_CLASS = { pass: 'ok', warn: 'warn', manual: 'manual', fail: 'fail', skip: 'skip' };
const OVERALL_CLASS = { aprovado: 'ok', aprovado_com_ressalvas: 'warn', reprovado: 'fail' };

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
  } catch {
    return iso;
  }
}

/**
 * @param {object} report       saída de buildReport
 * @param {object} [opts]
 * @param {string} [opts.previewSrc]  caminho/URL da imagem anotada (ex.: "preview-anotado.png")
 */
export function renderReportHtml(report, { previewSrc = null } = {}) {
  const s = report.summary;
  const overall = OVERALL_CLASS[report.status.code];
  const byCat = report.categories.map((cat) => ({ ...cat, items: report.checks.filter((c) => c.category === cat.key) }));

  const checkRow = (c) => `
      <li class="check ${STATUS_CLASS[c.status]}">
        <div class="check-head">
          <span class="num" aria-label="Item ${c.number}">${c.number}</span>
          <span class="icon" aria-hidden="true">${c.icon}</span>
          <h4>${esc(c.title)}</h4>
          <span class="tag ${STATUS_CLASS[c.status]}">${esc(c.statusLabel)}</span>
        </div>
        ${c.found != null || c.expected != null ? `
        <dl class="kv">
          ${c.found != null ? `<div><dt>Encontrado</dt><dd>${esc(c.found)}</dd></div>` : ''}
          ${c.expected != null ? `<div><dt>Esperado</dt><dd>${esc(c.expected)}</dd></div>` : ''}
        </dl>` : ''}
        ${c.suggestion ? `<p class="fix"><strong>Como corrigir:</strong> ${esc(c.suggestion)}</p>` : ''}
        ${c.objects?.length ? `<p class="objs">Objetos: ${c.objects.map(esc).join(' · ')}</p>` : ''}
      </li>`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Revisão de identidade — ${esc(report.file.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
${fontFaces()}
:root{
  --background:#1A153A; --surface:#2A3233; --primary:#4A00E0; --secondary:#3A2E6B; --accent:#FFC72C;
  --text-strong:#FFFFFF; --text-body:#EAEAEA; --text-muted:#5C6B73; --link:#9D8CFF; --on-accent:#1A153A;
  /* Cores funcionais de status do relatório (não fazem parte da paleta de marca) */
  --ok:#5BE3A8; --fail:#FF6B7A; --warn:var(--accent);
  --space-1:8px; --space-2:16px; --space-3:24px; --space-4:32px; --space-6:48px;
  --radius-sm:4px; --radius-md:8px; --radius-lg:16px; --radius-full:9999px;
  --shadow-md:0 8px 16px rgba(0,0,0,.6);
  --display:Montserrat, Helvetica, Arial, sans-serif; --sans:Inter, Helvetica, Arial, sans-serif;
}
*{box-sizing:border-box}
body{margin:0;background:var(--background);color:var(--text-body);font:400 16px/1.5 var(--sans)}
main{max-width:1180px;margin:0 auto;padding:var(--space-6) var(--space-2)}
h1,h2,h3,h4{font-family:var(--display);color:var(--text-strong);margin:0}
h1{font-size:32px;line-height:1.2;font-weight:700;word-break:break-word}
h2{font-size:24px;line-height:1.3;font-weight:600;margin-bottom:var(--space-2)}
h3{font-size:18px;font-weight:600}
h4{font-size:16px;font-weight:600;line-height:1.4;flex:1;min-width:0}
.eyebrow{font:500 14px/1.4 var(--sans);color:var(--accent);letter-spacing:.02em;margin:0 0 var(--space-1)}
header{display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:flex-end;justify-content:space-between;margin-bottom:var(--space-4)}
.meta{display:flex;flex-wrap:wrap;gap:var(--space-1) var(--space-3);margin-top:var(--space-2);font:500 14px/1.4 var(--sans)}
.meta span b{color:var(--text-strong);font-weight:600}
.pill{display:inline-flex;align-items:center;gap:var(--space-1);padding:12px 20px;border-radius:var(--radius-full);font:700 18px/1 var(--display);border:2px solid currentColor}
.pill.ok{color:var(--ok)} .pill.warn{color:var(--warn)} .pill.fail{color:var(--fail)}
.callout{background:var(--surface);border-left:4px solid var(--accent);border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);margin-bottom:var(--space-2)}
.callout h3{margin-bottom:var(--space-1)}
.callout p{margin:0 0 var(--space-1)} .callout p:last-child{margin:0}
.callout.info{border-left-color:var(--link)}
.tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--space-2);margin:var(--space-4) 0}
.tile{background:var(--surface);border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);border:1px solid var(--secondary)}
.tile b{display:block;font:700 32px/1.1 var(--display);color:var(--text-strong)}
.tile span{font:500 14px/1.4 var(--sans)}
.tile.ok b{color:var(--ok)} .tile.warn b{color:var(--warn)} .tile.fail b{color:var(--fail)}
.grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:var(--space-4);align-items:start;margin-bottom:var(--space-6)}
figure{margin:0;background:var(--surface);border-radius:var(--radius-lg);padding:var(--space-2);border:1px solid var(--secondary)}
figure img{display:block;width:100%;height:auto;border-radius:var(--radius-md)}
figcaption{font:500 14px/1.4 var(--sans);margin-top:var(--space-1)}
.cats{list-style:none;margin:0;padding:0;display:grid;gap:var(--space-1)}
.cats li{display:flex;justify-content:space-between;gap:var(--space-2);background:var(--surface);border-radius:var(--radius-md);padding:12px var(--space-2)}
.cats a{color:var(--text-strong);text-decoration:none;font-weight:500}
.cats a:hover{color:var(--link)}
.tag{flex:none;font:500 12px/1 var(--sans);padding:6px 10px;border-radius:var(--radius-full);border:1px solid currentColor;white-space:nowrap}
.tag.ok{color:var(--ok)} .tag.warn,.tag.manual{color:var(--warn)} .tag.fail{color:var(--fail)} .tag.skip{color:var(--text-body)}
section.cat{margin-bottom:var(--space-6)}
ol.checks{list-style:none;margin:0;padding:0;display:grid;gap:var(--space-2)}
.check{background:var(--surface);border-radius:var(--radius-md);padding:var(--space-2) var(--space-3);border-left:4px solid var(--secondary)}
.check.ok{border-left-color:var(--ok)} .check.warn,.check.manual{border-left-color:var(--warn)} .check.fail{border-left-color:var(--fail)}
.check-head{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap}
.num{flex:none;min-width:28px;height:28px;display:inline-grid;place-items:center;border-radius:var(--radius-full);background:var(--secondary);color:var(--text-strong);font:700 13px/1 var(--display)}
.icon{flex:none;font-size:18px;line-height:28px}
.kv{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2);margin:12px 0 0}
.kv div{min-width:0} .kv dt{font:500 12px/1.4 var(--sans);color:var(--accent);text-transform:uppercase;letter-spacing:.04em}
.kv dd{margin:2px 0 0;color:var(--text-body);word-break:break-word;font-size:14px}
.fix{margin:12px 0 0;font-size:14px} .fix strong{color:var(--text-strong)}
.objs{margin:8px 0 0;font:500 12px/1.4 var(--sans);opacity:.85}
footer{border-top:1px solid var(--secondary);padding-top:var(--space-3);font:500 14px/1.4 var(--sans)}
a:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media (max-width:820px){.grid{grid-template-columns:1fr}.tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.kv{grid-template-columns:1fr}}
@media print{body{background:#fff;color:#1A153A}h1,h2,h3,h4,.tile b,.cats a{color:#1A153A}.check,.tile,.cats li,.callout,figure{background:#f4f3f8}}
</style>
</head>
<body>
<main>
  <header>
    <div>
      <p class="eyebrow">Revisor de identidade visual · Gove Digital</p>
      <h1>${esc(report.file.name)}</h1>
      <div class="meta">
        <span>Modo: <b>${esc(report.mode.code)} — ${esc(report.mode.name)}</b></span>
        ${report.pieceType ? `<span>Tipo de peça: <b>${esc(report.pieceType)}</b></span>` : ''}
        ${report.artboard ? `<span>Artboard: <b>${Math.round(report.artboard.width)} × ${Math.round(report.artboard.height)} px</b></span>` : ''}
        <span>Gerado em <b>${esc(fmtDate(report.generatedAt))}</b></span>
      </div>
    </div>
    <span class="pill ${overall}" role="status">${report.status.icon} ${esc(report.status.label)}</span>
  </header>

  <div class="callout info"><h3>Como esta peça foi analisada</h3><p>${esc(report.mode.description)}</p></div>
  ${report.limitations.length ? `<div class="callout"><h3>Itens não verificáveis neste modo</h3>${report.limitations.map((l) => `<p>${esc(l)}</p>`).join('')}</div>` : ''}
  ${report.notices.length ? `<div class="callout info"><h3>Observações</h3>${report.notices.map((n) => `<p>${esc(n)}</p>`).join('')}</div>` : ''}

  <div class="tiles">
    <div class="tile ok"><b>${s.pass}</b><span>✅ Conformes</span></div>
    <div class="tile warn"><b>${s.warn}</b><span>⚠️ Atenção</span></div>
    <div class="tile warn"><b>${s.manual}</b><span>⚠️ Revisão manual</span></div>
    <div class="tile fail"><b>${s.fail}</b><span>❌ Não conformes</span></div>
  </div>

  <div class="grid">
    ${previewSrc ? `<figure><img src="${esc(previewSrc)}" alt="Preview da peça com os itens não conformes destacados e numerados"><figcaption>Os números no preview correspondem aos itens abaixo. Vermelho: não conforme · amarelo: atenção.</figcaption></figure>` : '<div></div>'}
    <div>
      <h2>Resumo por categoria</h2>
      <ul class="cats">
        ${byCat.map((c) => `<li><a href="#cat-${c.key}">${esc(c.label)}</a><span class="tag ${OVERALL_CLASS[c.status]}">${c.count} ${c.count === 1 ? 'item' : 'itens'}</span></li>`).join('')}
      </ul>
    </div>
  </div>

  ${byCat
    .map(
      (c) => `
  <section class="cat" id="cat-${c.key}">
    <h2>${esc(c.label)}</h2>
    <ol class="checks">${c.items.map(checkRow).join('')}
    </ol>
  </section>`,
    )
    .join('')}

  <footer>
    <p>Relatório ${esc(report.schema)} · arquivo ${esc(report.file.name)}${report.file.sha256 ? ` · sha256 ${esc(report.file.sha256.slice(0, 16))}…` : ''}</p>
  </footer>
</main>
</body>
</html>`;
}
