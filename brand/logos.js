// Logomarcas oficiais da Gove e a regra de aplicação por contraste.
//
// Arquivos em brand/logos/ (fundo transparente):
//   símbolo (proporção ~3:4, para espaços 1:1 — ícones, avatares, favicon):
//     gove-simbolo-cor.png     roxo #3E0099 + arco amarelo #FEC526
//     gove-simbolo-roxo.png    monocromático roxo (derivado do símbolo colorido,
//                              no mesmo padrão da versão monocromática do logotipo)
//     gove-simbolo-branco.png  branco
//   logotipo "gove" (proporção 2000×637 ≈ 3,14:1, para espaços horizontais):
//     gove-logo-cor.webp       roxo + arco amarelo
//     gove-logo-roxo.webp      roxo
//     gove-logo-branco.webp    branco
//     gove-logo-branco-amarelo.webp  branco + arco amarelo (fundos escuros)
//
// Regra: toda cor presente na logomarca precisa de contraste ≥ 4,5:1 com o
// fundo onde ela é aplicada. A versão colorida só entra quando roxo E amarelo
// passam; senão, a monocromática que passar. Sem nenhuma que passe, o fundo
// precisa mudar (o retorno traz `ok: false` e o melhor contraste possível).

export const LOGO_MIN_CONTRAST = 4.5;

export const LOGO_COLORS = { roxo: '#3E0099', amarelo: '#FEC526', branco: '#FFFFFF' };

export const LOGOS = {
  simbolo: {
    aspect: 806 / 1080,
    variants: [
      { id: 'cor', file: 'gove-simbolo-cor.png', colors: [LOGO_COLORS.roxo, LOGO_COLORS.amarelo] },
      { id: 'roxo', file: 'gove-simbolo-roxo.png', colors: [LOGO_COLORS.roxo] },
      { id: 'branco', file: 'gove-simbolo-branco.png', colors: [LOGO_COLORS.branco] },
    ],
  },
  logotipo: {
    aspect: 2000 / 637,
    variants: [
      { id: 'cor', file: 'gove-logo-cor.webp', colors: [LOGO_COLORS.roxo, LOGO_COLORS.amarelo] },
      { id: 'roxo', file: 'gove-logo-roxo.webp', colors: [LOGO_COLORS.roxo] },
      { id: 'branco', file: 'gove-logo-branco.webp', colors: [LOGO_COLORS.branco] },
      // Variação para fundos escuros: letras brancas + arco amarelo
      { id: 'branco-amarelo', file: 'gove-logo-branco-amarelo.webp', colors: [LOGO_COLORS.branco, LOGO_COLORS.amarelo] },
    ],
  },
};

function luminance(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * Escolhe a versão da logomarca para um fundo.
 * @param {string} background HEX do fundo (para fundos variados, passe a cor
 *   de pior caso — a de menor contraste com a logo — ou chame uma vez por cor).
 * @param {'simbolo'|'logotipo'} kind símbolo para espaços 1:1, logotipo para horizontais.
 * @param {{ preferColor?: boolean }} [opts] tenta a colorida primeiro (padrão: sim).
 * @returns {{ kind, variant, file, aspect, minContrast, ok }}
 */
export function pickLogo(background, kind = 'logotipo', { preferColor = true } = {}) {
  const family = LOGOS[kind];
  const order = preferColor ? family.variants : [...family.variants.slice(1), family.variants[0]];
  const scored = order.map((v) => ({ v, min: Math.min(...v.colors.map((c) => contrast(c, background))) }));
  const pass = scored.find((s) => s.min >= LOGO_MIN_CONTRAST);
  const best = pass ?? scored.reduce((a, b) => (b.min > a.min ? b : a));
  return { kind, variant: best.v.id, file: best.v.file, aspect: family.aspect, minContrast: best.min, ok: !!pass };
}

/** Símbolo para espaços quadrados (ícone, avatar); logotipo para faixas horizontais. */
export const kindForBox = (w, h) => (w / h < 1.6 ? 'simbolo' : 'logotipo');
