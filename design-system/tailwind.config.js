import plugin from 'tailwindcss/plugin';
import { fonts, radius, spacing, themeShadows, themes, typeScale } from './src/data/tokens.js';

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};
const vars = (theme) => ({
  ...Object.fromEntries(Object.entries(themes[theme]).map(([k, v]) => [`--c-${k}`, rgb(v)])),
  ...Object.fromEntries(Object.entries(themeShadows[theme]).map(([k, v]) => [`--shadow-${k}`, v])),
  colorScheme: theme,
});

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js}'],
  theme: {
    extend: {
      // Cada papel lê a variável do tema ativo (claro por padrão; [data-gove-theme="dark"] para o escuro)
      colors: Object.fromEntries(Object.keys(themes.light).map((k) => [k, `rgb(var(--c-${k}) / <alpha-value>)`])),
      fontFamily: fonts,
      fontSize: typeScale,
      spacing,
      borderRadius: radius,
      boxShadow: Object.fromEntries(Object.keys(themeShadows.light).map((k) => [k, `var(--shadow-${k})`])),
      transitionTimingFunction: { entry: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ':root': vars('light'),
        ':root[data-gove-theme="dark"]': vars('dark'),
        // Blocos que ficam sempre escuros (ex.: faixa noturna), independentemente do tema
        '.theme-dark': vars('dark'),
      });
    }),
  ],
};
