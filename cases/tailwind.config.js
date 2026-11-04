import plugin from 'tailwindcss/plugin';
import { fonts, radius, spacing, themeShadows, themes, typeScale } from '../design-system/src/data/tokens.js';

// Mesmos tokens do Design System (papéis de cor por tema, tipografia, grade de 8 px).
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
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
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
      // O runtime aplica data-theme="dark" (e a classe .dark) acompanhando o Design System
      addBase({ ':root': vars('light'), ':root[data-theme="dark"]': vars('dark') });
    }),
  ],
};
