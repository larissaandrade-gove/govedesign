import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { hoverTransition } from '../../lib/motion';

type Variant = 'primary' | 'action' | 'secondary';
type Size = 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  // Primário: preenchimento roxo elétrico, texto branco, brilho roxo
  primary: 'bg-primary text-on-primary shadow-glow-purple hover:shadow-glow-purple-strong',
  // Ação: amarelo ouro — uma por tela, para a ação mais importante
  action: 'bg-accent text-on-accent shadow-glow-yellow hover:shadow-glow-yellow-strong',
  // Secundário: contorno, sem preenchimento
  secondary: 'border border-secondary bg-transparent text-text-primary hover:border-primary hover:shadow-glow-purple',
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
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={hoverTransition}
      className={`inline-flex items-center justify-center gap-space-1 rounded-md font-sans font-semibold transition-[color,background-color,border-color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
});
