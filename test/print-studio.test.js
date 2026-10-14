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
const { LAYOUTS, buildLayout, pdfFileName, whatsappLink, formatPhone } = await import('../print-studio/shared/layout.js');
const { COLORS, GRADIENT, contrastRatio, mmToPt } = await import('../print-studio/shared/tokens.js');

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
  const r = buildLayout('display-a6', input({ overrides: { h1: { dx: -20, dy: 0 } }, assets: { ...assets, gove: null }, municipio: { ...municipio, numero_whatsapp: '123' } }), measure);
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
