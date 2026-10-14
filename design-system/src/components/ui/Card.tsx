import { motion, type HTMLMotionProps } from 'framer-motion';
import { hoverTransition } from '../../lib/motion';

/** Card: surface com borda sutil; no hover sobe 4px, escala 1.02 e a borda vai para o primary. */
export function Card({ className = '', interactive = true, children, ...rest }: HTMLMotionProps<'div'> & { interactive?: boolean }) {
  return (
    <motion.div
      whileHover={interactive ? { scale: 1.02, y: -4, borderColor: '#4A00E0', boxShadow: '0 8px 16px rgba(0,0,0,0.6)' } : undefined}
      transition={hoverTransition}
      className={`rounded-lg border border-secondary bg-surface p-space-3 shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
