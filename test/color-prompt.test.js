// Prompt de revisão de cores da Colorimetria em pauta (design-system/src/data/colorCompass.ts).
import assert from 'node:assert/strict';
import { test } from 'node:test';

const { TOPICS, ATTRIBUTES, topicReviewPrompt } = await import('../design-system/src/data/colorCompass.ts');

test('o prompt traz a pauta selecionada e as proporções do mix', () => {
  TOPICS.forEach((t, i) => {
    const p = topicReviewPrompt(i);
    assert.ok(p.includes(`## Pauta: ${t.name}`));
    for (const m of t.mix) assert.ok(p.includes(`${m.hex}: ${m.share}%`), `${t.name} ${m.hex}`);
    assert.ok(!p.includes('Tom desejado'));
  });
  assert.notEqual(topicReviewPrompt(0), topicReviewPrompt(1));
});

test('as palavras da aba Tom entram como tom desejado', () => {
  const p = topicReviewPrompt(3, [0, 8]);
  assert.ok(p.includes(`Tom desejado para esta peça: ${ATTRIBUTES[0].name}, ${ATTRIBUTES[8].name}.`));
});
