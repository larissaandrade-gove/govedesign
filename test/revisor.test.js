import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';
import { listAudits, loadBrandTokens, openDatabase, upsertToken } from '../db/database.js';
import { auditVector, gradientAngle } from '../backend/audit/modeA.js';
import { auditRaster } from '../backend/audit/modeB.js';
import { contrastRatio, deltaE2000, nearestPaletteColor, parseColor } from '../backend/lib/color.js';
import { checkFontVariant, referenceVariants } from '../backend/lib/fonts.js';
import { identifyByPaths } from '../backend/lib/icons.js';
import { generateQr, qrFabricObjects } from '../backend/lib/qrcode.js';
import { overallStatus } from '../backend/report/build.js';
import { auditEntries, zipToBuffer } from '../backend/report/package.js';
import { AuditInputError, runAudit } from '../backend/services/auditService.js';
import { classifyFamily, cleanFamily, verifyDocModel } from '../backend/audit/docModel.js';

const fixture = (f) => readFileSync(new URL(`./fixtures/${f}`, import.meta.url));
const freshTokens = () => loadBrandTokens(openDatabase(':memory:'));
const byTitle = (checks, re) => checks.filter((c) => re.test(c.title));

// ---------- Cor ----------
test('CIEDE2000 bate com os dados de referência de Sharma et al.', () => {
  const pairs = [
    [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
    [[50, 2.5, 0], [73, 25, -18], 27.1492],
    [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082],
  ];
  for (const [[L1, a1, b1], [L2, a2, b2], expected] of pairs) {
    assert.ok(Math.abs(deltaE2000({ L: L1, a: a1, b: b1 }, { L: L2, a: a2, b: b2 }) - expected) < 1e-4);
  }
});

test('contraste WCAG e paleta', () => {
  assert.equal(Math.round(contrastRatio('#FFFFFF', '#000000')), 21);
  assert.equal(Math.round(contrastRatio('#FFC72C', '#1A153A')), 11);
  assert.equal(parseColor('não-é-cor'), null);
  const tokens = freshTokens();
  assert.equal(nearestPaletteColor('#FEC82C', tokens.colors).level, 'pass');
  assert.equal(nearestPaletteColor('#FF0000', tokens.colors).level, 'fail');
});

// ---------- Banco ----------
test('banco de tokens: seed, edição e histórico', async () => {
  const db = openDatabase(':memory:');
  const t = loadBrandTokens(db);
  assert.equal(t.fonts.length, 4);
  assert.ok(t.colors.filter((c) => !c.role.startsWith('brand-')).every((c) => c.placeholder));
  // Cores e arquivos oficiais da logomarca (brand/logos.js) não são provisórios
  assert.ok(t.colors.filter((c) => c.role.startsWith('brand-')).every((c) => !c.placeholder));
  assert.equal(t.logos.length, 7);
  assert.ok(t.logos.every((l) => !l.placeholder));
  assert.ok(['hig', 'typography', 'text_palette'].every((k) => t.settings[k]));
  upsertToken(db, { category: 'color', name: 'amarelo-ouro', value: { hex: '#FFC72C', role: 'accent' } });
  assert.equal(loadBrandTokens(db).colors.find((c) => c.name === 'amarelo-ouro').placeholder, false);

  const { id, report } = await runAudit({ db, file: { name: 'post.json', buffer: fixture('post-aprovado.fabric.json') } });
  const hist = listAudits(db);
  assert.equal(hist[0].id, id);
  assert.equal(hist[0].mode, 'A');
  assert.equal(hist[0].status, report.status.code);
});

// ---------- Fontes e ícones ----------
test('variações da Montserrat', () => {
  assert.ok(referenceVariants().has('900-normal'));
  const approved = freshTokens().fonts;
  assert.equal(checkFontVariant({ fontFamily: '"Montserrat", sans-serif', fontWeight: 'bold' }, approved).ok, true);
  assert.equal(checkFontVariant({ fontFamily: 'Montserrat', fontWeight: 600 }, approved).ok, false);
  assert.equal(checkFontVariant({ fontFamily: 'Montserrat', fontStyle: 'italic' }, approved).ok, true);
});

test('identifica ícones Lucide e Phosphor pelos paths', () => {
  assert.deepEqual(identifyByPaths(['M5 12h14', 'm12 5 7 7-7 7'])[0], { set: 'lucide', name: 'arrow-right', weight: null });
  const ph = 'M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z';
  assert.deepEqual(identifyByPaths([ph])[0], { set: 'phosphor', name: 'arrow-right', weight: 'regular' });
  assert.deepEqual(identifyByPaths(['M0 0 L40 0 L40 40 Z']), []);
});

test('ângulo de gradiente', () => {
  const obj = { width: 100, height: 100, scaleX: 1, scaleY: 1, angle: 0 };
  assert.equal(gradientAngle({ coords: { x1: 0, y1: 0, x2: 100, y2: 0 } }, obj), 0);
  assert.equal(gradientAngle({ coords: { x1: 0, y1: 0, x2: 0, y2: 100 } }, obj), 90);
  assert.equal(Math.round(gradientAngle({ coords: { x1: 0, y1: 0, x2: 100, y2: 100 } }, obj)), 45);
});

// ---------- Modo A ----------
test('Modo A: peça conforme é aprovada (com logomarca por nome)', async () => {
  const tokens = freshTokens();
  const r = await auditVector({ json: fixture('post-aprovado.fabric.json').toString(), pieceType: 'post', tokens });
  const fails = r.checks.filter((c) => c.status === 'fail');
  assert.deepEqual(fails.map((c) => c.title), []);
  assert.ok(byTitle(r.checks, /Ícone aprovado — lucide:arrow-right/).length);
  assert.ok(byTitle(r.checks, /QR code sobre fundo branco sólido/).length);
  assert.ok(r.preview?.length > 1000);
});

test('Modo A: detecta cada tipo de desvio', async () => {
  const tokens = freshTokens();
  const r = await auditVector({ json: fixture('post-reprovado.fabric.json').toString(), pieceType: 'post', tokens });
  const failed = (re) => byTitle(r.checks, re).some((c) => c.status === 'fail');
  assert.ok(failed(/Variação tipográfica não aprovada — Arial/), 'família não aprovada');
  assert.ok(failed(/Montserrat SemiBold/), 'peso não aprovado');
  assert.ok(failed(/Montserrat Bold Italic/), 'override em styles');
  assert.ok(failed(/Cor fora da paleta — #FF0000/), 'cor fora da paleta');
  assert.equal(r.checks.filter((c) => c.category === 'gradiente').length, 0, 'gradientes ficam fora da análise');
  assert.ok(failed(/Contraste insuficiente — Subtítulo/), 'contraste');
  assert.ok(failed(/Margem insuficiente — Título/), 'margem');
  assert.ok(failed(/Sobreposição/), 'sobreposição');
  assert.ok(failed(/Logomarca com filtros/), 'logo recolorido');
  assert.ok(failed(/Contraste da logomarca insuficiente/), 'logo roxa sobre fundo escuro');
  assert.match(byTitle(r.checks, /Contraste da logomarca insuficiente/)[0].suggestion, /gove-logo-branco-amarelo\.webp/);
  assert.ok(failed(/Logomarca deformada/), 'logo distorcido');
  assert.ok(failed(/QR code fora de fundo branco/), 'QR sobre gradiente');
  assert.ok(byTitle(r.checks, /Possível ícone não identificado/).length, 'ícone fora dos sets');
});

test('Modo A: ícone de set aprovado mas fora da lista é reprovado', async () => {
  const tokens = freshTokens();
  const json = {
    width: 1080, height: 1080, background: '#1A153A',
    objects: [{ type: 'Path', originX: 'left', originY: 'top', left: 500, top: 500, name: 'lucide:bell', path: 'M10 10h4', stroke: '#FFC72C', strokeWidth: 2 }],
  };
  const r = await auditVector({ json, pieceType: 'post', tokens, renderPreview: false });
  assert.equal(byTitle(r.checks, /Ícone não aprovado — lucide:bell/)[0].status, 'fail');
});

test('QR code gerado segue a identidade e passa na auditoria', async () => {
  const tokens = freshTokens();
  const qr = await generateQr(tokens, 'https://www.gove.digital/', { light: '#FFC72C', width: 90 });
  assert.equal(qr.options.color.light, '#FFFFFF');
  assert.equal(qr.options.width, 150);
  assert.equal(qr.adjustments.length, 2);

  const objects = await qrFabricObjects(tokens, 'https://www.gove.digital/', { left: 700, top: 700, size: 240 });
  const json = { width: 1080, height: 1080, background: '#1A153A', objects };
  const r = await auditVector({ json, pieceType: 'post', tokens, renderPreview: false });
  const qrChecks = r.checks.filter((c) => c.category === 'qrcode');
  assert.ok(qrChecks.length >= 3);
  assert.ok(qrChecks.every((c) => c.status === 'pass'), JSON.stringify(qrChecks.map((c) => c.title)));
});

// ---------- Modo B ----------
test('Modo B: tipografia fica para revisão manual; logomarca pela região informada', async () => {
  const tokens = freshTokens();
  const regions = JSON.parse(fixture('post-raster.regions.json'));
  const r = await auditRaster({ buffer: fixture('post-raster.png'), regions, tokens });
  const typo = r.checks.find((c) => c.category === 'tipografia');
  const logo = r.checks.find((c) => c.category === 'logomarca');
  assert.equal(typo.status, 'manual');
  assert.match(typo.found, /não verificável com confiança neste modo — revisão manual recomendada/i);
  assert.equal(logo.status, 'pass'); // cor da logomarca lida pela região informada
  assert.ok(byTitle(r.checks, /Contraste adequado — Título/).length);
  assert.equal(byTitle(r.checks, /Cores da logomarca oficiais — Logo/)[0].status, 'pass');
  assert.equal(byTitle(r.checks, /Contraste da logomarca adequado — Logo/)[0].status, 'pass');
  assert.equal(byTitle(r.checks, /Cores de texto na paleta/)[0].status, 'pass');
  // Fora do foco: gradientes, paleta dominante (fotos), QR, margens e ícones
  assert.deepEqual(r.checks.filter((c) => ['gradiente', 'qrcode', 'margens', 'icones'].includes(c.category)), []);
  assert.equal(r.palette, undefined);
});

test('Modo B sem metadados: contraste e QR são pulados e sinalizados', async () => {
  const tokens = freshTokens();
  const r = await auditRaster({ buffer: fixture('post-raster.png'), tokens, pieceType: 'post' });
  const contrast = r.checks.find((c) => c.category === 'contraste');
  assert.equal(contrast.status, 'manual');
  assert.match(contrast.found, /não foram fornecidas/);
  assert.equal(overallStatus(r.checks).code, 'aprovado_com_ressalvas');
});

test('Modo B: logomarca recolorida e logomarca sem contraste com o fundo', async () => {
  const tokens = freshTokens();
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#20133D"/><rect x="100" y="100" width="200" height="120" fill="#E61E1E"/><rect x="500" y="100" width="200" height="120" fill="#3E0099"/></svg>`);
  const buffer = await sharp(svg).png().toBuffer();
  const regions = { logoRegions: [{ label: 'Logo vermelha', x: 100, y: 100, width: 200, height: 120 }, { label: 'Logo roxa', x: 500, y: 100, width: 200, height: 120 }] };
  const r = await auditRaster({ buffer, tokens, regions });
  assert.equal(byTitle(r.checks, /Cor da logomarca fora do padrão — Logo vermelha/)[0].status, 'fail');
  const c = byTitle(r.checks, /Contraste da logomarca insuficiente — Logo roxa/)[0];
  assert.equal(c.status, 'fail');
  assert.match(c.expected, /branco/);
});

// ---------- Relatório e ZIP ----------
test('relatório completo + ZIP', async () => {
  const db = openDatabase(':memory:');
  const storageDir = mkdtempSync(join(tmpdir(), 'revisor-'));
  const { report, html, preview } = await runAudit({
    db,
    file: { name: 'post-reprovado.json', buffer: fixture('post-reprovado.fabric.json') },
    pieceType: 'post',
    storageDir,
  });
  assert.equal(report.status.code, 'reprovado');
  assert.equal(report.mode.code, 'A');
  assert.ok(report.checks.every((c) => c.number && c.icon && c.statusLabel));
  assert.match(html, /Reprovado/);
  assert.match(html, /preview-anotado\.png/);
  const zip = await zipToBuffer(auditEntries({ report, html, preview }));
  assert.equal(zip.subarray(0, 2).toString(), 'PK');
  assert.ok(zip.includes(Buffer.from('relatorio.json')) && zip.includes(Buffer.from('preview-anotado.png')));

  const raster = await runAudit({ db, file: { name: 'peca.png', buffer: fixture('post-raster.png'), mimetype: 'image/png' } });
  assert.equal(raster.report.mode.code, 'B');
  assert.match(raster.report.limitations[0], /OCR/);
});

// ---------- Modos Documento (PPTX, PDF, DOCX) e HTML ----------
const DOCS = (f) => fixture(`docs/${f}`);
const docAudit = async (name) => {
  const db = openDatabase(':memory:');
  return (await runAudit({ db, file: { name, buffer: DOCS(name) } })).report;
};

test('famílias tipográficas: nomes reais de fonte', () => {
  const typography = loadBrandTokens(openDatabase(':memory:')).settings.typography;
  assert.equal(cleanFamily('ABCDEF+Montserrat-Bold'), 'Montserrat');
  assert.equal(cleanFamily('"Inter", system-ui'), 'Inter');
  assert.equal(cleanFamily('Montserrat SemiBold'), 'Montserrat');
  assert.equal(classifyFamily('InterVariable', typography).level, 'approved');
  assert.equal(classifyFamily('ArialMT', typography).level, 'fallback');
  assert.equal(classifyFamily('Helvetica-Bold', typography).level, 'fallback');
  assert.equal(classifyFamily('Times-Roman', typography).level, 'other');
});

for (const name of ['apresentacao-aprovada.pptx', 'documento-aprovado.docx', 'folheto-aprovado.pdf']) {
  test(`Documento aprovado — ${name}`, async () => {
    const report = await docAudit(name);
    assert.equal(report.mode.code, 'C');
    assert.equal(report.status.code, 'aprovado', JSON.stringify(report.checks.filter((c) => c.status !== 'pass').map((c) => c.title)));
    assert.ok(report.checks.some((c) => c.category === 'logomarca' && /Contraste da logomarca adequado/.test(c.title)));
    assert.ok(report.checks.some((c) => c.category === 'tamanhos' && c.status === 'pass'));
    assert.equal(report.document.format, name.split('.').pop().toUpperCase());
  });
}

for (const [name, extra] of [
  ['apresentacao-reprovada.pptx', [/Cor da logomarca fora do padrão — Slide 1/, /Contraste da logomarca insuficiente — Slide 2/, /Fonte fora do design system — Comic Sans/, /Texto abaixo do mínimo — 9 pt/]],
  ['documento-reprovado.docx', [/Contraste da logomarca insuficiente — Cabeçalho/, /Fonte fora do design system — Times New Roman/, /Texto abaixo do mínimo — 8 pt/]],
  ['folheto-reprovado.pdf', [/Contraste da logomarca insuficiente — Página 1/, /Fonte fora do design system — Times/, /Texto abaixo do mínimo — 8 pt/]],
]) {
  test(`Documento reprovado — ${name}`, async () => {
    const report = await docAudit(name);
    assert.equal(report.status.code, 'reprovado');
    const failed = (re) => report.checks.some((c) => c.status === 'fail' && re.test(c.title));
    for (const re of [/Texto em preto puro/, /Cor de texto fora da paleta — #FF0000/, ...extra]) assert.ok(failed(re), re.source);
    assert.ok(report.checks.some((c) => c.status === 'warn' && /Fonte de fallback — (Arial|Helvetica)/.test(c.title)));
    assert.equal(report.checks.filter((c) => c.category === 'gradiente').length, 0);
    // Agrupado por fonte: um item por família, não por trecho
    const fams = report.checks.filter((c) => c.category === 'tipografia').map((c) => c.title);
    assert.equal(new Set(fams).size, fams.length);
  });
}

test('HTML no Node: recusado com mensagem clara (analisado no Design System)', async () => {
  const db = openDatabase(':memory:');
  await assert.rejects(
    runAudit({ db, file: { name: 'email.html', buffer: DOCS('email-aprovado.html') } }),
    (e) => e instanceof AuditInputError && e.status === 422 && /Design System/.test(e.message),
  );
});

test('verificador HTML: corpo < 17 px, texto < 11 px e alvo < 44 px', () => {
  const tokens = freshTokens();
  const checks = verifyDocModel(
    {
      format: 'HTML',
      texts: [
        { text: 'Título', font: 'Montserrat', sizePx: 32, color: '#3D0099', where: 'h1' },
        { text: 'Corpo', font: 'Inter', sizePx: 14, color: '#2F3539', where: 'p' },
        { text: 'Miúdo', font: 'Inter', sizePx: 9, color: '#2F3539', where: 'small' },
      ],
      logos: [{ colors: ['#3E0099'], where: 'svg.logo', background: '#FFFFFF' }],
      targets: [
        { w: 160, h: 48, label: 'Conheça', where: 'a.cta' },
        { w: 70, h: 18, label: 'Saiba mais', where: 'a' },
      ],
    },
    tokens,
  );
  assert.equal(byTitle(checks, /Texto de corpo abaixo de 17 px — 14 px/)[0].status, 'warn');
  assert.equal(byTitle(checks, /Texto abaixo do mínimo — 9 px/)[0].status, 'fail');
  assert.equal(byTitle(checks, /Alvo de toque pequeno — “Saiba mais”/)[0].status, 'fail');
  assert.equal(byTitle(checks, /Alvo de toque pequeno — “Conheça”/).length, 0);
  assert.equal(byTitle(checks, /Contraste da logomarca adequado/)[0].status, 'pass');
});
