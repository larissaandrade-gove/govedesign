import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import sharp from 'sharp';

process.env.PRINT_STUDIO_DATA = mkdtempSync(join(tmpdir(), 'print-studio-'));
const { openPrintDb, saveMunicipio, setMunicipioLogo, setLogoFixo, getLogosFixos } = await import('../print-studio/server/db.js');
const { storeLogo } = await import('../print-studio/server/images.js');
const { measure, renderPiece } = await import('../print-studio/server/pdf.js');
const { LAYOUTS, buildLayout, pdfFileName, whatsappLink, formatPhone, isEmail, logoContrastCheck } = await import('../print-studio/shared/layout.js');
const { BACKGROUND, COLORS, GRADIENT, contrastRatio, mmToPt } = await import('../print-studio/shared/tokens.js');

const svg = (w, h) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect x="5" y="5" width="${w - 10}" height="${h - 10}" fill="#0F7A3B"/></svg>`);
const municipio = { nome_municipio: 'São Carlos', uf: 'SP', ddd: '16', numero_whatsapp: '999998888' };
const assets = { gove: { width: 800, height: 300 }, prefeitura: { width: 900, height: 300 }, bb: { width: 600, height: 400 } };
const input = (extra = {}) => ({ municipio, includeBB: true, services: ['iptu', 'saude'], texts: {}, overrides: {}, mockup: null, assets, ...extra });

test('utilitários: link do WhatsApp, telefone e nome do arquivo', () => {
  assert.equal(whatsappLink('16', '99999-8888'), 'https://wa.me/5516999998888');
  assert.equal(formatPhone('16', '999998888'), '(16) 99999-8888');
  assert.equal(formatPhone('16', '32224444'), '(16) 3222-4444');
  assert.equal(pdfFileName('flyer-a4', municipio, new Date(2026, 8, 21)), 'flyer-a4_sao-carlos-sp_21092026.pdf');
  assert.equal(Math.round(mmToPt(210) * 1000) / 1000, 595.276);
});

test('gradiente escurecido: texto branco passa 4,5:1 nas duas pontas', () => {
  for (const key of [GRADIENT.from, GRADIENT.to]) {
    assert.ok(contrastRatio(COLORS.branco.hex, COLORS[key].hex) >= 4.5, key);
  }
});

test('os 4 layouts saem sem erros com dados completos e dentro da área de segurança', () => {
  for (const l of LAYOUTS) {
    const r = buildLayout(l.id, input(), measure);
    assert.equal(r.page.w, l.trim.w + 10);
    assert.equal(r.page.h, l.trim.h + 10);
    const errors = r.checks.filter((c) => c.level === 'error');
    assert.deepEqual(errors, [], `${l.id}: ${errors.map((e) => e.message).join('; ')}`);
    const qr = r.blocks.flatMap((b) => b.elements).find((e) => e.type === 'qr');
    assert.ok(qr.w >= 20, `${l.id}: QR ${qr.w} mm`);
  }
});

test('alerta: elemento fora da área de segurança, logo ausente e número inválido', () => {
  const r = buildLayout('display-a6', input({ overrides: { h1: { dx: -40, dy: 0 } }, assets: { ...assets, gove: null }, municipio: { ...municipio, numero_whatsapp: '123' } }), measure);
  const codes = r.checks.map((c) => c.code);
  assert.ok(codes.includes('seguranca'));
  assert.ok(codes.includes('logo-gove'));
  assert.ok(codes.includes('numero'));
});

test('PDF: tamanho com sangria, fontes embutidas, só CMYK', async () => {
  const db = openPrintDb(':memory:');
  let m = saveMunicipio(db, { ...municipio, incluir_logo_banco_do_brasil: true });
  m = setMunicipioLogo(db, m.id, await storeLogo(svg(900, 300), 'p.svg'));
  setLogoFixo(db, 'gove', await storeLogo(svg(800, 300), 'g.svg'));
  setLogoFixo(db, 'bb', await storeLogo(svg(600, 400), 'b.svg'));
  const f = getLogosFixos(db);
  const ctx = {
    input: input({ municipio: m, assets: { gove: { width: f.gove.largura, height: f.gove.altura }, bb: { width: f.bb.largura, height: f.bb.altura }, prefeitura: { width: m.logo_largura, height: m.logo_altura } } }),
    files: { logos: { gove: f.gove.hires, bb: f.bb.hires, prefeitura: m.logo_hires }, mockupFile: null },
  };
  const { buffer, report } = await renderPiece('flyer-a4', ctx);
  assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
  assert.deepEqual(report.filter((c) => c.level !== 'ok'), []);
  assert.ok(!buffer.toString('latin1').includes('/DeviceRGB'));
  assert.ok((await sharp(await (await import('../print-studio/server/images.js')).logoCmyk(f.gove.hires, 50)).metadata()).space === 'cmyk');
});

test('degradê das referências: branco ≥ 4,5:1 em todas as paradas; tokens novos com CMYK', () => {
  for (const [, key] of BACKGROUND.stops) assert.ok(contrastRatio(COLORS.branco.hex, COLORS[key].hex) >= 4.5, key);
  for (const key of ['whatsapp', 'folhaFaixa', 'roxoGove', 'amareloGove', 'azulLink']) assert.equal(COLORS[key].cmyk.length, 4, key);
  assert.equal(COLORS.whatsapp.hex, '#25D366');
});

test('e-mail do município: validação simples', () => {
  assert.ok(isEmail('contato@rolandia.pr.gov.br'));
  assert.ok(!isEmail('contato@rolandia'));
  assert.ok(!isEmail('sem arroba.com'));
});

test('logomarca oficial: versão pelo contraste (painel branco → roxa; cabeçalho verde do mockup → roxa) e checagem ≥ 4,5:1', () => {
  const r = buildLayout('flyer-a4', input({ assets: { ...assets, gove: { official: true } }, municipio: { ...municipio, endereco: 'Rua A, 1', email: 'a@b.gov.br' } }), measure);
  const logos = [];
  const walk = (els) => els.forEach((e) => (e.type === 'logo' && e.which === 'gove' ? logos.push(e) : e.type === 'group' && walk(e.children)));
  r.blocks.forEach((b) => walk(b.elements));
  assert.equal(logos.length, 2);
  assert.ok(logos.every((e) => e.official && e.variant === 'roxo' && e.logoContrast >= 4.5));
  assert.equal(logoContrastCheck(r).level, 'ok');
  assert.deepEqual(r.checks.filter((c) => c.level === 'error'), []);
});

test('tela gerada do mockup: rodapé omite linhas vazias; captura própria sem imagem avisa', () => {
  const texts = (r) => {
    const out = [];
    const walk = (els) => els.forEach((e) => (e.type === 'text' ? out.push(...e.lines.map((l) => l.text)) : e.type === 'group' && walk(e.children)));
    r.blocks.forEach((b) => walk(b.elements));
    return out.join(' | ');
  };
  const com = buildLayout('flyer-a4', input({ municipio: { ...municipio, endereco: 'Avenida Central, 10', email: 'contato@x.gov.br' } }), measure);
  assert.match(texts(com), /contato@x\.gov\.br/);
  assert.match(texts(com), /Avenida Central/);
  const sem = buildLayout('flyer-a4', input(), measure);
  assert.doesNotMatch(texts(sem), /@/);
  const up = buildLayout('flyer-a4', input({ mockup: { mode: 'upload' } }), measure);
  assert.ok(up.checks.some((c) => c.code === 'mockup'));
});

test('banco: migração segura acrescenta endereço e e-mail a uma base antiga', async () => {
  const Database = (await import('better-sqlite3')).default;
  const file = join(process.env.PRINT_STUDIO_DATA, 'antiga.sqlite');
  const old = new Database(file);
  old.exec("CREATE TABLE municipios (id INTEGER PRIMARY KEY AUTOINCREMENT, nome_municipio TEXT NOT NULL, uf TEXT, ddd TEXT NOT NULL, numero_whatsapp TEXT NOT NULL, incluir_logo_banco_do_brasil INTEGER NOT NULL DEFAULT 0, logo_original TEXT, logo_hires TEXT, logo_largura INTEGER, logo_altura INTEGER, logo_avisos TEXT NOT NULL DEFAULT '[]', data_criacao TEXT NOT NULL DEFAULT 'x', data_atualizacao TEXT NOT NULL DEFAULT 'x')");
  old.prepare("INSERT INTO municipios (nome_municipio, ddd, numero_whatsapp) VALUES ('Antiga', '11', '45918100')").run();
  old.close();
  const db = openPrintDb(file);
  const m = saveMunicipio(db, { nome_municipio: 'Rolândia', uf: 'PR', ddd: '43', numero_whatsapp: '32558600', endereco: 'Av. Presidente Bernardes, 809', email: 'contato@rolandia.pr.gov.br' });
  assert.equal(m.email, 'contato@rolandia.pr.gov.br');
  assert.equal(db.prepare("SELECT endereco FROM municipios WHERE nome_municipio='Antiga'").get().endereco, null);
});

test('PDF com logomarca oficial: máscara 1 bit em CMYK, sem RGB, checagem de contraste ok', async () => {
  const ctx = { input: input({ includeBB: false, assets: { ...assets, gove: { official: true }, bb: null } }), files: { logos: {}, mockupFile: null } };
  ctx.input.assets.prefeitura = null;
  const { buffer, report } = await renderPiece('display-a6', ctx);
  const raw = buffer.toString('latin1');
  assert.ok(raw.includes('/ImageMask true'));
  assert.ok(!raw.includes('/DeviceRGB'));
  assert.equal(report.find((c) => c.code === 'logo-contraste').level, 'ok');
});
