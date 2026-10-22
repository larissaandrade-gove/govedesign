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

// ------------------------------------------------ identidade Banco do Brasil
const BB = await import('../brand/bb.js');
const { BB_SCHEMES, bbChecks, bbBlockingChecks } = await import('../print-studio/shared/layout.js');
const bbLogos = { central: { width: 1000, height: 700 }, simbolo: { width: 600, height: 600 }, horizontal: { width: 1800, height: 500 } };
const bbInput = (extra = {}) => input({ identity: 'bb', bbScheme: 'capa', includeBB: false, services: ['saude', 'financas', 'transito', 'meio-ambiente'], mockup: { mode: 'generated' }, municipio: { ...municipio, endereco: 'Av. Brasil, 100', email: 'contato@x.gov.br' }, assets: { gove: { official: true }, prefeitura: { width: 900, height: 300 }, bb: bbLogos.central }, ...extra });
const walkAll = (r) => {
  const out = [];
  const walk = (els) => els.forEach((e) => (out.push(e), e.type === 'group' && walk(e.children)));
  r.blocks.forEach((b) => walk(b.elements));
  return out;
};
const PAL = new Set(Object.values(BB.BB_PALETTE));

test('identidade GOVE é o padrão: sem "identity" ou com "gove" a peça sai idêntica', () => {
  for (const l of LAYOUTS) {
    const a = buildLayout(l.id, input(), measure);
    const b = buildLayout(l.id, input({ identity: 'gove', bbScheme: 'roxo' }), measure);
    assert.deepEqual(JSON.parse(JSON.stringify(b)), JSON.parse(JSON.stringify(a)), l.id);
    assert.ok(walkAll(a).some((e) => e.type === 'gradient'), `${l.id}: GOVE mantém o degradê`);
  }
});

test('BB: todos os layouts × esquemas — só cores da paleta, todo texto ≥ 4,5:1 contra o fundo real, fontes BB, sem erros', () => {
  for (const kind of ['central', 'simbolo']) {
    for (const sc of BB_SCHEMES) {
      for (const l of LAYOUTS) {
        const r = buildLayout(l.id, bbInput({ bbScheme: sc.id, assets: { gove: { official: true }, prefeitura: { width: 900, height: 300 }, bb: bbLogos[kind] } }), measure);
        const tag = `${kind}/${sc.id}/${l.id}`;
        assert.equal(r.identity, 'bb');
        assert.deepEqual(r.checks.filter((c) => c.level === 'error'), [], tag);
        const els = walkAll(r);
        assert.ok(!els.some((e) => e.type === 'gradient'), `${tag}: sem degradê`);
        assert.ok(!els.some((e) => e.opacity != null && e.opacity < 1), `${tag}: sem transparência`);
        for (const e of els) {
          if (e.type === 'logo') continue;
          for (const k of ['fill', 'stroke', 'color']) {
            if (typeof e[k] !== 'string') continue;
            const hex = COLORS[e[k]].hex;
            const preto = hex === BB.BB_PRETO && e.type === 'text' && e.bbBackdrop.every((b) => b === BB.BB_PALETTE.rosaEscuro);
            assert.ok(PAL.has(hex) || preto, `${tag}: ${e.type}.${k} = ${e[k]} fora da paleta`);
            assert.equal(COLORS[e[k]].cmyk.length, 4);
          }
          if (e.type === 'text' && e.lines.length) {
            assert.ok(e.bbBackdrop.length && !e.bbBackdrop.includes('imagem'), `${tag}: fundo de "${e.lines[0].text}"`);
            const min = Math.min(...e.bbBackdrop.map((b) => BB.contrast(COLORS[e.color].hex, b)));
            assert.ok(min >= 4.5, `${tag}: "${e.lines[0].text}" ${min.toFixed(2)}:1`);
            assert.match(e.weight, /^bb(Titulos|Textos)/, `${tag}: fonte de "${e.lines[0].text}"`);
            for (const ln of e.lines) for (const run of ln.runs) assert.match(run.weight, /^bb(Titulos|Textos)/);
          }
        }
        const bbLogo = els.find((e) => e.type === 'logo' && e.which === 'bb');
        assert.ok(bbLogo && !bbLogo.missing, `${tag}: logomarca BB obrigatória`);
        assert.ok(bbLogo.w >= BB.BB_LOGO_RULES.minPrintMm[bbLogo.bbKind] - 0.05, `${tag}: BB ${bbLogo.w.toFixed(1)} mm`);
        assert.ok(BB.BB_LOGO_RULES.centralHorizontalBackgrounds.includes(BB.norm(bbLogo.bg)), `${tag}: fundo da logomarca BB`);
      }
    }
  }
});

test('BB: CMYK oficial do guia em cada cor da paleta', () => {
  const guia = { '#FCFC30': [0, 0, 100, 0], '#465EFF': [90, 40, 0, 0], '#3333BD': [90, 95, 0, 0], '#54DCFC': [50, 0, 0, 0], '#00EBD0': [70, 0, 40, 0], '#83FFEA': [40, 0, 20, 0], '#735CC6': [65, 70, 0, 0], '#BDB6FF': [25, 30, 0, 0], '#FF6E91': [0, 80, 20, 0], '#FFA7D3': [0, 40, 0, 0], '#FFFFFF': [0, 0, 0, 0], '#FFF7B5': [0, 0, 25, 0] };
  for (const [hex, cmyk] of Object.entries(guia)) {
    const key = Object.keys(COLORS).find((k) => k.startsWith('bb') && COLORS[k].hex === hex);
    assert.ok(key, hex);
    assert.deepEqual(COLORS[key].cmyk, cmyk, hex);
  }
});

test('BB: logomarca obrigatória, mínimo de impressão e área de proteção', () => {
  const sem = buildLayout('flyer-a4', bbInput({ assets: { gove: { official: true }, prefeitura: { width: 900, height: 300 }, bb: null } }), measure);
  assert.ok(sem.checks.some((c) => c.code === 'logo-bb' && c.level === 'error'));
  // horizontal (mín. 40 mm) não cabe no adesivo de 50 mm: erro claro, sugerindo a versão central
  const hz = buildLayout('adesivo-5x10', bbInput({ assets: { gove: { official: true }, prefeitura: { width: 900, height: 300 }, bb: bbLogos.horizontal } }), measure);
  assert.ok(hz.checks.some((c) => c.code === 'bb-logo-min' && /central/.test(c.message)));
  // texto arrastado para perto da logomarca BB invade a área de proteção
  const r = buildLayout('display-a6', bbInput({ overrides: { h3: { dx: 0, dy: 30 } } }), measure);
  assert.ok(r.checks.some((c) => c.code === 'bb-logo-protecao' || c.code === 'sobreposicao'));
});

test('BB: texto arrastado para outro fundo é corrigido sozinho (cor aprovada ou proteção Azul escuro)', () => {
  // esquema Azul: h4a (Azul escuro no painel Branco) arrastado para cima, metade sobre o Azul institucional
  const r = buildLayout('flyer-a4', bbInput({ bbScheme: 'azul', overrides: { h4a: { dx: 0, dy: -12 } } }), measure);
  assert.ok(r.bbFixes.length > 0);
  assert.ok(r.checks.some((c) => c.code === 'bb-ajuste'));
  assert.deepEqual(bbBlockingChecks(r.checks), []);
  const h4a = walkAll(r).find((e) => e.id === 'h4a');
  assert.ok(Math.min(...h4a.bbBackdrop.map((b) => BB.contrast(COLORS[h4a.color].hex, b))) >= 4.5);
});

test('BB: cor fora da paleta é detectada e bloqueia a exportação', () => {
  const r = buildLayout('adesivo-5x10', bbInput(), measure);
  r.blocks.find((b) => b.id === 'qr').elements[0].fill = 'whatsapp';
  const bad = bbBlockingChecks(bbChecks(r));
  assert.ok(bad.some((c) => c.code === 'bb-paleta'));
});

test('BB: PDF com fontes BancoDoBrasil embutidas (sem Montserrat), só CMYK', async () => {
  for (const l of LAYOUTS) {
    const ctx = { input: bbInput({ assets: { gove: { official: true }, prefeitura: null, bb: bbLogos.central } }), files: { logos: {}, mockupFile: null } };
    const { buffer, report, layout } = await renderPiece(l.id, ctx);
    const raw = buffer.toString('latin1');
    const fonts = [...new Set((raw.match(/\/BaseFont \/[A-Z]{6}\+[\w-]+/g) ?? []).map((m) => m.split('+')[1]))];
    assert.ok(fonts.length >= 2, `${l.id}: ${fonts}`);
    assert.ok(fonts.every((f) => /^BancoDoBrasil(Titulos|Textos)-/.test(f)), `${l.id}: ${fonts}`);
    assert.ok(fonts.some((f) => f.startsWith('BancoDoBrasilTitulos')), `${l.id}: títulos em BB Titulos (${fonts})`);
    // o adesivo só tem título; os demais têm textos de apoio em BB Textos
    if (l.id !== 'adesivo-5x10') assert.ok(fonts.some((f) => f.startsWith('BancoDoBrasilTextos')), `${l.id}: ${fonts}`);
    assert.ok(raw.includes('/FontFile2'));
    assert.ok(!raw.includes('/DeviceRGB'));
    assert.equal(report.find((c) => c.code === 'bb-fontes').level, 'ok');
    assert.equal(report.find((c) => c.code === 'fontes').level, 'ok');
    // só falta o logo da prefeitura (não enviado neste teste)
    assert.deepEqual(layout.checks.filter((c) => c.level === 'error').map((c) => c.code), ['logo-prefeitura']);
  }
});

test('banco: identidade e esquema BB persistidos por município (com migração)', () => {
  const db = openPrintDb(':memory:');
  const m = saveMunicipio(db, { ...municipio });
  assert.equal(m.identidade, 'gove');
  assert.equal(m.bb_esquema, 'capa');
  return import('../print-studio/server/db.js').then(({ setMunicipioIdentidade }) => {
    const n = setMunicipioIdentidade(db, m.id, 'bb', 'roxo');
    assert.equal(n.identidade, 'bb');
    assert.equal(n.bb_esquema, 'roxo');
    // editar o cadastro não perde a identidade
    assert.equal(saveMunicipio(db, { ...municipio, nome_municipio: 'São Carlos 2' }, m.id).identidade, 'bb');
  });
});
