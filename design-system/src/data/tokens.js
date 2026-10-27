// Fonte única dos tokens do design system Gove.
// Usada pelo tailwind.config.js (classes utilitárias) e pela documentação (src/).

/**
 * Papéis de cor da interface. Os valores (HEX) vêm de `themes` — o mesmo papel
 * muda de cor entre o tema claro (padrão) e o escuro. Nunca usar preto puro (#000).
 */
export const colors = {
  background: { name: 'Fundo', usage: 'Fundo de toda a interface: Branco no claro, Noite no escuro.' },
  surface: { name: 'Superfície', usage: 'Cards, modais e popovers: Branco no claro, Grafite no escuro.' },
  secondary: { name: 'Sutil', usage: 'Bordas, divisores e preenchimentos de hover. Contraste baixo: sempre com outra pista visual.' },
  'text-primary': { name: 'Texto forte', usage: 'Títulos e ênfases.' },
  'text-secondary': { name: 'Texto', usage: 'Corpo de texto e parágrafos.' },
  'text-muted': { name: 'Texto apagado', usage: 'Somente desabilitado e placeholder.' },
  primary: { name: 'Roxo', usage: 'Botões principais e elementos de marca. Texto sobre ele: on-primary (branco).' },
  accent: { name: 'Amarelo', usage: 'Uma ação importante por tela. Texto sobre ele: on-accent (Noite).' },
  highlight: { name: 'Destaque', usage: 'Ícones e textos em destaque: Roxo no claro, Amarelo no escuro.' },
  link: { name: 'Link', usage: 'Links e itens ativos em texto: Roxo no claro, Ciano no escuro (8,2:1 sobre o Noite).' },
  lilac: { name: 'Lavanda', usage: 'Bordas em hover e brilho neon. Não usar como texto sobre o branco.' },
  cyan: { name: 'Ciano', usage: 'Destaques informativos e séries de gráficos.' },
  blue: { name: 'Azul', usage: 'Elementos informativos e séries de gráficos secundárias.' },
  'on-primary': { name: 'Sobre o primary', usage: 'Texto e ícones sobre o Roxo.' },
  'on-accent': { name: 'Sobre o accent', usage: 'Texto e ícones sobre o Amarelo.' },
  success: { name: 'Sucesso', usage: 'Somente estado de interface (concluído, enviado). Nunca em peças de marca.' },
  error: { name: 'Erro', usage: 'Somente estado de interface (campo inválido, falha). Nunca em peças de marca.' },
};

/**
 * Temas da interface. Claro é o padrão (predominantemente branco); escuro sob demanda.
 * Cada papel vira uma variável CSS (--c-<papel>) e uma classe Tailwind.
 */
export const themes = {
  light: {
    background: '#FFFFFF',
    surface: '#F4F4F4',
    secondary: '#E3D8F3', // bordas e preenchimentos sutis (tinta do Lavanda)
    'text-primary': '#20133D',
    'text-secondary': '#2F3539',
    'text-muted': '#5B6770',
    primary: '#3D0099',
    accent: '#FFC72C',
    highlight: '#3D0099', // ênfase em texto e ícones (amarelo não tem contraste no branco)
    link: '#3D0099',
    lilac: '#A278DA',
    cyan: '#5AC2CD',
    blue: '#16499F',
    'on-primary': '#FFFFFF',
    'on-accent': '#20133D',
    success: '#1E7A46',
    error: '#B42318',
  },
  dark: {
    // Tema Noturno do design system Gove: a paleta não tem um segundo branco (hierarquia por tamanho e peso)
    background: '#20133D',
    surface: '#2F3539',
    secondary: '#351F65',
    'text-primary': '#F4F4F4',
    'text-secondary': '#F4F4F4',
    'text-muted': '#5B6770',
    primary: '#3D0099',
    accent: '#FFC72C',
    highlight: '#FFC72C',
    link: '#5AC2CD', // Lavanda só em texto grande sobre o Noite
    lilac: '#A278DA',
    cyan: '#5AC2CD',
    blue: '#16499F',
    'on-primary': '#F4F4F4',
    'on-accent': '#20133D',
    success: '#75E0A7',
    error: '#FDA29B',
  },
};

/** Sombras por tema (variáveis --shadow-<nome>). */
export const themeShadows = {
  light: {
    sm: '0 1px 3px rgba(32, 19, 61, 0.12)',
    md: '0 8px 24px rgba(32, 19, 61, 0.10)',
    'glow-purple': '0 8px 24px rgba(61, 0, 153, 0.18)',
    'glow-purple-strong': '0 10px 30px rgba(61, 0, 153, 0.30)',
    'glow-yellow': '0 6px 18px rgba(255, 199, 44, 0.45)',
    'glow-yellow-strong': '0 8px 26px rgba(255, 199, 44, 0.7)',
    'card-hover': '0 12px 28px rgba(32, 19, 61, 0.14), 0 0 0 1px rgba(162, 120, 218, 0.5)',
  },
  dark: {
    sm: '0 2px 4px rgba(0,0,0,0.5)',
    md: '0 8px 16px rgba(0,0,0,0.6)',
    'glow-purple': '0 0 20px rgba(162, 120, 218, 0.45)',
    'glow-purple-strong': '0 0 28px rgba(162, 120, 218, 0.65)',
    'glow-yellow': '0 0 15px rgba(255, 199, 44, 0.5)',
    'glow-yellow-strong': '0 0 24px rgba(255, 199, 44, 0.7)',
    'card-hover': '0 8px 16px rgba(0,0,0,0.6), 0 0 20px rgba(162, 120, 218, 0.4)',
  },
};

/** Paleta institucional oficial (color.adobe.com), na ordem do manual. */
export const brandPalette = [
  '#FFC72C', '#3D0099', '#351F65', '#F4F4F4', '#2F3539',
  '#A278DA', '#5B6770', '#20133D', '#5AC2CD', '#16499F',
];

export const fonts = {
  display: ['Montserrat', 'Helvetica', 'Arial', 'sans-serif'],
  sans: ['Inter', 'Helvetica', 'Arial', 'sans-serif'],
};

/** Escala tipográfica Major Third (1.250): [tamanho, { altura de linha, peso, tracking }] — design system Gove. */
export const typeScale = {
  display: ['64px', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
  h1: ['48px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.015em' }],
  h2: ['32px', { lineHeight: '1.3', fontWeight: '600' }],
  h3: ['24px', { lineHeight: '1.4', fontWeight: '600' }],
  'body-large': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
  body: ['16px', { lineHeight: '1.5', fontWeight: '400' }],
  caption: ['14px', { lineHeight: '1.4', fontWeight: '500' }],
};

/** Espaçamento em múltiplos de 8px. */
export const spacing = {
  'space-1': '8px',
  'space-2': '16px',
  'space-3': '24px',
  'space-4': '32px',
  'space-6': '48px',
  'space-8': '64px',
  'space-12': '96px',
};

export const radius = { sm: '4px', md: '8px', lg: '16px', full: '9999px' };

/** Movimento: entrada em 600ms com ease-out exponencial; estados entre 200 e 300ms. */
export const motion = {
  ease: [0.16, 1, 0.3, 1],
  entry: 0.6,
  stagger: 0.07,
  hover: 0.25,
};
