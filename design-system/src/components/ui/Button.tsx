import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { shadows } from '../../data/tokens.js';
import { hoverTransition } from '../../lib/motion';

type Variant = 'primary' | 'action' | 'secondary';
type Size = 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  // Primário: preenchimento roxo elétrico, texto branco, brilho roxo
  primary: 'bg-primary text-text-primary shadow-glow-purple',
  // Ação: amarelo ouro — uma por tela, para a ação mais importante
  action: 'bg-accent text-background shadow-glow-yellow',
  // Secundário: contorno, sem preenchimento
  secondary: 'border border-secondary bg-transparent text-text-primary hover:border-primary',
};

const HOVER_SHADOW: Record<Variant, string | undefined> = {
  primary: '0 0 30px rgba(74, 0, 224, 0.7)',
  action: shadows['glow-yellow-strong'],
  secondary: shadows['glow-purple'],
};

const SIZES: Record<Size, string> = {
  md: 'h-12 px-space-3 text-body',
  lg: 'h-14 px-space-4 text-body-large',
};

type Props = HTMLMotionProps<'button'> & { variant?: Variant; size?: Size };

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', className = '', disabled, children, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      disabled={disabled}
      whileHover={disabled ? undefined : { scale: 1.02, boxShadow: HOVER_SHADOW[variant] }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={hoverTransition}
      className={`inline-flex items-center justify-center gap-space-1 rounded-md font-sans font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
});
