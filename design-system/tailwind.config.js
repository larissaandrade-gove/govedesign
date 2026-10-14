import { colors, fonts, radius, shadows, spacing, typeScale } from './src/data/tokens.js';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js}'],
  theme: {
    extend: {
      colors: Object.fromEntries(Object.entries(colors).map(([k, v]) => [k, v.hex])),
      fontFamily: fonts,
      fontSize: typeScale,
      spacing,
      borderRadius: radius,
      boxShadow: shadows,
      transitionTimingFunction: { entry: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    },
  },
  plugins: [],
};
