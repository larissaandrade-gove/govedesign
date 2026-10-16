// Gove Print Studio — tokens de design do Kit de Boas-Vindas.
// Módulo puro (sem dependências): usado pelo preview no navegador e pelo PDF no servidor.

export const MM_TO_PT = 2.834645669;
export const mmToPt = (mm) => mm * MM_TO_PT;
export const ptToMm = (pt) => pt / MM_TO_PT;

/** Sangria e área de segurança iguais nos 4 layouts (mm). */
export const BLEED_MM = 5;
export const SAFE_MM = 5;

/**
 * Cores: HEX para tela e CMYK [c, m, y, k] (0–100) para o PDF.
 * Os CMYK dos verdes são conversões aproximadas do HEX de tela.
 * TODO_VALIDAR_GRAFICA: confirmar CMYK/Pantone oficial com a gráfica antes da primeira produção.
 */
export const COLORS = {
  verde: { name: 'Verde principal', hex: '#25D366', cmyk: [82, 0, 52, 17] }, // TODO_VALIDAR_GRAFICA
  verdeEscuro1: { name: 'Verde escuro 1', hex: '#1AA652', cmyk: [84, 0, 59, 35] }, // TODO_VALIDAR_GRAFICA
  verdeEscuro2: { name: 'Verde escuro 2', hex: '#0F7A3B', cmyk: [87, 0, 63, 52] }, // TODO_VALIDAR_GRAFICA
  // Início do gradiente escurecido (decisão da Gove): com #25D366 → #1AA652 nem branco
  // (1,98:1) nem verde-escuro-2 (1,71:1) atingiam o contraste mínimo do H1.
  verdeGradiente: { name: 'Verde gradiente', hex: '#128541', cmyk: [87, 0, 51, 48] }, // TODO_VALIDAR_GRAFICA
  branco: { name: 'Branco', hex: '#FFFFFF', cmyk: [0, 0, 0, 0] },
  // Preto só K100 para textos pequenos/institucionais e módulos do QR (evita borrão de registro)
  preto: { name: 'Preto K100', hex: '#1D1D1B', cmyk: [0, 0, 0, 100] },
  // Preto rico apenas para blocos sólidos grandes (moldura do mockup)
  pretoRico: { name: 'Preto rico', hex: '#0B0C0C', cmyk: [60, 40, 40, 100] },
  // Fundo da tela do mockup quando ainda não há imagem
  cinzaTela: { name: 'Cinza tela', hex: '#E6E7E8', cmyk: [0, 0, 0, 10] },

  // ---- Referências finais (Kit Itupeva) e tela gerada do mockup -----------------
  // CMYK destes tokens: conversão ICC do HEX pelo perfil CMYK padrão do libvips/sharp
  // (SWOP coated), arredondada. TODO_VALIDAR_GRAFICA: confirmar com a gráfica.
  // Verde do WhatsApp (#25D366) para o cabeçalho e os ícones da tela do celular.
  // O token `verde` acima tem o mesmo HEX com conversão ingênua (RGB→CMYK sem perfil);
  // `whatsapp` é o equivalente ICC e é o usado nas peças novas.
  whatsapp: { name: 'Verde WhatsApp', hex: '#25D366', cmyk: [51, 0, 86, 0] },
  // Degradê "folha" das referências (verde amarelado, como a foto do Kit Itupeva),
  // escurecido para o branco passar 4,5:1 já na parada mais clara (4,7:1).
  folhaClara: { name: 'Folha clara', hex: '#23852F', cmyk: [75, 0, 98, 21] },
  folhaMedia: { name: 'Folha média', hex: '#1B6B29', cmyk: [79, 0, 98, 41] },
  verdeProfundo: { name: 'Verde profundo', hex: '#0F4419', cmyk: [82, 4, 100, 67] },
  // Faixa do número: branco em negrito ≥ 18 pt pede 3:1 (3,6:1)
  folhaFaixa: { name: 'Folha (faixa do número)', hex: '#2E9B3A', cmyk: [73, 0, 95, 4] },
  // Texto escuro institucional e textos secundários da tela do celular
  grafite: { name: 'Grafite Gove', hex: '#2F3539', cmyk: [37, 9, 29, 90] },
  cinzaTexto: { name: 'Cinza Gove', hex: '#5B6770', cmyk: [34, 13, 10, 58] },
  cinzaClaro: { name: 'Cinza claro (bordas)', hex: '#D9DCDF', cmyk: [0, 0, 0, 15] },
  cinzaAro: { name: 'Aro do celular', hex: '#8A9399', cmyk: [0, 0, 0, 50] },
  azulLink: { name: 'Azul Gove (links)', hex: '#16499F', cmyk: [95, 71, 0, 0] },
  // Cores da logomarca Gove (brand/logos.js)
  roxoGove: { name: 'Roxo Gove', hex: '#3E0099', cmyk: [94, 98, 0, 0] },
  amareloGove: { name: 'Amarelo Gove', hex: '#FEC526', cmyk: [0, 15, 92, 3] },
};

/**
 * Fundo dos 4 layouts: gradiente suave a 135°, sem paradas intermediárias.
 * Original do briefing: verde (#25D366) → verdeEscuro1 (#1AA652); escurecido para
 * o texto branco passar em 4,5:1 em toda a área (4,7:1 a 5,4:1).
 */
export const GRADIENT = { from: 'verdeGradiente', to: 'verdeEscuro2', angle: 135 };

/**
 * Fundo das peças finais (referências do Kit Itupeva): degradê "fotográfico" —
 * radial a partir do canto superior direito (mais claro) até o canto inferior
 * esquerdo (mais profundo). Sólido (sem transparência), em CMYK. A parada mais
 * clara tem o mesmo contraste do gradiente aprovado (#23852F, 4,7:1 com branco): todo texto
 * branco continua ≥ 4,5:1 — o contraste é conferido amostrando o degradê sob cada linha.
 * cx/cy/r em frações da largura/altura/diagonal do formato final (corte).
 */
export const BACKGROUND = {
  kind: 'radial',
  cx: 0.92,
  cy: -0.04,
  r: 1.08,
  stops: [
    [0, 'folhaClara'],
    [0.35, 'folhaClara'],
    [0.75, 'folhaMedia'],
    [1, 'verdeProfundo'],
  ],
};

/** Cores candidatas para texto, escolhidas automaticamente por contraste. */
export const TEXT_CANDIDATES = ['branco', 'verdeEscuro2'];

/** Montserrat embutida (arquivos .ttf em server/fonts). */
export const FONT_FILES = {
  regular: 'Montserrat-Regular.ttf',
  semibold: 'Montserrat-SemiBold.ttf',
  bold: 'Montserrat-Bold.ttf',
  black: 'Montserrat-Black.ttf',
};
export const FONT_WEIGHTS = { regular: 400, semibold: 600, bold: 700, black: 900 };

/**
 * Escala tipográfica (Major Third, base 12pt) — valores do Flyer A4.
 * Os outros layouts aplicam um fator de escala, com piso de legibilidade.
 */
export const TYPE = {
  h1: { size: 36, weight: 'black', min: 11 },
  h3: { size: 22, weight: 'bold', min: 9 },
  h4: { size: 16, weight: 'semibold', min: 7 },
  body: { size: 11, weight: 'regular', min: 6 },
  number: { size: 24, weight: 'black', min: 11 },
};

/** Fator de altura de linha da Montserrat (ascendente + descendente ≈ 1,219 em). */
export const LINE_HEIGHT_EM = 1.219;

/** Altura de linha usada nos títulos das peças finais (as referências usam ~1,0–1,05 em). */
export const TITLE_LEADING_EM = 1.04;

export const QR_MIN_MM = 20;
export const QR_QUIET_MM = 4;
export const IMAGE_MIN_DPI = 300;

// ---------------------------------------------------------------- contraste

function channel(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function hexRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Mistura duas cores HEX (t = 0 → a, 1 → b), em sRGB. */
export function mixHex(a, b, t) {
  const A = hexRgb(a);
  const B = hexRgb(b);
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

export function luminance(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Escolhe a cor de texto (branco ou verde-escuro-2) que maximiza o pior
 * contraste contra todas as cores de fundo informadas (ex.: as duas pontas do gradiente).
 */
export function pickTextColor(bgHexes) {
  let best = null;
  for (const key of TEXT_CANDIDATES) {
    const worst = Math.min(...bgHexes.map((bg) => contrastRatio(COLORS[key].hex, bg)));
    if (!best || worst > best.ratio) best = { key, ratio: worst };
  }
  return best;
}

/** WCAG AA: 3:1 para texto grande (≥ 18pt em negrito), 4,5:1 para o restante. */
export function minContrastFor(sizePt, weight) {
  const bold = weight === 'bold' || weight === 'black';
  return sizePt >= 18 && bold ? 3 : 4.5;
}
