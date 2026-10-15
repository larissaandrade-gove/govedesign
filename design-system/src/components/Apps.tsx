import { motion } from 'framer-motion';
import { ArrowRight, FolderGit2 } from 'lucide-react';
import { appHref } from '../lib/router';
import { APPS } from '../data/apps';
import { hoverTransition } from '../lib/motion';
import { Reveal, RevealItem, StaggerGrid } from './Reveal';
import { SectionHeader } from './SectionHeader';

export function Apps() {
  return (
    <section id="aplicacoes" className="gutter scroll-mt-[72px] py-space-12">
      <SectionHeader id="aplicacoes" token="ecosystem / apps" title="Aplicações">
        As ferramentas do time de marketing que usam este design system. Todas funcionam aqui dentro: abra uma aplicação e use
        direto no navegador.
      </SectionHeader>

      <StaggerGrid className="grid grid-cols-1 gap-space-3 md:grid-cols-2 xl:grid-cols-3">
        {APPS.map(({ id, name, route, icon: Icon, summary, features, stack, folder }) => (
          <RevealItem key={id}>
            <motion.article
              whileHover={{ scale: 1.02, y: -4 }}
              transition={hoverTransition}
              className="flex h-full flex-col gap-space-2 rounded-lg border border-secondary bg-surface p-space-3 transition-[border-color,box-shadow] duration-200 hover:border-lilac hover:shadow-card-hover"
            >
              <div className="flex items-start justify-between gap-space-2">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-secondary text-highlight">
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
                  className="inline-flex h-12 items-center gap-space-1 rounded-md bg-primary px-space-3 font-semibold text-on-primary no-underline shadow-glow-purple transition-[box-shadow,transform] duration-200 hover:scale-[1.02] hover:shadow-glow-purple-strong"
                >
                  Abrir aplicação<span className="sr-only">: {name}</span> <ArrowRight className="size-4" aria-hidden />
                </a>
              </div>
            </motion.article>
          </RevealItem>
        ))}
      </StaggerGrid>

      <Reveal className="mt-space-4 max-w-[760px] text-caption text-text-secondary">
        Os dados criados nas aplicações (municípios, links, páginas, histórico de auditorias) ficam salvos no navegador de quem
        usa. Para dados compartilhados pela equipe, rode as aplicações no servidor do projeto.
      </Reveal>
    </section>
  );
}
