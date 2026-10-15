import { motion, type HTMLMotionProps } from 'framer-motion';
import { hoverTransition } from '../../lib/motion';

/** Card: surface com borda sutil; no hover sobe 4px, escala 1.02 e a borda vai para o primary. */
export function Card({ className = '', interactive = true, children, ...rest }: HTMLMotionProps<'div'> & { interactive?: boolean }) {
  return (
    <motion.div
      whileHover={interactive ? { scale: 1.02, y: -4 } : undefined}
      transition={hoverTransition}
      className={`rounded-lg border border-secondary bg-surface p-space-3 shadow-sm ${interactive ? 'transition-[border-color,box-shadow] duration-200 hover:border-lilac hover:shadow-card-hover' : ''} ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
