import { motion } from 'framer-motion';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { appHref } from '../lib/router';
import { APPS } from '../data/apps';
import { hoverTransition } from '../lib/motion';
import { RevealItem, StaggerGrid } from './Reveal';
import { SectionHeader } from './SectionHeader';

export function Apps() {
  return (
    <section id="aplicacoes" className="gutter scroll-mt-[72px] py-space-8">
      <SectionHeader id="aplicacoes" title="Aplicações" />
      <StaggerGrid className="grid grid-cols-1 gap-space-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {APPS.map(({ id, name, icon: Icon, tagline }) => (
          <RevealItem key={id}>
            <motion.a
              href={appHref(id)}
              whileHover={{ y: -4 }}
              transition={hoverTransition}
              aria-label={`Abrir ${name}`}
              className="flex h-full items-center gap-space-2 rounded-lg border border-secondary bg-background p-space-2 no-underline sm:flex-col sm:items-stretch sm:p-space-3 shadow-md transition-[border-color,box-shadow] duration-200 hover:border-lilac hover:shadow-card-hover"
            >
              <span className="flex shrink-0 items-center justify-between sm:w-full">
                <span className="flex size-12 items-center justify-center rounded-md bg-secondary text-highlight" aria-hidden>
                  <Icon className="size-6" />
                </span>
                <ArrowUpRight className="hidden size-5 text-text-muted sm:block" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-display text-body-large font-bold text-text-primary">{name}</span>
                <span className="text-caption text-text-secondary">{tagline}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-text-muted sm:hidden" aria-hidden />
            </motion.a>
          </RevealItem>
        ))}
      </StaggerGrid>
    </section>
  );
}
