// Gerador de cases (cases/): formatação, CSV, checagem de números do texto do Claude,
// tamanhos A4 e 1920×1080, paleta institucional e arquivos gerados (PDF e .pptx).
// Valores de teste são ilustrativos ("Exemplo"), sem dados reais de municípios.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { unzipSync, strFromU8 } from 'fflate';
import sharp from 'sharp';

const ind = await import('../cases/src/data/indicators.ts');
const { newCase } = await import('../cases/src/data/case.ts');
const { PALETTE_HEX } = await import('../cases/src/data/palette.ts');
const { parseCsv, csvTemplate } = await import('../cases/src/lib/csv.ts');
const { extractNumbers, allowedNumbers, unknownNumbers } = await import('../cases/src/lib/numbers.ts');
const { buildPrompt, validateTexts } = await import('../cases/src/lib/prompt.ts');
const { A4, ONEPAGE_COLORS, buildOnePage, MIN_PT } = await import('../cases/src/lib/onepage.ts');
const { SLIDE, SLIDE_COLORS, buildSlides } = await import('../cases/src/lib/slides.ts');
const { makeMeasure, renderPdf } = await import('../cases/src/lib/pdf.ts');
const { renderPptx } = await import('../cases/src/lib/pptx.ts');
const { grafana, grafanaMessage, GRAFANA_PENDING } = await import('../cases/src/lib/grafana.ts');
const { brandPalette } = await import('../design-system/src/data/tokens.js');

const FONT_DIR = new URL('../cases/src/assets/fonts/', import.meta.url);
const fonts = {
  'display-bold': new Uint8Array(readFileSync(new URL('Montserrat-Bold.ttf', FONT_DIR))),
  'display-semibold': new Uint8Array(readFileSync(new URL('Montserrat-SemiBold.ttf', FONT_DIR))),
  'body-regular': new Uint8Array(readFileSync(new URL('inter-latin-400-normal.woff', FONT_DIR))),
  'body-semibold': new Uint8Array(readFileSync(new URL('inter-latin-600-normal.woff', FONT_DIR))),
};
const measure = makeMeasure(fonts);
const logoCache = new Map();
for (const f of ['gove-logo-cor.webp', 'gove-logo-branco-amarelo.webp', 'gove-logo-roxo.webp', 'gove-logo-branco.webp']) {
  const png = await sharp(new URL(`../brand/logos/${f}`, import.meta.url).pathname).resize({ width: 600 }).png().toBuffer();
  logoCache.set(f, `data:image/png;base64,${png.toString('base64')}`);
}
const logo = (f) => logoCache.get(f);

/** Case ilustrativo, rotulado como exemplo. */
function exemplo() {
  const c = newCase('teste');
  c.municipio = 'Exemplo';
  c.uf = 'SP';
  c.periodo = { inicio: '2026-01', fim: '2026-06' };
  const v = c.values;
  v.atendimentos = { enabled: true, value: 1234, before: 800, after: 1234, items: [] };
  v.ganho_financeiro = { enabled: true, value: 1234567, items: [] };
  v.arrecadacao_pos_disparo = { enabled: true, value: 350000, items: [] };
  v.taxa_abertura = { enabled: true, value: 12.5, items: [] };
  v.avaliacao_media = { enabled: true, value: 4.7, items: [] };
  v.avaliacao_positiva = { enabled: true, value: 92, items: [] };
  v.funcionalidades = { enabled: true, value: null, items: ['Funcionalidade A (exemplo)', 'Funcionalidade B (exemplo)'] };
  c.textos = {
    titulo: 'Exemplo: título do case',
    resumo: 'Exemplo de resumo com R$ 1,2 mi de ganho financeiro.',
    desafio: 'Exemplo de desafio.',
    solucao: 'Exemplo de solução.',
    resultado: 'Exemplo de resultado: 12,5% de taxa de abertura.',
    destaques: ['Exemplo de destaque', '', ''],
  };
  return c;
}

test('formatação pt-BR dos indicadores', () => {
  assert.equal(ind.formatBRL(1234567), 'R$ 1,2 mi');
  assert.equal(ind.formatBRL(2_500_000_000), 'R$ 2,5 bi');
  assert.equal(ind.formatBRL(12345), 'R$ 12.345');
  assert.equal(ind.formatBRL(950), 'R$ 950');
  assert.equal(ind.formatBRL(350000), 'R$ 350 mil');
  assert.equal(ind.formatPct(12.5), '12,5%');
  assert.equal(ind.formatPct(40), '40%');
  assert.equal(ind.formatNumber(1234), '1.234');
  assert.equal(ind.formatNumber(3_400_000), '3,4 mi');
  assert.equal(ind.formatNota(4.7), '4,7');
  assert.equal(ind.formatNota(4, 5), '4,0 de 5');
  assert.equal(ind.formatPeriodo('2026-01', '2026-06'), 'jan. a jun. de 2026');
  assert.equal(ind.formatPeriodo('2025-11', '2026-04'), 'nov. de 2025 a abr. de 2026');
  assert.equal(ind.parseNumberBR('1.234,5'), 1234.5);
  assert.equal(ind.parseNumberBR('R$ 1.234.567'), 1234567);
  assert.equal(ind.parseNumberBR('12,5%'), 12.5);
  assert.equal(ind.parseNumberBR('1234.5'), 1234.5);
  assert.equal(ind.parseNumberBR('1,234,567'), 1234567);
  assert.equal(ind.parseNumberBR('abc'), null);
  assert.equal(ind.parseNumberBR(''), null);
  // Todo indicador tem formatação, rótulo e espaço reservado para o painel do Grafana
  for (const d of ind.INDICATORS) {
    assert.ok(d.label && d.short && d.placeholder.startsWith('ex.:'), d.id);
    assert.equal(d.source, undefined, `${d.id}: mapa do Grafana só após a Etapa 0`);
  }
});

test('CSV: id ou nome, pt-BR, antes/depois, período, erros por linha e modelo', () => {
  const r = parseCsv(
    [
      'indicador;valor;antes;depois;periodo',
      'atendimentos;1.234;800;1.234;2026-01 a 2026-06',
      'Taxa de abertura;12,5%;;;',
      'Avaliação média;4,7;;;',
      'funcionalidades;Item 1 | Item 2;;;',
      'inexistente;10;;;',
      'ganho_financeiro;dez;;;',
    ].join('\n'),
  );
  assert.equal(r.values.atendimentos.value, 1234);
  assert.equal(r.values.atendimentos.before, 800);
  assert.equal(r.values.taxa_abertura.value, 12.5);
  assert.equal(r.values.avaliacao_media.value, 4.7);
  assert.deepEqual(r.values.funcionalidades.items, ['Item 1', 'Item 2']);
  assert.deepEqual(r.periodo, { inicio: '2026-01', fim: '2026-06' });
  assert.equal(r.imported, 4);
  assert.deepEqual(r.errors.map((e) => e.line), [6, 7]);
  // Vírgula como separador e en-US
  const r2 = parseCsv('indicator,value\ntaxa_abertura,45.5\n');
  assert.equal(r2.values.taxa_abertura.value, 45.5);
  // Modelo: todas as linhas e nenhum valor preenchido (nada de dado inventado)
  const tpl = parseCsv(csvTemplate());
  assert.equal(tpl.imported, 0);
  assert.equal(tpl.errors.length, 0);
  assert.equal(csvTemplate().trim().split('\n').length, ind.INDICATORS.length + 1);
  assert.equal(parseCsv('a;b\n1;2').errors.length, 1);
});

test('números do texto do Claude: só os que estão nos dados', () => {
  const c = exemplo();
  const allowed = allowedNumbers(c);
  assert.deepEqual(
    extractNumbers('R$ 1,2 mi, 12,5%, 1.234 e 350 mil').map((t) => t.value),
    [1_200_000, 12.5, 1234, 350_000],
  );
  assert.deepEqual(unknownNumbers('Ganho de R$ 1,2 mi e 12,5% de abertura em 2026.', allowed), []);
  assert.deepEqual(unknownNumbers('A arrecadação subiu R$ 350 mil; 1.234 atendimentos (antes 800).', allowed), []);
  // Variação derivada de antes/depois (vai no prompt) e a nota
  assert.deepEqual(unknownNumbers('Alta de 54,3% nos atendimentos, nota 4,7 de 5.', allowed), []);
  assert.deepEqual(unknownNumbers('Alta de 30% e 2.000 atendimentos.', allowed), ['30%', '2.000']);
  assert.deepEqual(unknownNumbers('R$ 1,3 mi', allowed), ['1,3 mi']);
  // Validação da resposta: campo com número inventado não é aplicado
  const v = validateTexts(
    { titulo: 'Exemplo com 99% de aprovação', resumo: 'R$ 1,2 mi de ganho.', desafio: 'D', solucao: 'S', resultado: 'R', destaques: ['12,5% de abertura', '3 vezes mais'] },
    c,
  );
  assert.equal(v.accepted.titulo, undefined);
  assert.equal(v.accepted.resumo, 'R$ 1,2 mi de ganho.');
  assert.deepEqual(v.flagged.map((f) => f.field), ['titulo', 'destaque1']);
  assert.deepEqual(v.accepted.destaques, ['12,5% de abertura', '', '']);
  assert.ok(validateTexts('texto', c).errors.length);
  // O prompt leva os dados, o formato JSON e as regras de voz
  const p = buildPrompt(c);
  for (const s of ['Exemplo – SP', 'R$ 1,2 mi', '12,5%', '"destaques"', 'sentence case', 'Sem emoji']) assert.ok(p.includes(s), s);
});

test('Grafana: pendente de configuração, sem dados inventados', async () => {
  assert.equal(await grafana.status(), 'pending-setup');
  await assert.rejects(grafana.listMunicipios(), (e) => e.code === 'pending-setup' && e.message.includes(GRAFANA_PENDING));
  await assert.rejects(grafana.fetchIndicators({ id: 'x', nome: 'x' }, { inicio: '', fim: '' }), (e) => e.code === 'pending-setup');
  assert.match(grafanaMessage({ code: 'needs_reauth' }), /Reconecte/);
  assert.match(grafanaMessage({ code: 'rate_limited' }), /Muitas/);
  assert.match(grafanaMessage({ code: 'server_not_connected' }), /não conectado/);
});

test('tamanhos: A4 210×297 mm e slides 1920×1080 (13,333×7,5 pol)', () => {
  assert.deepEqual([A4.w, A4.h], [210, 297]);
  assert.deepEqual([SLIDE.w, SLIDE.h], [1920, 1080]);
  assert.ok(Math.abs(SLIDE.wIn * SLIDE.pxPerIn - 1920) < 0.1 && Math.abs(SLIDE.hIn * SLIDE.pxPerIn - 1080) < 0.1);
  const s = buildOnePage(exemplo(), measure);
  assert.deepEqual([s.unit, s.w, s.h], ['mm', 210, 297]);
  for (const sl of buildSlides(exemplo(), measure)) assert.deepEqual([sl.scene.unit, sl.scene.w, sl.scene.h], ['px', 1920, 1080]);
});

test('paleta: só cores institucionais nas peças, nunca preto puro', () => {
  const allowed = new Set([...brandPalette, '#FFFFFF']);
  for (const hex of PALETTE_HEX) assert.ok(allowed.has(hex), hex);
  for (const hex of [...Object.values(ONEPAGE_COLORS), ...Object.values(SLIDE_COLORS)]) assert.ok(allowed.has(hex), hex);
  const c = exemplo();
  const scenes = [buildOnePage(c, measure), ...buildSlides(c, measure).map((s) => s.scene)];
  for (const sc of scenes) {
    assert.ok(allowed.has(sc.background));
    for (const it of sc.items) {
      const cols = it.type === 'rect' ? [it.fill] : it.type === 'text' ? [it.color] : it.type === 'chart' ? [it.ink, ...it.series.map((s) => s.color)] : [];
      for (const col of cols) assert.ok(allowed.has(col) && col !== '#000000', col);
    }
  }
});

test('one page: cabe na página, legível (≥ 11 pt) e avisa quando o texto não cabe', () => {
  const ok = buildOnePage(exemplo(), measure);
  assert.equal(ok.overflow, false, ok.warnings.join(' | '));
  const texts = ok.items.filter((i) => i.type === 'text');
  assert.ok(texts.every((t) => t.size >= MIN_PT), 'piso de 11 pt');
  for (const it of ok.items) assert.ok(it.x >= -0.01 && it.y >= -0.01 && it.x + (it.w ?? 0) <= 210.01 && it.y <= 297, `${it.type} fora da página`);
  assert.equal(texts.filter((t) => t.role === 'kpi-valor').length, 4);
  // Texto enorme: encolhe até o piso, encurta e avisa
  const big = exemplo();
  const long = 'Exemplo de parágrafo muito longo para testar o encaixe. '.repeat(30);
  big.textos.desafio = long;
  big.textos.solucao = long;
  big.textos.resultado = long;
  big.textos.resumo = long;
  const s = buildOnePage(big, measure);
  assert.equal(s.overflow, true);
  assert.ok(s.warnings.some((w) => /Desafio/.test(w)));
  assert.ok(s.items.filter((i) => i.type === 'text').every((t) => t.size >= MIN_PT));
  const lastText = Math.max(...s.items.filter((i) => i.type === 'text' && !['cta', 'contato'].includes(i.role)).map((t) => t.y + t.lines.length * t.lineHeight));
  assert.ok(lastText <= 297 - 26, 'o texto encurtado não invade a faixa final');
});

test('PDF: exatamente 1 página A4 com as fontes embutidas', async () => {
  const c = exemplo();
  const bytes = await renderPdf(buildOnePage(c, measure), fonts, logo, { title: 'Case Exemplo' });
  const raw = Buffer.from(bytes).toString('latin1');
  assert.ok(raw.startsWith('%PDF-'));
  assert.equal((raw.match(/\/Type \/Page\b/g) ?? []).length, 1);
  const box = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(raw);
  assert.ok(Math.abs(Number(box[1]) - 595.28) < 0.5 && Math.abs(Number(box[2]) - 841.89) < 0.5, box[0]);
  assert.ok(/Montserrat/.test(raw) && /Inter/.test(raw), 'Montserrat e Inter embutidas');
});

test('PPTX: zip válido, 16:9, um slide por bloco com dados e gráfico nativo', async () => {
  const c = exemplo();
  const slides = buildSlides(c, measure);
  const visible = slides.filter((s) => !s.hidden);
  assert.equal(visible.length, 8);
  const bytes = await renderPptx(slides, logo, { title: 'Case Exemplo' });
  const zip = unzipSync(bytes);
  const pres = strFromU8(zip['ppt/presentation.xml']);
  const sz = /<p:sldSz cx="(\d+)" cy="(\d+)"/.exec(pres);
  assert.deepEqual([Number(sz[1]), Number(sz[2])], [12192000, 6858000]);
  assert.ok(Math.abs(Number(sz[1]) / Number(sz[2]) - 16 / 9) < 1e-3);
  const slideFiles = Object.keys(zip).filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k));
  assert.equal(slideFiles.length, 8);
  assert.ok(Object.keys(zip).some((k) => /^ppt\/charts\/chart\d+\.xml$/.test(k)), 'gráfico nativo');
  const all = slideFiles.map((k) => strFromU8(zip[k])).join('');
  assert.ok(all.includes('Montserrat') && all.includes('Inter'));
  assert.ok(all.includes('Exemplo – SP'));
  // Sem dados de contexto, desafio e avaliação: esses slides somem
  const thin = exemplo();
  thin.textos.desafio = '';
  thin.textos.resumo = '';
  thin.textos.destaques = ['', '', ''];
  thin.values.avaliacao_media.enabled = false;
  thin.values.avaliacao_positiva.enabled = false;
  const ts = buildSlides(thin, measure);
  assert.deepEqual(ts.filter((s) => s.hidden).map((s) => s.kind), ['contexto', 'desafio', 'avaliacao']);
  const z2 = unzipSync(await renderPptx(ts, logo, { title: 'x' }));
  assert.equal(Object.keys(z2).filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k)).length, 5);
});
