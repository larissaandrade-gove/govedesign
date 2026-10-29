// Ferramentas de cor travadas na paleta (design-system/src/lib/color): cores permitidas,
// paletas só com elas, cor permitida mais próxima e pontos de atenção do daltonismo.
import assert from 'node:assert/strict';
import { test } from 'node:test';

const c = await import('../design-system/src/lib/color/index.ts');
const { BRAND_COLORS } = await import('../design-system/src/data/colorCompass.ts');
const ALLOWED = new Set(c.TOOL_COLORS.map((x) => x.hex));
const KINDS = ['complementar', 'analoga', 'triade', 'tetradica', 'monocromatica'];

test('cores permitidas: as 10 institucionais + branco e preto puros', () => {
  assert.equal(c.TOOL_COLORS.length, 12);
  assert.equal(ALLOWED.size, 12, 'sem repetição');
  for (const b of BRAND_COLORS) assert.ok(c.isAllowed(b.hex), b.name);
  assert.deepEqual(c.toolColor('#FFFFFF'), { name: 'Branco puro', hex: '#ffffff', pure: true });
  assert.deepEqual(c.toolColor('#000000'), { name: 'Preto puro', hex: '#000000', pure: true });
  assert.equal(c.TOOL_COLORS.filter((x) => x.pure).length, 2);
  assert.equal(BRAND_COLORS.length, 10, 'BRAND_COLORS (círculo da Bússola) continua com 10');
  assert.equal(c.isAllowed('#ff0000'), false);
  assert.equal(c.colorName('#3D0099'), 'Roxo');
});

test('cor permitida mais próxima inclui branco e preto puros', () => {
  for (const x of c.TOOL_COLORS) assert.deepEqual(c.nearestBrand(x.hex), { name: x.name, hex: x.hex, deltaE: 0, exact: true });
  assert.equal(c.nearestBrand('#fefefe').name, 'Branco puro');
  assert.equal(c.nearestBrand('#050505').name, 'Preto puro');
  assert.equal(c.nearestBrand('#f2f2f2').name, 'Branco');
  assert.equal(c.nearestBrand('#ffc000').exact, false);
  for (const hex of ['#123456', '#ff00ff', '#00ff00', '#808080']) assert.ok(ALLOWED.has(c.nearestBrand(hex).hex), hex);
});

test('harmonias institucionais: só cores permitidas, sem repetir, base primeiro', () => {
  for (const base of ALLOWED)
    for (const kind of KINDS) {
      const p = c.brandHarmony(base, kind);
      assert.equal(p[0], base, `${base} ${kind}: base primeiro`);
      assert.ok(p.length >= 2, `${base} ${kind}: ao menos 2 cores`);
      assert.equal(new Set(p).size, p.length, `${base} ${kind}: sem repetir`);
      for (const x of p) assert.ok(ALLOWED.has(x), `${base} ${kind}: ${x} fora da paleta`);
    }
  // Cor livre vira a permitida mais próxima antes da harmonia
  assert.equal(c.brandHarmony('#3e019a', 'complementar')[0], '#3d0099');
  // Complementar do Roxo é o Amarelo (o par da marca)
  assert.deepEqual(c.brandHarmony('#3d0099', 'complementar'), ['#3d0099', '#ffc72c']);
});

test('combinações, pares de contraste e tema: só cores permitidas', () => {
  for (const base of ALLOWED) {
    for (const combo of c.brandCombos(base)) for (const x of combo.colors) assert.ok(ALLOWED.has(x.hex), `${combo.name}: ${x.hex}`);
    const pairs = c.contrastPairs(base);
    assert.equal(pairs.length, 11);
    for (let i = 1; i < pairs.length; i++) assert.ok(pairs[i].ratio <= pairs[i - 1].ratio, 'do maior para o menor');
    const t = c.brandTheme(base);
    for (const mode of ['light', 'dark']) {
      for (const v of Object.values(t[mode])) assert.ok(ALLOWED.has(v), `${base} ${mode}: ${v}`);
      assert.ok(c.contrastRatio(t[mode].text, t[mode].surface) >= 4.5, `${base} ${mode}: texto`);
      assert.ok(c.contrastRatio(t[mode].onPrimary, t[mode].primary) >= 4.5, `${base} ${mode}: texto na primária`);
      assert.ok(c.contrastRatio(t[mode].primary, t[mode].surface) >= 4.5, `${base} ${mode}: primária na superfície`);
    }
  }
  assert.equal(c.contrastPairs('#3d0099')[0].other, '#ffffff', 'Roxo contrasta mais com o branco puro');
  assert.equal(c.contrastLevel(7), 'AAA');
  assert.equal(c.contrastLevel(4.5), 'AA');
  assert.equal(c.contrastLevel(3.2), 'AA grande');
  assert.equal(c.contrastLevel(2), 'falha');
  // Pautas que usam a base vêm primeiro
  const combos = c.brandCombos('#5ac2cd');
  const first = combos.findIndex((x) => !x.hasBase);
  assert.ok(first > 0 && combos.slice(first).every((x) => !x.hasBase));
});

test('daltonismo: pontos de atenção (ΔE OKLab < 11 que a deficiência causa, contraste < 4,5:1)', () => {
  const hex = (name) => c.TOOL_COLORS.find((x) => x.name === name).hex;
  const all = c.TOOL_COLORS.map((x) => x.hex);
  const at = (kind, name) => c.visionAttention(all, kind)[all.indexOf(hex(name))];
  assert.equal(c.ATTENTION_DELTA_E, 11);
  // Ciano e Lavanda se confundem na deuteranopia (nas duas direções)
  assert.ok(at('deuteranopia', 'Ciano').some((a) => a.type === 'confusao' && a.with === hex('Lavanda')));
  assert.ok(at('deuteranopia', 'Lavanda').some((a) => a.type === 'confusao' && a.with === hex('Ciano')));
  // Na acromatopsia, Noite e Roxo ficam praticamente iguais
  const nr = at('acromatopsia', 'Noite').find((a) => a.with === hex('Roxo'));
  assert.ok(nr && nr.deltaE < 2);
  // Amarelo sobre Azul confiança perde o 4,5:1 na protanopia
  assert.ok(at('protanopia', 'Amarelo').some((a) => a.type === 'contraste' && a.with === hex('Azul confiança') && a.before >= 4.5 && a.after < 4.5));
  // Variações tonais já próximas na visão típica não contam
  for (const d of c.DEFICIENCIES) assert.ok(!at(d.id, 'Branco').some((a) => a.with === '#ffffff'), `Branco × Branco puro em ${d.id}`);
  // Preto e branco puros nunca recebem ×; cores bem separadas também não
  for (const d of c.DEFICIENCIES) {
    assert.deepEqual(at(d.id, 'Preto puro'), []);
    assert.deepEqual(at(d.id, 'Branco puro'), []);
  }
  assert.deepEqual(c.visionAttention(['#000000', '#ffffff', '#ffc72c'], 'deuteranopia'), [[], [], []]);
  // Vermelho e verde clássicos (ΔE 33,8 → 12,4 na deuteranopia): o limite é ajustável
  assert.deepEqual(c.visionAttention(['#d62728', '#2ca02c'], 'deuteranopia'), [[], []]);
  const rg = c.visionAttention(['#d62728', '#2ca02c'], 'deuteranopia', 15);
  assert.equal(rg[0][0]?.type, 'confusao');
  assert.deepEqual(c.visionAttention(['#d62728', '#2ca02c'], 'tritanopia', 15), [[], []]);
  assert.equal(c.deltaEOk('#000000', '#ffffff').toFixed(0), '100');
});
