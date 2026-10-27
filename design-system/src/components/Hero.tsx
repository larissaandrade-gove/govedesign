import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from '@phosphor-icons/react';
import { Button } from './ui/Button';
import { CityBackdrop } from './CityBackdrop';
import { fadeUp, stagger } from '../lib/motion';
import { useTheme } from '../lib/theme';

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const [theme] = useTheme();
  const dark = theme === 'dark';
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  // Parallax sutil: a cidade anda mais devagar que o conteúdo (fator ~0.8)
  const cityY = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const glowY = useTransform(scrollYProgress, [0, 1], ['0%', '35%']);

  return (
    <section ref={ref} id="inicio" className={`relative isolate overflow-hidden bg-gradient-to-br from-background from-35% ${dark ? 'to-primary' : 'to-secondary'}`}>
      {/* Cidade (noturna no escuro, em tons de lavanda no claro) com overlay para manter a leitura */}
      <motion.div style={{ y: cityY }} className="absolute inset-x-0 bottom-0 -z-10 h-[85%]">
        <CityBackdrop className={`h-full w-full ${dark ? 'opacity-80' : 'opacity-70'}`} seed={11} theme={theme} />
      </motion.div>
      <motion.div
        style={{ y: glowY }}
        aria-hidden
        className={`absolute -right-24 top-10 -z-10 h-72 w-72 rounded-full ${dark ? 'bg-primary/50' : 'bg-lilac/30'} blur-[120px]`}
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/70 to-background/40 md:via-background/55 md:to-background/20" />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="gutter flex max-w-[1080px] flex-col gap-space-3 pb-space-8 pt-[96px] md:pt-space-8"
      >
        <motion.h1 variants={fadeUp} className="text-[44px] font-black leading-[1.05] tracking-[-0.02em] sm:text-display">
          Governo Zero Clique,
          <br />
          em <span className="text-highlight">tokens</span> e componentes.
        </motion.h1>
        <motion.p variants={fadeUp} className="max-w-[620px] text-body-large text-text-secondary">
          A base visual das interfaces da Gove — e as ferramentas do time, prontas para usar.
        </motion.p>
        <motion.div variants={fadeUp} className="flex flex-wrap gap-space-2 pt-space-1">
          <Button variant="action" size="lg" onClick={() => scrollTo('aplicacoes')}>
            Abrir aplicações <ArrowRight className="size-5" aria-hidden />
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}
