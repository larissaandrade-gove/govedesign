import type { Transition, Variants } from 'framer-motion';
import { motion as m } from '../data/tokens.js';

export const EASE = m.ease as [number, number, number, number];

/** Entrada: Fade In + Slide Up (opacidade 0→1, Y 20px→0) em 600ms. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: m.entry, ease: EASE } },
};

/** Grids em cascata: 70ms entre itens (faixa de 50–100ms). */
export const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: m.stagger } },
};

/** Estados de hover: 250ms (faixa de 200–300ms). */
export const hoverTransition: Transition = { duration: m.hover, ease: EASE };

/** Dispara a animação só quando o bloco entra no viewport (Intersection Observer). */
export const inView = { initial: 'hidden', whileInView: 'visible', viewport: { once: true, amount: 0.15 } } as const;

/** Contraste WCAG entre duas cores HEX. */
export function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
