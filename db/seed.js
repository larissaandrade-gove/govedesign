// Valores iniciais de `brand_tokens`.
//
// Os valores marcados com `placeholder: true` são PROVISÓRIOS: foram tirados do
// design system Gove (tokens "Noturno") para que o revisor funcione desde o
// primeiro boot, mas precisam ser confirmados pela Gove Digital. Enquanto um
// token estiver como placeholder, o relatório avisa que a checagem usou um
// valor provisório.
//
// Para alterar depois do primeiro boot, use a API (PUT /api/tokens/:category/:name)
// ou edite aqui e rode `npm run db:init -- --reseed`.

// TODO(gove): confirmar a paleta HEX oficial da Gove Digital. Valores atuais
// vêm do design system (tema Noturno). Remover `placeholder` ao confirmar.
export const COLORS = [
  { name: 'azul-noite', hex: '#1A153A', role: 'background', placeholder: true },
  { name: 'cinza-esverdeado', hex: '#2A3233', role: 'surface', placeholder: true },
  { name: 'roxo-eletrico', hex: '#4A00E0', role: 'primary', placeholder: true },
  { name: 'roxo-escuro', hex: '#3A2E6B', role: 'secondary', placeholder: true },
  { name: 'amarelo-ouro', hex: '#FFC72C', role: 'accent', placeholder: true },
  { name: 'branco', hex: '#FFFFFF', role: 'text-strong', placeholder: true },
  { name: 'off-white', hex: '#EAEAEA', role: 'text-body', placeholder: true },
  { name: 'cinza-azulado', hex: '#5C6B73', role: 'text-muted', placeholder: true },
  { name: 'roxo-claro', hex: '#9D8CFF', role: 'link', placeholder: true },
  { name: 'roxo-logo', hex: '#3E0099', role: 'brand-purple', placeholder: true },
  { name: 'amarelo-logo', hex: '#FEC526', role: 'brand-yellow', placeholder: true },
];

// TODO(gove): cadastrar os gradientes aprovados (stops + ângulo em graus,
// 0° = da esquerda para a direita, 90° = de cima para baixo). O gradiente
// abaixo é apenas um exemplo para o revisor ter com o que comparar.
export const GRADIENTS = [
  {
    name: 'exemplo-roxo-noite',
    angle: 135,
    stops: [
      { offset: 0, hex: '#4A00E0' },
      { offset: 1, hex: '#1A153A' },
    ],
    placeholder: true,
  },
];

// Variações aprovadas da Montserrat (Regular, Bold, Italic, Black).
// O design system também usa Inter no corpo de texto; se ela for aprovada para
// peças, adicione linhas com family "Inter" aqui.
export const FONTS = [
  { name: 'montserrat-regular', family: 'Montserrat', weight: 400, style: 'normal' },
  { name: 'montserrat-bold', family: 'Montserrat', weight: 700, style: 'normal' },
  { name: 'montserrat-italic', family: 'Montserrat', weight: 400, style: 'italic' },
  { name: 'montserrat-black', family: 'Montserrat', weight: 900, style: 'normal' },
];

// TODO(gove): lista de ícones aprovados. `set` é "lucide" ou "phosphor"; `name`
// é o nome kebab-case do ícone no pacote (ex.: lucide "arrow-right", phosphor
// "arrow-right"). Para Phosphor, `weight` é regular | bold | fill | duotone |
// light | thin. Os itens abaixo são exemplos.
export const ICONS = [
  { name: 'lucide:arrow-right', set: 'lucide', icon: 'arrow-right', placeholder: true },
  { name: 'lucide:check', set: 'lucide', icon: 'check', placeholder: true },
  { name: 'lucide:calendar', set: 'lucide', icon: 'calendar', placeholder: true },
  { name: 'phosphor:arrow-right:regular', set: 'phosphor', icon: 'arrow-right', weight: 'regular', placeholder: true },
];

// TODO(gove): arquivos oficiais da logomarca (duas versões/cores). Coloque os
// arquivos em db/assets/logos/ com exatamente estes nomes e preencha `sha256`
// (rode `npm run db:init -- --hash-logos` para calcular automaticamente).
// `background` indica sobre qual fundo a versão deve ser usada e `colors` as
// cores que a versão deve ter.
export const LOGOS = [
  {
    name: 'versao-fundo-escuro',
    file: 'gove-logo-branco-amarelo.png',
    background: 'dark',
    colors: ['#FFFFFF', '#FEC526'],
    placeholder: true,
  },
  {
    name: 'versao-fundo-claro',
    file: 'gove-logo-roxo.png',
    background: 'light',
    colors: ['#3E0099', '#FEC526'],
    placeholder: true,
  },
];

// TODO(gove): confirmar as margens mínimas por tipo de peça.
// minMarginRatio = fração do menor lado do artboard; a margem mínima usada é o
// maior valor entre minMarginRatio × menor lado e minMarginPx.
export const MARGINS = [
  { name: 'flyer', minMarginRatio: 0.05, minMarginPx: 0, minSpacingPx: 24, placeholder: true },
  { name: 'post', minMarginRatio: 0.06, minMarginPx: 48, minSpacingPx: 24, placeholder: true },
  { name: 'story', minMarginRatio: 0.08, minMarginPx: 64, minSpacingPx: 24, placeholder: true },
  { name: 'slide', minMarginRatio: 0.05, minMarginPx: 48, minSpacingPx: 32, placeholder: true },
  { name: 'banner', minMarginRatio: 0.04, minMarginPx: 16, minSpacingPx: 16, placeholder: true },
];

export const SETTINGS = [
  {
    name: 'color_tolerance',
    value: {
      // ΔE2000 ≤ pass → mesma cor; ≤ warn → próxima, mas fora do tom; > warn → fora da paleta
      deltaEPass: 3,
      deltaEWarn: 6,
      gradientAngleToleranceDeg: 5,
      gradientOffsetTolerance: 0.05,
    },
  },
  {
    name: 'contrast',
    value: {
      // WCAG 2.x: 4.5:1 texto normal, 3:1 texto grande (≥ 24px, ou ≥ 18.66px em negrito)
      minNormal: 4.5,
      minLarge: 3,
      largeTextPx: 24,
      largeBoldTextPx: 18.66,
    },
  },
  {
    name: 'qrcode',
    value: {
      // Regra fixa Gove: QR code sempre sobre fundo branco sólido.
      backgroundHex: '#FFFFFF',
      backgroundMaxDeltaE: 3,
      quietZoneModules: 4,
      minSizePx: 150,
      minModuleContrast: 7,
      // Padrão para QR codes gerados pelo revisor
      generate: { dark: '#1A153A', light: '#FFFFFF', errorCorrectionLevel: 'M', margin: 4, width: 600 },
    },
  },
  {
    name: 'icon_policy',
    // "list" = só os ícones cadastrados; "set" = qualquer ícone Lucide/Phosphor
    value: { mode: 'list' },
  },
  {
    name: 'raster',
    value: {
      // Quantização da paleta dominante no Modo B
      sampleSize: 96,
      clusters: 8,
      minShare: 0.02,
      offPaletteWarnShare: 0.05,
      offPaletteFailShare: 0.2,
    },
  },
];

export function seedRows() {
  const rows = [];
  for (const c of COLORS) {
    rows.push(['color', c.name, { hex: c.hex, role: c.role }, c.placeholder]);
  }
  for (const g of GRADIENTS) {
    rows.push(['gradient', g.name, { angle: g.angle, stops: g.stops }, g.placeholder]);
  }
  for (const f of FONTS) {
    rows.push(['font', f.name, { family: f.family, weight: f.weight, style: f.style }, f.placeholder]);
  }
  for (const i of ICONS) {
    rows.push(['icon', i.name, { set: i.set, name: i.icon, weight: i.weight ?? null }, i.placeholder]);
  }
  for (const l of LOGOS) {
    rows.push(['logo', l.name, { file: l.file, sha256: null, background: l.background, colors: l.colors }, l.placeholder]);
  }
  for (const m of MARGINS) {
    const { name, placeholder, ...value } = m;
    rows.push(['margin', name, value, placeholder]);
  }
  for (const s of SETTINGS) {
    rows.push(['setting', s.name, s.value, false]);
  }
  return rows.map(([category, name, value, placeholder]) => ({
    category,
    name,
    value,
    placeholder: Boolean(placeholder),
  }));
}
