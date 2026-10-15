import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, FolderGit2 } from 'lucide-react';
import { appHref } from '../lib/router';
import { APPS } from '../data/apps';
import { hoverTransition } from '../lib/motion';
import { Reveal, RevealItem, StaggerGrid } from './Reveal';
import { SectionHeader } from './SectionHeader';

/** Os links só funcionam quando o site é servido pelo servidor do projeto (/design-system/). */
const onProjectServer = typeof window !== 'undefined' && window.location.pathname.startsWith('/design-system');

export function Apps() {
  return (
    <section id="aplicacoes" className="gutter scroll-mt-[72px] py-space-12">
      <SectionHeader id="aplicacoes" token="ecosystem / apps" title="Aplicações">
        As ferramentas do time de marketing que usam este design system. Cada uma roda de forma independente e abre pela tela
        inicial do projeto.
      </SectionHeader>

      <StaggerGrid className="grid grid-cols-1 gap-space-3 md:grid-cols-2 xl:grid-cols-3">
        {APPS.map(({ id, name, route, icon: Icon, summary, features, stack, folder }) => (
          <RevealItem key={id}>
            <motion.article
              whileHover={{ scale: 1.02, y: -4, borderColor: '#A278DA', boxShadow: '0 8px 16px rgba(0,0,0,0.6), 0 0 20px rgba(162, 120, 218, 0.4)' }}
              transition={hoverTransition}
              className="flex h-full flex-col gap-space-2 rounded-lg border border-secondary bg-surface p-space-3"
            >
              <div className="flex items-start justify-between gap-space-2">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-secondary text-accent">
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="token rounded-sm border border-secondary px-2 py-1 text-[12px]">{route}</span>
              </div>
              <h3 className="text-h3">{name}</h3>
              <p className="text-body text-text-secondary">{summary}</p>
              <ul className="flex flex-wrap gap-space-1" aria-label={`Recursos de ${name}`}>
                {features.map((f) => (
                  <li key={f} className="rounded-full bg-background px-3 py-1 text-caption text-text-secondary">
                    {f}
                  </li>
                ))}
              </ul>
              <p className="flex items-center gap-space-1 text-caption text-text-secondary">
                <FolderGit2 className="size-4 shrink-0" aria-hidden />
                <span className="token min-w-0 break-words">{folder}</span>
              </p>
              <p className="text-caption text-text-secondary/80">{stack.join(' · ')}</p>
              <div className="mt-auto flex flex-wrap gap-space-1 pt-space-1">
                <a
                  href={appHref(id)}
                  className="inline-flex h-12 items-center gap-space-1 rounded-md bg-primary px-space-3 font-semibold text-text-primary no-underline shadow-glow-purple transition-[box-shadow,transform] duration-200 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(162,120,218,0.6)]"
                >
                  Ver aplicação<span className="sr-only">: {name}</span> <ArrowRight className="size-4" aria-hidden />
                </a>
                {onProjectServer && (
                  <a
                    href={route}
                    className="inline-flex h-12 items-center gap-space-1 rounded-md border border-secondary px-space-3 font-semibold text-text-primary no-underline transition-[border-color,transform] duration-200 hover:scale-[1.02] hover:border-lilac"
                  >
                    Abrir<span className="sr-only"> {name}</span> <ArrowUpRight className="size-4" aria-hidden />
                  </a>
                )}
              </div>
            </motion.article>
          </RevealItem>
        ))}
      </StaggerGrid>

      <Reveal className="mt-space-4 max-w-[760px] text-caption text-text-secondary">
        "Ver aplicação" abre a página de cada app aqui dentro: telas, recursos e como rodar. Com o projeto rodando, "Abrir" leva
        ao app; Revisor e Print Studio também podem ser vistos ao vivo dentro da página.
      </Reveal>
    </section>
  );
}
