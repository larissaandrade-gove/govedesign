import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTES, QR } from '../vectorcraft/web/palettes.js';
import { BB_PALETTE } from '../brand/bb.js';

test('amostras do VectorCraft: CMYK válido em todas as cores', () => {
  for (const p of Object.values(PALETTES)) {
    assert.ok(p.colors.length > 0, p.id);
    for (const c of p.colors) {
      assert.equal(c.cmyk.length, 4, c.name);
      for (const v of c.cmyk) assert.ok(v >= 0 && v <= 100, `${c.name}: ${v}`);
      assert.match(c.hex, /^#[0-9A-F]{6}$/i, c.name);
    }
  }
});

test('amostras BB: toda a paleta do guia (e só ela, mais o Preto de texto)', () => {
  const hexes = new Set(PALETTES.bb.colors.map((c) => c.hex.toUpperCase()));
  for (const hex of Object.values(BB_PALETTE)) assert.ok(hexes.has(hex), hex);
  for (const hex of hexes) assert.ok(Object.values(BB_PALETTE).includes(hex) || hex === '#000000', hex);
});

test('QR code: preto K100 sobre branco', () => {
  assert.equal(QR.dark.hex, '#000000');
  assert.deepEqual(QR.dark.cmyk, [0, 0, 0, 100]);
  assert.equal(QR.light.hex, '#FFFFFF');
});
