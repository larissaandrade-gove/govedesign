// Identidade Banco do Brasil (produto segmentado GOVE + BB) para os geradores
// de criativos, follow-ups, impressos e landing pages. Fonte de verdade: Manual
// da Logomarca BB, transcrito no "Design System Banco do Brasil" da GOVE.
// Regras: todo texto com contraste >= 4,5:1 (sem exceção para texto grande);
// só cores da paleta; Preto apenas como texto quando nada da paleta passa
// (hoje, só sobre Rosa escuro); logomarca BB nunca é recolorida.

export const BB_PALETTE = {
  amareloInstitucional: '#FCFC30',
  azulInstitucional: '#465EFF',
  azulEscuro: '#3333BD',
  azulClaro: '#54DCFC',
  verdeEscuro: '#00EBD0',
  verdeClaro: '#83FFEA',
  roxoEscuro: '#735CC6',
  roxoClaro: '#BDB6FF',
  rosaEscuro: '#FF6E91',
  rosaClaro: '#FFA7D3',
  branco: '#FFFFFF',
  amareloClaro: '#FFF7B5',
};
/** Exceção técnica: só como texto, só quando nenhuma cor da paleta passa. */
export const BB_PRETO = '#000000';
export const BB_NAMES = {
  '#FCFC30': 'Amarelo institucional',
  '#465EFF': 'Azul institucional',
  '#3333BD': 'Azul escuro',
  '#54DCFC': 'Azul claro',
  '#00EBD0': 'Verde escuro',
  '#83FFEA': 'Verde claro',
  '#735CC6': 'Roxo escuro',
  '#BDB6FF': 'Roxo claro',
  '#FF6E91': 'Rosa escuro',
  '#FFA7D3': 'Rosa claro',
  '#FFFFFF': 'Branco',
  '#FFF7B5': 'Amarelo claro',
  '#000000': 'Preto',
};
export const MIN_TEXT = 4.5;
export const MIN_GRAPHIC = 3;

const P = BB_PALETTE;

/** Pares aprovados (fundo → textos permitidos, do preferencial ao menos usado). */
export const BB_TEXT_ON = {
  [P.amareloInstitucional]: [P.azulEscuro, P.roxoEscuro],
  [P.azulInstitucional]: [P.branco],
  [P.azulEscuro]: [P.branco, P.amareloInstitucional, P.amareloClaro, P.verdeClaro, P.verdeEscuro, P.azulClaro, P.rosaClaro, P.roxoClaro],
  [P.azulClaro]: [P.azulEscuro],
  [P.verdeEscuro]: [P.azulEscuro],
  [P.verdeClaro]: [P.azulEscuro],
  [P.roxoEscuro]: [P.branco, P.amareloClaro, P.amareloInstitucional],
  [P.roxoClaro]: [P.azulEscuro],
  [P.rosaEscuro]: [BB_PRETO],
  [P.rosaClaro]: [P.azulEscuro],
  [P.branco]: [P.azulEscuro, P.roxoEscuro, P.azulInstitucional],
  [P.amareloClaro]: [P.azulEscuro, P.roxoEscuro],
};

/**
 * Esquemas prontos para peças (fundo, título, texto, destaque e botão),
 * todos com pares aprovados. "capa" é o padrão da marca: Amarelo + Azul escuro.
 */
export const BB_SCHEMES = [
  { id: 'capa', label: 'Amarelo institucional', bg: P.amareloInstitucional, title: P.azulEscuro, text: P.azulEscuro, accent: P.roxoEscuro, button: P.azulEscuro, buttonText: P.amareloInstitucional },
  { id: 'azul', label: 'Azul institucional', bg: P.azulInstitucional, title: P.branco, text: P.branco, accent: P.branco, button: P.amareloInstitucional, buttonText: P.azulEscuro },
  { id: 'profundo', label: 'Azul escuro', bg: P.azulEscuro, title: P.branco, text: P.branco, accent: P.amareloInstitucional, button: P.amareloInstitucional, buttonText: P.azulEscuro },
  { id: 'claro', label: 'Branco', bg: P.branco, title: P.azulEscuro, text: P.azulEscuro, accent: P.roxoEscuro, button: P.azulEscuro, buttonText: P.branco },
  { id: 'suave', label: 'Amarelo claro', bg: P.amareloClaro, title: P.azulEscuro, text: P.azulEscuro, accent: P.roxoEscuro, button: P.azulEscuro, buttonText: P.amareloClaro },
  { id: 'roxo', label: 'Roxo escuro', bg: P.roxoEscuro, title: P.branco, text: P.branco, accent: P.amareloInstitucional, button: P.amareloInstitucional, buttonText: P.azulEscuro },
];

/** Tipografia corporativa BB (o "Alfabeto Especial" é exclusivo da logomarca e nunca é usado). */
export const BB_FONTS = {
  title: { family: 'BancoDoBrasil Titulos', weights: { 500: 'BancoDoBrasilTitulos-Medium', 700: 'BancoDoBrasilTitulos-Bold', 800: 'BancoDoBrasilTitulos-XBold' } },
  text: { family: 'BancoDoBrasil Textos', weights: { 400: 'BancoDoBrasilTextos-Regular', 500: 'BancoDoBrasilTextos-Medium', 700: 'BancoDoBrasilTextos-Bold' } },
  fallback: 'Helvetica, Arial, sans-serif',
};

/** Tom de voz BB: inteligentemente simples, sempre relevante, incrivelmente humano, super encorajador. */
export const BB_VOICE = {
  traits: ['Inteligentemente simples', 'Sempre relevante', 'Incrivelmente humano', 'Super encorajador'],
  rules: [
    'Frases curtas e diretas; verbo no imperativo quando houver ação.',
    'Fale com a pessoa (você) e em conjunto (juntos, a gente).',
    'Termos simples no lugar do jargão financeiro.',
    'Positivo sem exagero: incentive e celebre conquistas.',
    'Em temas delicados, primeiro atenção e alternativas; depois a oferta.',
  ],
};

/* ------------------------------------------------------------ contraste */

const lin = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const rgb = (hex) => {
  const h = String(hex).replace('#', '').slice(-6);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
export const norm = (hex) => '#' + String(hex).replace('#', '').slice(-6).toUpperCase();

export function luminance(hex) {
  const [r, g, b] = rgb(hex).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste WCAG 2.x. */
export function contrast(a, b) {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Cor efetiva de uma cor com transparência sobre um fundo. */
export function mix(front, back, alpha) {
  const f = rgb(front);
  const b = rgb(back);
  return '#' + f.map((v, i) => Math.round(alpha * v + (1 - alpha) * b[i]).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export const isBBColor = (hex) => Object.values(BB_PALETTE).includes(norm(hex));

/**
 * Cor de texto para um fundo da paleta: a preferida se for par aprovado; senão
 * a primeira aprovada. Fundo fora da paleta: a cor da paleta de maior contraste
 * (Preto só se nada passar).
 */
export function textOn(bg, preferred) {
  const b = norm(bg);
  const ok = BB_TEXT_ON[b] ?? Object.values(BB_PALETTE).filter((c) => contrast(c, b) >= MIN_TEXT);
  if (preferred && ok.includes(norm(preferred))) return norm(preferred);
  if (ok.length) return ok[0];
  return contrast(BB_PRETO, b) >= MIN_TEXT ? BB_PRETO : Object.values(BB_PALETTE).sort((x, y) => contrast(y, b) - contrast(x, b))[0];
}

/**
 * Texto sobre fundo variável (foto, gradiente): cor que passa 4,5:1 contra
 * TODAS as amostras; null se nenhuma passa (aí use a proteção de contraste:
 * caixa Azul escuro com texto Branco, 8,94:1).
 */
export function textOnSamples(samples, preferred) {
  const cands = [...Object.values(BB_PALETTE)];
  const passing = cands.filter((c) => samples.every((s) => contrast(c, s) >= MIN_TEXT));
  if (!passing.length) return null;
  if (preferred && passing.includes(norm(preferred))) return norm(preferred);
  return passing.sort((x, y) => Math.min(...samples.map((s) => contrast(y, s))) - Math.min(...samples.map((s) => contrast(x, s))))[0];
}

/** Proteção de contraste para texto sobre foto. */
export const BB_PROTECTION = { bg: P.azulEscuro, text: P.branco };

/** Cores de série/forma gráfica com >= 3:1 sobre o fundo, na ordem do guia. */
export function graphicColors(bg) {
  const order = [P.azulInstitucional, P.azulEscuro, P.roxoEscuro, P.amareloInstitucional, P.verdeEscuro, P.azulClaro, P.rosaEscuro, P.roxoClaro, P.verdeClaro, P.rosaClaro];
  return order.filter((c) => contrast(c, bg) >= MIN_GRAPHIC);
}

/** Versões da logomarca BB permitidas por fundo (o arquivo oficial vem do usuário; nunca recolorir). */
export const BB_LOGO_RULES = {
  centralHorizontalBackgrounds: [P.amareloInstitucional, P.azulInstitucional, P.branco],
  clearSpace: 0.5, // metade da altura da logomarca em todos os lados
  minDigitalPx: { simbolo: 25, central: 70, horizontal: 140 },
  minPrintMm: { simbolo: 10, central: 25, horizontal: 40 },
};
