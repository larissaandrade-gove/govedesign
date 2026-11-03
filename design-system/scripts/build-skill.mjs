// Reúne todas as instruções de Apoio de IA num só arquivo, no formato de uma skill:
//   npm run skill   →  skills/gove-design-system/SKILL.md
// Gerado a partir dos guias (docs/) e dos dados do design system (prompts, paleta, pautas),
// então basta rodar de novo quando um parâmetro mudar. O teste test/skill.test.js avisa se ficou desatualizado.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const SKILL_PATH = `${root}skills/gove-design-system/SKILL.md`;

export async function buildSkill() {
  const { PROMPTS } = await import('../src/data/prompts.ts');
  const { BRAND_COLORS, TOPICS, ATTRIBUTES, QUESTIONS, topicReviewPrompt } = await import('../src/data/colorCompass.ts');
  const doc = (f) => readFileSync(`${root}docs/${f}`, 'utf8').trim();
  // Os guias começam com o próprio título (#); descem um nível para caber no arquivo.
  const nest = (md) => md.replace(/^(#+) /gm, '#$1 ');
  const nameOf = (hex) => BRAND_COLORS.find((c) => c.hex === hex).name;

  const colors = BRAND_COLORS.map((c) => `| ${c.name} | ${c.hex} | ${c.group} | ${c.use} | ${c.meaning} |`);
  const topics = TOPICS.map((t) => `| ${t.name} | ${t.focus} | ${t.mix.map((m) => `${nameOf(m.hex)} ${m.share}%`).join(' · ')} |`);
  const attrs = ATTRIBUTES.map((a) => `${a.name} (${a.colors.map(nameOf).join(', ')})`).join('; ');

  return [
    '---',
    'name: gove-design-system',
    'description: Diretrizes de marca e do Design System Gove Digital (cores, logomarca, tipografia, componentes, pautas de cor e prompts) para criar ou revisar peças, mídias, apresentações, documentos, e-mails e interfaces da Gove. Use sempre que for gerar ou avaliar qualquer material visual ou texto de marca da Gove.',
    '---',
    '',
    '# Gove Design System — instruções para IA',
    '',
    'Arquivo único com todas as instruções de **Apoio de IA** do Design System Gove. Gerado por `design-system/scripts/build-skill.mjs` a partir dos guias em `docs/` e dos dados do design system; não edite à mão.',
    '',
    '## Como usar',
    '- Antes de criar qualquer peça, identifique o tipo (mídia, apresentação, documento/e-mail, interface) e siga o prompt correspondente em "Prompts por tipo de peça".',
    '- Use só as cores da paleta, as fontes e a regra da logomarca descritas aqui. Na dúvida, prefira o tom mais sóbrio e o contraste maior.',
    '- Para revisar uma peça, use "Revisão de cores por pauta" com a pauta do assunto.',
    '',
    '## Paleta institucional',
    '| Cor | HEX | Grupo | Uso | Transmite |',
    '| --- | --- | --- | --- | --- |',
    ...colors,
    '',
    'Branco puro #FFFFFF também é permitido. Preto puro (#000000) não entra nas peças (Diretrizes, seção 3).',
    '',
    '## Colorimetria em pauta',
    '| Pauta | Foco | Predominância |',
    '| --- | --- | --- |',
    ...topics,
    '',
    `Atributos da bússola e suas cores: ${attrs}.`,
    '',
    'Perguntas que orientam a escolha:',
    ...QUESTIONS.map((q) => `- **${q.axis}:** ${q.items.join(' ')}`),
    '',
    '## Prompts por tipo de peça',
    ...PROMPTS.flatMap((p) => ['', `### ${p.title}`, `_${p.description}_`, '', '```text', p.build().trim(), '```']),
    '',
    '## Revisão de cores por pauta',
    'Modelo de prompt (exemplo com a primeira pauta; troque pela pauta do assunto):',
    '',
    '```text',
    topicReviewPrompt(0),
    '```',
    '',
    nest(doc('diretrizes-gove.md')),
    '',
    nest(doc('tipografia-gove.md')),
    '',
    nest(doc('componentes-gove.md')),
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(SKILL_PATH, await buildSkill());
  console.log(`Skill gerada em ${SKILL_PATH.replace(root, '')}`);
}
