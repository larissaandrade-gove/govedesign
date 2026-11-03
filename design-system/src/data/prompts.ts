// Prompts prontos para copiar (Instruções › Prompts). Montados a partir dos dados
// do design system — tokens, paleta, tipografia, espaçamento e regra da logomarca —,
// então mudam sozinhos quando um parâmetro muda.
import { LOGOS, LOGO_COLORS, LOGO_MIN_CONTRAST, contrast, pickLogo } from '../../../brand/logos.js';
import { BRAND_COLORS, TOPICS } from './colorCompass.ts';
import { fonts, motion, radius, spacing, themes, typeScale } from './tokens.js';

const px = (v: string) => parseInt(v, 10);
const dec = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const byHex = (hex: string) => BRAND_COLORS.find((c) => c.hex.toUpperCase() === hex.toUpperCase());
/** "Noite #20133D" (ou só o HEX, fora da paleta nomeada). */
const named = (hex: string) => {
  const c = byHex(hex);
  return c ? `${c.name} ${c.hex}` : hex.toUpperCase();
};
const byName = (name: string) => BRAND_COLORS.find((c) => c.name === name)!.hex;

const WHITE = themes.light.background;
/** Cores de apoio: nunca em texto pequeno (Diretrizes, seção 3). */
const SUPPORT_ONLY = new Set([byName('Lavanda'), byName('Cinza técnico')]);

type TypeStyle = { lineHeight: string; fontWeight: string; letterSpacing?: string };
const SCALE = Object.entries(typeScale) as [string, [string, TypeStyle]][];

const TYPE_LABEL: Record<string, string> = { display: 'Display', h1: 'H1', h2: 'H2', h3: 'H3', 'body-large': 'Corpo grande', body: 'Corpo', caption: 'Legenda' };
const typeLines = () =>
  SCALE.map(([k, [size, o]]) => {
    const font = k === 'display' || k.startsWith('h') ? fonts.display[0] : fonts.sans[0];
    return `- ${TYPE_LABEL[k] ?? k}: ${font} ${px(size)} px, peso ${o.fontWeight}, altura de linha ${o.lineHeight.replace('.', ',')}${o.letterSpacing ? `, tracking ${o.letterSpacing}` : ''}`;
  });

const spacingList = () => Object.values(spacing).map(px).join(', ');
const radiusLine = () => `${px(radius.sm)} px (campos e tags), ${px(radius.md)} px (botões), ${px(radius.lg)} px (cards e modais), circular (avatares e pílulas)`;
const fontsLine = () =>
  `- ${fonts.display[0]} (600–700) nos títulos e destaques; ${fonts.sans[0]} (400–600) no corpo e na interface; reserva ${fonts.display.slice(1, -1).join(', depois ')}.`;

/** Pares de contraste calculados (WCAG) entre as cores da paleta: texto pequeno ≥ 4,5:1. */
export function contrastPairs() {
  return BRAND_COLORS.map((bg) => ({
    bg,
    // Cor de apoio (no texto ou no fundo) só vale para texto grande
    small: BRAND_COLORS.filter((t) => t !== bg && !SUPPORT_ONLY.has(t.hex) && !SUPPORT_ONLY.has(bg.hex) && contrast(bg.hex, t.hex) >= 4.5),
    large: BRAND_COLORS.filter(
      (t) => t !== bg && contrast(bg.hex, t.hex) >= 3 && (SUPPORT_ONLY.has(t.hex) || SUPPORT_ONLY.has(bg.hex) || contrast(bg.hex, t.hex) < 4.5),
    ),
  })).filter((p) => p.small.length || p.large.length);
}

const paletteLines = () => BRAND_COLORS.map((c) => `- ${c.name} ${c.hex} (${c.group}): ${c.use}`);
const contrastLines = () =>
  contrastPairs().map(
    ({ bg, small, large }) =>
      `- Sobre ${bg.name}: ${small.length ? small.map((t) => t.name).join(', ') : 'nenhuma em texto pequeno'}${large.length ? `; só texto grande: ${large.map((t) => t.name).join(', ')}` : ''}.`,
  );

const LOGO_BACKGROUNDS = ['#FFFFFF', 'Branco', 'Amarelo', 'Ciano', 'Roxo', 'Noite', 'Grafite', 'Azul confiança'];
const VARIANT_LABEL: Record<string, string> = { cor: 'colorida', 'branco-amarelo': 'branca com arco amarelo', roxo: 'roxa', branco: 'branca' };
const logoLines = () => [
  `- Use só os arquivos oficiais: logotipo (${LOGOS.logotipo.variants.map((v) => v.file).join(', ')}) e símbolo (${LOGOS.simbolo.variants.map((v) => v.file).join(', ')}).`,
  `- Regra obrigatória: cada cor presente na logo precisa de contraste mínimo de ${dec(LOGO_MIN_CONTRAST)}:1 com o fundo. Cores da logo: roxo ${LOGO_COLORS.roxo}, amarelo ${LOGO_COLORS.amarelo}, branco ${LOGO_COLORS.branco}.`,
  `- Versão do logotipo por fundo: ${LOGO_BACKGROUNDS.map((b) => {
    const hex = b.startsWith('#') ? b : byName(b);
    const pick = pickLogo(hex, 'logotipo');
    return `${b === '#FFFFFF' ? 'Branco puro #FFFFFF' : named(hex)} → ${pick.ok ? VARIANT_LABEL[pick.variant] : 'placa sólida'}`;
  }).join('; ')}.`,
  '- Fundo que não passa com nenhuma versão (fotos, gradientes): coloque a logo sobre uma placa sólida que passe.',
  `- Símbolo em espaços quadrados (ícones, avatares, perfil); logotipo em espaços horizontais (cabeçalhos, rodapés). Área de proteção igual à altura do arco do símbolo; mínimo de 24 px de altura em tela e 8 mm no impresso.`,
  '- Nunca distorcer, girar, recolorir fora das versões oficiais, aplicar sombra ou contorno, ou redesenhar.',
];

const voiceLines = [
  '- Português do Brasil; frases curtas e declarativas, com verbo de ação; foco no benefício, não na tecnologia.',
  '- Títulos e botões em sentence case; botões começam com verbo; um único chamado para ação por peça ou tela.',
  '- Sem emoji, sem jargão burocrático, sem exclamações em sequência, sem textos repetidos.',
];
const iconLines = [
  '- Ícones só do conjunto Phosphor; nunca duotone; um único peso por peça (na interface, regular e fill só no item ativo).',
];

const block = (title: string, lines: string[]) => ['', `## ${title}`, ...lines];
const intro = (what: string) => `Você cria ${what} para a Gove (Governo Zero Clique): o governo que sabe, antecipa e age. Siga estritamente o Design System Gove abaixo.`;
const close = (items: string) => ['', '## Antes de entregar', `Confira: ${items}. Aponte qualquer desvio que não puder evitar.`];

/** Prompt de componentes de interface (React/Tailwind, protótipos, telas). */
export function promptComponentes() {
  const role = (t: 'light' | 'dark') =>
    Object.entries(themes[t])
      .map(([k, v]) => `${k} ${v}`)
      .join(', ');
  return [
    intro('componentes e telas de interface'),
    ...block('Tokens de cor (papel → HEX)', [
      `- Tema claro (padrão): ${role('light')}.`,
      `- Tema escuro (Noturno): ${role('dark')}.`,
      '- Um único botão de ação (accent, Amarelo) por tela; texto sobre accent em on-accent, sobre primary em on-primary. Nunca preto puro (#000000).',
    ]),
    ...block('Tipografia', [fontsLine(), ...typeLines(), '- Nada abaixo de 11 px; corpo de tela 16–17 px.']),
    ...block('Espaço, forma e movimento', [
      `- Grade de 8 px: ${spacingList()}.`,
      `- Raios: ${radiusLine()}.`,
      `- Movimento: entrada com fade + subida de 20 px em ${motion.entry * 1000} ms, cubic-bezier(${motion.ease.join(', ')}); estados em 200–300 ms; cascata de ${motion.stagger * 1000} ms; respeitar "reduzir movimento".`,
    ]),
    ...block('Componentes', [
      `- Botões de 48 px (md) ou 56 px (lg) de altura, raio ${px(radius.md)} px: Ação (accent ${themes.light.accent}, texto ${themes.light['on-accent']}), Primário (primary ${themes.light.primary}, texto branco), Secundário (contorno sutil). Hover escala 1,02; desabilitado 40% de opacidade.`,
      `- Campo de texto: rótulo visível acima (14 px, semibold), 48 px de altura, raio ${px(radius.md)} px, foco com borda primary; placeholder nunca substitui o rótulo.`,
      `- Card: superfície (surface), borda sutil, raio ${px(radius.lg)} px, padding ${px(spacing['space-3'])} px; ícone em placa de 48 px, título H3, até duas linhas.`,
      '- Navegação Material Design 3: drawer que recolhe para rail no computador; top app bar + navigation bar (3 a 5 destinos) + FAB no celular; item ativo com indicador em pílula e ícone fill.',
      '- Status com ícone + texto; detalhes secundários recolhidos.',
    ]),
    ...block('Acessibilidade', [
      '- Contraste de texto ≥ 4,5:1 (3:1 só a partir de 24 px); cor nunca é a única pista.',
      `- Alvos de toque ≥ 44 × 44 px; foco visível com contorno de 2 px na cor highlight, afastado 2 px; ícone sozinho sempre com nome acessível.`,
      '- Responsivo a partir de 360 px, sem rolagem lateral.',
    ]),
    ...block('Ícones e texto', [...iconLines, ...voiceLines]),
    ...close('tokens de cor, contraste, fontes, alvos de 44 px, foco visível e um único botão de ação por tela'),
  ].join('\n');
}

/** Prompt geral de mídias: peças sociais, anúncios, banners e imagens. */
export function promptMidias() {
  return [
    intro('peças de mídia (redes sociais, anúncios, banners e imagens)'),
    ...block('Paleta oficial (use só estas cores; nunca #000000)', paletteLines()),
    ...block('Pares de contraste aprovados (texto pequeno ≥ 4,5:1, calculados)', [
      ...contrastLines(),
      `- Lavanda ${byName('Lavanda')} e Cinza técnico ${byName('Cinza técnico')} são cores de apoio: nunca em texto pequeno.`,
      '- Texto sobre Amarelo: Noite. Texto sobre Roxo: Branco. Gradientes só entre cores da paleta e nunca atrás de texto pequeno.',
    ]),
    ...block('Predominância de cor por pauta (a primeira é a dominante)', TOPICS.map((t) => `- ${t.name}: ${t.mix.map((m) => `${byHex(m.hex)?.name} ${m.share}%`).join(', ')}`)),
    ...block('Tipografia', [fontsLine(), `- Títulos em ${fonts.display[0]} Bold; nada abaixo de 11 px; título até 60 caracteres, subtítulo até 90, CTA com verbo.`]),
    ...block('Formatos e margens', [
      '- Feed 1080 × 1350 (4:5), quadrado 1080 × 1080 (1:1), story 1080 × 1920 (9:16), LinkedIn 1200 × 628 ou 1920 × 1005, follow-up 1440 × 1080 (4:3).',
      '- Margem de segurança de 6% do menor lado (8% em story); nada importante fora dela.',
    ]),
    ...block('Logomarca (em todas as peças)', logoLines()),
    ...block('Imagens, ícones e texto', [
      '- Fotos são apoio: pessoas reais em contexto de serviço público; nunca texto direto sobre área clara da foto (use placa).',
      ...iconLines,
      ...voiceLines,
    ]),
    ...close('paleta, contraste, versão da logo para o fundo, fontes, margem de segurança e um único CTA'),
  ].join('\n');
}

/** Prompt de apresentações (PowerPoint, Google Slides, Keynote). */
export function promptApresentacoes() {
  const margin = px(spacing['space-12']);
  return [
    intro('apresentações (PowerPoint, Google Slides, Keynote)'),
    ...block('Formato', [
      `- 16:9, 1920 × 1080 px (33,867 × 19,05 cm); margem de ${margin} px em todos os lados.`,
      '- Uma ideia por slide; no máximo 6 linhas de texto.',
    ]),
    ...block('Tipografia', [
      fontsLine(),
      `- Título 40–48 pt em ${fonts.display[0]} Bold; subtítulo 24–28 pt; corpo 18–24 pt em ${fonts.sans[0]}; nunca abaixo de 14 pt no slide, nem de 11 pt em notas e rodapés.`,
      '- Incorpore as fontes ao salvar.',
    ]),
    ...block('Cores', [
      `- Capa e divisórias: fundo ${named(byName('Noite'))} ou ${named(byName('Roxo'))}, títulos em ${named(byName('Branco'))}, destaque em ${named(byName('Amarelo'))}.`,
      `- Conteúdo: fundo ${named(byName('Branco'))} (ou Branco puro ${WHITE}), títulos ${named(byName('Noite'))}, corpo ${named(byName('Grafite'))}, links ${named(themes.light.link)}.`,
      `- Gráficos sobre fundo claro: ${['Roxo', 'Azul confiança', 'Grafite', 'Lavanda', 'Cinza técnico'].map((n) => named(byName(n))).join(', ')}; sobre Noite: ${['Ciano', 'Amarelo', 'Lavanda', 'Branco'].map((n) => named(byName(n))).join(', ')}. Rótulos diretos, sem 3D.`,
      ...contrastLines(),
    ]),
    ...block('Logomarca', [
      ...logoLines(),
      `- Logotipo pequeno no rodapé de todos os slides de conteúdo; número da página em ${fonts.sans[0]} 12 pt ${named(byName('Cinza técnico'))}.`,
    ]),
    ...block('Imagens, ícones e texto', ['- Fotos com cantos de 16 px ou sangradas; nunca texto sobre foto sem placa.', ...iconLines, ...voiceLines]),
    ...close('margens, tamanhos mínimos, paleta, contraste, versão da logo em cada fundo e uma ideia por slide'),
  ].join('\n');
}

/** Prompt de documentos e e-mails (Word/Docs, PDF, e-mail HTML). */
export function promptDocumentos() {
  return [
    intro('documentos (Word, Google Docs, PDF) e e-mails em HTML'),
    ...block('Documentos', [
      fontsLine(),
      `- Mesma escala das telas, em pt: ${SCALE
        .filter(([k]) => k !== 'display')
        .map(([k, [s]]) => `${TYPE_LABEL[k]} ${px(s)}`)
        .join(', ')}; nada abaixo de 11 pt.`,
      `- Títulos em ${named(byName('Noite'))} ou ${named(byName('Roxo'))}; corpo em ${named(byName('Grafite'))}; fundo branco.`,
      '- Logotipo no cabeçalho, na versão certa para o fundo.',
    ]),
    ...block('E-mails (HTML)', [
      `- 600 px de largura, uma coluna, fundo branco; ${fonts.sans[0]} com reserva Arial/Helvetica.`,
      '- Corpo 16 px, títulos 24–28 px, nada abaixo de 12 px (rodapé legal no mínimo 12 px).',
      `- Botão principal ${named(byName('Amarelo'))} com texto ${named(byName('Noite'))}, 44 px de altura mínima, texto em HTML (não imagem).`,
      '- Logotipo no topo pela regra de contraste, com texto alternativo "Gove".',
    ]),
    ...block('Paleta oficial (nunca #000000)', paletteLines()),
    ...block('Contraste (texto pequeno ≥ 4,5:1)', contrastLines()),
    ...block('Logomarca', logoLines()),
    ...block('Texto', voiceLines),
    ...close('paleta, contraste, fontes, tamanhos mínimos, logo correta e um único chamado para ação'),
  ].join('\n');
}

export type PromptDef = { id: string; title: string; description: string; covers: string[]; build: () => string };

export const PROMPTS: PromptDef[] = [
  {
    id: 'componentes',
    title: 'Prompt de componentes',
    description: 'Telas, protótipos e componentes de interface com os tokens do design system.',
    covers: ['Tokens claro e escuro', 'Escala tipográfica', 'Grade e raios', 'Acessibilidade'],
    build: promptComponentes,
  },
  {
    id: 'midias',
    title: 'Prompt geral de mídias',
    description: 'Peças sociais, anúncios, banners e imagens geradas por IA.',
    covers: ['Paleta e contraste', 'Pautas de cor', 'Formatos e margens', 'Logomarca'],
    build: promptMidias,
  },
  {
    id: 'apresentacoes',
    title: 'Prompt de apresentações',
    description: 'Slides 16:9 no PowerPoint, Google Slides ou Keynote.',
    covers: ['Margens e tamanhos', 'Capa e conteúdo', 'Gráficos', 'Logomarca'],
    build: promptApresentacoes,
  },
  {
    id: 'documentos',
    title: 'Prompt de documentos e e-mails',
    description: 'Documentos, PDFs e e-mails em HTML.',
    covers: ['Escala em pt', 'E-mail de 600 px', 'Botão e logo', 'Contraste'],
    build: promptDocumentos,
  },
];
