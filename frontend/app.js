// Frontend do revisor: envia a peça, mostra o resultado, histórico e gerador de QR.
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const OVERALL = { aprovado: 'ok', aprovado_com_ressalvas: 'warn', reprovado: 'fail' };

const form = $('#audit-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button');
  const status = $('#form-status');
  const data = new FormData(form);
  if (!data.get('regions')?.size) data.delete('regions');
  btn.disabled = true;
  status.textContent = 'Revisando a peça…';
  try {
    const res = await fetch('/api/audits', { method: 'POST', body: data });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || 'Não foi possível revisar a peça.');
    status.textContent = '';
    renderResult(body);
    loadHistory();
  } catch (err) {
    status.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

function renderResult({ report, links }) {
  $('#result').hidden = false;
  $('#r-mode').textContent = `Modo ${report.mode.code} · ${report.mode.name}${report.pieceType ? ` · ${report.pieceType}` : ''}`;
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
  $('#r-zip').href = links.zip;
  $('#r-html').href = links.html;
  const img = $('#r-preview');
  img.src = `${links.preview}?t=${Date.now()}`;
  img.hidden = false;
  img.onerror = () => { img.hidden = true; };
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
  $('#result').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

async function loadHistory() {
  const res = await fetch('/api/audits?limit=20');
  const rows = await res.json();
  const label = { aprovado: '✅ Aprovado', aprovado_com_ressalvas: '⚠️ Com ressalvas', reprovado: '❌ Reprovado' };
  $('#history').innerHTML = rows.length
    ? rows
        .map(
          (r) => `<tr>
          <td>${r.id}</td>
          <td>${new Date(r.created_at).toLocaleString('pt-BR')}</td>
          <td class="file">${esc(r.file_name)}</td>
          <td>${r.mode}</td>
          <td>${label[r.status]}</td>
          <td>${r.failed_items.length}</td>
          <td><a href="/api/audits/${r.id}/relatorio.html" target="_blank" rel="noopener">Relatório</a> · <a href="/api/audits/${r.id}/zip">ZIP</a></td>
        </tr>`,
        )
        .join('')
    : '<tr><td colspan="7">Nenhuma auditoria ainda.</td></tr>';
}

$('#qr-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const res = await fetch('/api/qrcode', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: fd.get('text'), width: Number(fd.get('width')) }),
  });
  const out = $('#qr-out');
  if (!res.ok) {
    out.textContent = (await res.json()).error;
    return;
  }
  const url = URL.createObjectURL(await res.blob());
  const adj = decodeURIComponent(res.headers.get('X-Gove-QR-Adjustments') || '');
  out.innerHTML = `<img src="${url}" alt="QR code gerado"><div><a class="btn-primary" href="${url}" download="qrcode-gove.png">Baixar PNG</a>${adj ? `<p>${esc(adj)}</p>` : ''}</div>`;
});

loadHistory();
