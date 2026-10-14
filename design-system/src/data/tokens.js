// Fonte única dos tokens do design system Gove.
// Usada pelo tailwind.config.js (classes utilitárias) e pela documentação (src/).

/** Cores de interface — valores exatos. Nunca usar preto puro (#000). */
export const colors = {
  primary: { hex: '#4A00E0', name: 'Roxo Elétrico', usage: 'Botões principais e elementos de marca. Texto sobre ele: branco.' },
  secondary: { hex: '#3A2E6B', name: 'Roxo Escuro', usage: 'Hover, bordas de cards e elementos secundários. Contraste baixo: sempre com outra pista visual.' },
  background: { hex: '#1A153A', name: 'Azul Noite Profundo', usage: 'Fundo de toda a interface — o chão da cidade à noite.' },
  surface: { hex: '#2A3233', name: 'Cinza Esverdeado Escuro', usage: 'Cards, modais e popovers sobre o background.' },
  'text-primary': { hex: '#FFFFFF', name: 'Branco Puro', usage: 'Títulos e ênfases.' },
  'text-secondary': { hex: '#EAEAEA', name: 'Off-White', usage: 'Corpo de texto e parágrafos.' },
  'text-muted': { hex: '#5C6B73', name: 'Cinza Azulado', usage: 'Somente desabilitado e placeholder (3,1:1 sobre o background).' },
  accent: { hex: '#FFC72C', name: 'Amarelo Ouro', usage: 'Uma ação importante por tela, foco e destaques. Texto sobre ele: background.' },
};

/** Paleta institucional do manual de marca (documento "Alinhamento para Branding"). */
export const brandPalette = [
  '#FFC72C', '#3D0099', '#351F65', '#20133D', '#2F3539', '#5B6770', '#F4F4F4', '#FFFFFF',
  '#C37BFC', '#923BFB', '#6C1CF4', '#3C08BE', '#26048D', '#1C056B',
];

export const fonts = {
  display: ['Montserrat', 'Helvetica', 'Arial', 'sans-serif'],
  sans: ['Inter', 'Helvetica', 'Arial', 'sans-serif'],
};

/** Escala tipográfica: [tamanho, { altura de linha, peso, tracking }]. */
export const typeScale = {
  display: ['64px', { lineHeight: '1.05', fontWeight: '900', letterSpacing: '-0.02em' }],
  h1: ['48px', { lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.015em' }],
  h2: ['32px', { lineHeight: '1.2', fontWeight: '700' }],
  h3: ['24px', { lineHeight: '1.3', fontWeight: '700' }],
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

export const shadows = {
  sm: '0 2px 4px rgba(0,0,0,0.5)',
  md: '0 8px 16px rgba(0,0,0,0.6)',
  'glow-purple': '0 0 20px rgba(74, 0, 224, 0.4)',
  'glow-yellow': '0 0 15px rgba(255, 199, 44, 0.5)',
  // Estado de hover do CTA amarelo (glow intensificado)
  'glow-yellow-strong': '0 0 28px rgba(255, 199, 44, 0.75)',
};

/** Movimento: entrada em 600ms com ease-out exponencial; estados entre 200 e 300ms. */
export const motion = {
  ease: [0.16, 1, 0.3, 1],
  entry: 0.6,
  stagger: 0.07,
  hover: 0.25,
};
