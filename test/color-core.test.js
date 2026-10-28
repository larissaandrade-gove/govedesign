// Núcleo de cor do Design System (design-system/src/lib/color): conversões, harmonias,
// escalas, mistura, gradientes, extração de paleta, daltonismo e exportações.
import assert from 'node:assert/strict';
import { test } from 'node:test';

const c = await import('../design-system/src/lib/color/index.ts');
const hueOf = (hex) => c.toSpaces(hex).oklch.h;
const hslHue = (hex) => c.toSpaces(hex).hsl.h;
const hueDist = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

test('conversões: preto, branco, Roxo Gove e cinza sem matiz', () => {
  assert.deepEqual(c.toSpaces('#000000').rgb, { r: 0, g: 0, b: 0 });
  assert.deepEqual(c.toSpaces('#000000').cmyk, { c: 0, m: 0, y: 0, k: 100 });
  assert.deepEqual(c.toSpaces('#ffffff').hsl, { h: 0, s: 0, l: 100 });
  const roxo = c.toSpaces('#3D0099');
  assert.equal(roxo.hex, '#3d0099');
  assert.deepEqual(roxo.rgb, { r: 61, g: 0, b: 153 });
  assert.equal(roxo.hsl.h, 264);
  assert.ok(roxo.oklch.l > 0.3 && roxo.oklch.l < 0.4);
  const cinza = c.toSpaces('#808080').oklch;
  assert.equal(cinza.h, 0);
  assert.ok(cinza.c < 1e-3);
});

test('HEX: curto, sem #, com alpha e inválido', () => {
  assert.deepEqual(c.normalizeHex('abc'), { hex: '#aabbcc', alpha: 1 });
  assert.deepEqual(c.normalizeHex('#3D0099'), { hex: '#3d0099', alpha: 1 });
  assert.deepEqual(c.normalizeHex('#3d009980'), { hex: '#3d0099', alpha: 0.502 });
  assert.equal(c.normalizeHex('#12345'), null);
  assert.equal(c.normalizeHex('roxo'), null);
});

test('cor oficial mais próxima', () => {
  assert.deepEqual(c.nearestBrand('#3D0099'), { name: 'Roxo', hex: '#3d0099', deltaE: 0, exact: true });
  const quase = c.nearestBrand('#ffc000');
  assert.equal(quase.name, 'Amarelo');
  assert.equal(quase.exact, false);
});

test('harmonias: ângulos do matiz e monocromática no mesmo matiz', () => {
  const base = '#3d0099';
  const [, comp] = c.harmony(base, 'complementar');
  assert.ok(hueDist(hslHue(comp), hslHue(base) + 180) <= 2, 'complementar a 180°');
  const tri = c.harmony(base, 'triade');
  assert.equal(tri.length, 3);
  assert.ok(hueDist(hslHue(tri[1]), hslHue(base) + 120) <= 2);
  assert.equal(c.harmony(base, 'tetradica').length, 4);
  assert.equal(c.harmony(base, 'analoga').length, 3);
  for (const m of c.harmony(base, 'monocromatica')) assert.ok(hueDist(hueOf(m), hueOf(base)) < 8, `monocromática ${m}`);
});

test('escala 50–950: 11 passos, do mais claro ao mais escuro, com a base', () => {
  const s = c.shades('#3d0099');
  assert.deepEqual(s.map((x) => x.step), [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);
  const l = s.map((x) => c.toSpaces(x.hex).oklch.l);
  for (let i = 1; i < l.length; i++) assert.ok(l[i] < l[i - 1], `passo ${s[i].step} mais escuro`);
  assert.ok(s.some((x) => x.hex === '#3d0099'));
  for (const g of c.shades('#808080')) assert.ok(c.toSpaces(g.hex).oklch.c < 0.01, 'cinza continua cinza');
});

test('tema claro/escuro: texto e primária com contraste mínimo', () => {
  const t = c.themeFrom('#3d0099');
  assert.ok(c.contrastRatio(t.light.text, t.light.surface) >= 4.5);
  assert.ok(c.contrastRatio(t.dark.text, t.dark.surface) >= 4.5);
  assert.ok(c.contrastRatio(t.light.primary, '#ffffff') >= 4.5);
  assert.ok(c.contrastRatio(t.light.onPrimary, t.light.primary) >= 4.5);
});

test('mistura: pontas, cinza no meio e matiz pelo caminho curto', () => {
  assert.equal(c.mix('#000000', '#ffffff', 0, 'rgb'), '#000000');
  assert.equal(c.mix('#000000', '#ffffff', 1, 'oklch'), '#ffffff');
  assert.equal(c.mix('#000000', '#ffffff', 0.5, 'rgb'), '#808080');
  // Vermelho (0°) → magenta (300°): o caminho curto passa por 330°, não pelo verde
  const meio = c.toSpaces(c.mix('#ff0000', '#ff00ff', 0.5, 'hsl')).hsl.h;
  assert.ok(meio > 300 && meio < 360, `matiz ${meio}`);
  const p = c.steps('#3d0099', '#ffc72c', 5, 'oklch');
  assert.equal(p.length, 5);
  assert.equal(p[0], '#3d0099');
  assert.equal(p[4], '#ffc72c');
});

test('gradientes: CSS linear/radial/cônico, mesh e texto', () => {
  const stops = [{ hex: '#3d0099', at: 0 }, { hex: '#ffc72c', at: 100 }];
  assert.equal(c.toCss({ kind: 'linear', angle: 90, stops, space: 'rgb' }), 'linear-gradient(90deg, #3d0099 0%, #ffc72c 100%)');
  assert.match(c.toCss({ kind: 'radial', angle: 0, stops, space: 'rgb' }), /^radial-gradient\(circle at center, /);
  assert.match(c.toCss({ kind: 'conico', angle: 45, stops, space: 'rgb' }), /^conic-gradient\(from 45deg/);
  const ok = c.toCss({ kind: 'linear', angle: 90, stops, space: 'oklch' });
  assert.equal(ok.match(/#/g).length, 6, 'paradas intermediárias em OKLCH');
  const pts = [{ hex: '#20133d', x: 0, y: 0, r: 0 }, { hex: '#3d0099', x: 20, y: 30, r: 60 }];
  assert.equal(c.meshCss(pts).backgroundColor, '#20133d');
  assert.match(c.meshSvg(pts), /^<svg[^>]+xmlns="http:\/\/www.w3.org\/2000\/svg".*<\/svg>$/);
  const txt = c.textGradientCss({ kind: 'linear', angle: 90, stops, space: 'rgb' });
  assert.match(txt, /^color: #3d0099;/);
  assert.match(txt, /background-clip: text;/);
});

test('extração de paleta: duas cores, transparência e vazio', () => {
  const px = [];
  for (let i = 0; i < 300; i++) px.push(61, 0, 153, 255);
  for (let i = 0; i < 100; i++) px.push(255, 199, 44, 255);
  for (let i = 0; i < 500; i++) px.push(0, 255, 0, 0); // transparente: ignorado
  assert.deepEqual(c.extractPalette(new Uint8ClampedArray(px), 4), ['#3d0099', '#ffc72c']);
  // Mais caixas que cores: nenhuma cor inventada pela média de duas
  for (const n of [3, 6, 8]) assert.deepEqual(c.extractPalette(new Uint8ClampedArray(px), n), ['#3d0099', '#ffc72c'], `n=${n}`);
  // Imagem de 3 cores com proporções desiguais
  const tri = [];
  for (let i = 0; i < 700; i++) tri.push(32, 19, 61, 255);
  for (let i = 0; i < 250; i++) tri.push(90, 194, 205, 255);
  for (let i = 0; i < 50; i++) tri.push(244, 244, 244, 255);
  assert.deepEqual(c.extractPalette(new Uint8ClampedArray(tri), 6), ['#20133d', '#5ac2cd', '#f4f4f4']);
  assert.deepEqual(c.extractPalette(new Uint8ClampedArray([]), 4), []);
});

test('daltonismo: preto e branco não mudam; vermelho e verde se confundem', () => {
  for (const d of c.DEFICIENCIES) {
    assert.equal(c.simulate('#000000', d.id), '#000000');
    assert.equal(c.simulate('#ffffff', d.id), '#ffffff');
  }
  assert.equal(c.confusable(['#d62728', '#2ca02c'], 'deuteranopia', 20).length, 1);
  assert.equal(c.confusable(['#000000', '#ffffff'], 'protanopia').length, 0);
});

test('exportações: CSS, JSON, Tailwind e SVG', () => {
  const shades = c.shades('#3d0099');
  const css = c.toCssVars({ name: 'Roxo Gove', shades });
  assert.match(css, /^:root \{\n {2}--roxo-gove-50: #[0-9a-f]{6};/);
  assert.equal(Object.keys(JSON.parse(c.toJson({ name: 'Roxo', shades })).roxo).length, 11);
  const tw = c.toTailwind({ name: 'Roxo', shades });
  assert.match(tw, /'roxo': \{\n {10}50: '#[0-9a-f]{6}',/);
  assert.match(c.toCssVars({ name: 'Tema', theme: c.themeFrom('#3d0099') }), /--tema-light-on-primary:/);
  assert.match(c.paletteSvg(['#3d0099', '#ffc72c']), /width="240"/);
});
