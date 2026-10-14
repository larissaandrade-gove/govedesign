import { motion, type HTMLMotionProps } from 'framer-motion';
import { fadeUp, inView, stagger } from '../lib/motion';

/** Bloco que entra com Fade In + Slide Up quando aparece no viewport. */
export function Reveal({ children, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <motion.div variants={fadeUp} {...inView} {...rest}>
      {children}
    </motion.div>
  );
}

/** Container de grid: os filhos (RevealItem) entram em cascata. */
export function StaggerGrid({ children, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <motion.div variants={stagger} {...inView} {...rest}>
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, ...rest }: HTMLMotionProps<'div'>) {
  return (
    <motion.div variants={fadeUp} {...rest}>
      {children}
    </motion.div>
  );
}
