// Identidade Banco do Brasil: paleta, pares aprovados (>= 4,5:1) e esquemas das peças.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BB_PALETTE, BB_PRETO, BB_SCHEMES, BB_TEXT_ON, contrast, graphicColors, isBBColor, textOn, textOnSamples } from '../brand/bb.js';

const r2 = (x) => Math.round(x * 100) / 100;

test('razões do manual (pares aprovados e armadilhas)', () => {
  const P = BB_PALETTE;
  assert.equal(r2(contrast(P.amareloInstitucional, P.azulEscuro)), 8.13);
  assert.equal(r2(contrast(P.azulInstitucional, P.branco)), 4.88);
  assert.equal(r2(contrast(P.azulEscuro, P.branco)), 8.94);
  assert.equal(r2(contrast(P.rosaEscuro, BB_PRETO)), 7.89);
  assert.ok(contrast(P.azulInstitucional, P.amareloInstitucional) < 4.5); // 4,44: reprovado
  assert.ok(contrast(P.azulInstitucional, P.amareloClaro) < 4.5); // 4,46: reprovado
});

test('todo par aprovado passa 4,5:1 e todo fundo da paleta tem par', () => {
  for (const bg of Object.values(BB_PALETTE)) {
    const list = BB_TEXT_ON[bg];
    assert.ok(list?.length, bg);
    for (const t of list) assert.ok(contrast(t, bg) >= 4.5, `${t} sobre ${bg}`);
    assert.ok(contrast(textOn(bg), bg) >= 4.5);
  }
  assert.equal(textOn(BB_PALETTE.rosaEscuro), BB_PRETO);
  assert.equal(textOn(BB_PALETTE.amareloInstitucional, BB_PALETTE.azulInstitucional), BB_PALETTE.azulEscuro); // reprovado vira Azul escuro
});

test('esquemas das peças: só paleta e pares >= 4,5:1', () => {
  for (const s of BB_SCHEMES) {
    for (const c of [s.bg, s.title, s.text, s.accent, s.button, s.buttonText]) assert.ok(isBBColor(c), `${s.id} ${c}`);
    for (const c of [s.title, s.text, s.accent]) assert.ok(contrast(c, s.bg) >= 4.5, `${s.id} ${c}`);
    assert.ok(contrast(s.buttonText, s.button) >= 4.5, `${s.id} botão`);
  }
});

test('texto sobre foto e cores gráficas', () => {
  assert.equal(textOnSamples(['#FFFFFF', '#FFF7B5']), BB_PALETTE.azulEscuro);
  assert.equal(textOnSamples(['#000000', '#FFFFFF']), null); // pede proteção de contraste
  assert.deepEqual(graphicColors(BB_PALETTE.branco), [BB_PALETTE.azulInstitucional, BB_PALETTE.azulEscuro, BB_PALETTE.roxoEscuro]);
});
