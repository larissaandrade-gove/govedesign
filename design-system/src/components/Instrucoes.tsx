import { motion } from 'framer-motion';
import { Books, CaretRight } from '@phosphor-icons/react';
import guide from '../../../docs/diretrizes-gove.md?raw';
import { INSTRUCOES, type InstrucaoId } from '../data/teams';
import { fadeUp } from '../lib/motion';
import { ColorPalette } from './ColorPalette';
import { Diretrizes } from './Diretrizes';
import { DocActions } from './DocActions';
import { Logomarca } from './Logomarca';
import { Prompts } from './Prompts';
import { Typography } from './Typography';
import { UIKit } from './UIKit';

const SECTION: Record<InstrucaoId, () => JSX.Element> = {
  prompts: Prompts,
  tipografia: Typography,
  cores: ColorPalette,
  logomarca: Logomarca,
  componentes: UIKit,
  diretrizes: Diretrizes,
};

/** Cards das seções de Instruções (visão geral e studio do Apoio de IA). */
export function InstrucoesIndex({ only }: { only?: readonly InstrucaoId[] }) {
  const items = only ? INSTRUCOES.filter((s) => only.includes(s.id)) : INSTRUCOES;
  return (
    <ul className="grid grid-cols-1 gap-space-2 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(({ id, label, summary, icon: Icon }) => (
        <li key={id}>
          <a
            href={`#${id}`}
            className="flex h-full min-h-[88px] items-center gap-space-2 rounded-lg border border-secondary bg-background p-space-3 no-underline shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-lilac hover:shadow-card-hover"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-secondary text-highlight" aria-hidden>
              <Icon className="size-6" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-display text-body-large font-bold text-text-primary">{label}</span>
              <span className="text-caption text-text-secondary">{summary}</span>
            </span>
            <CaretRight className="size-5 shrink-0 text-text-muted" aria-hidden />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Abas do diretório: rolam na horizontal no celular, fixas abaixo da barra do topo. */
function SubNav({ active }: { active: InstrucaoId | null }) {
  const tabs = [{ id: 'instrucoes', label: 'Visão geral' }, ...INSTRUCOES];
  return (
    <nav aria-label="Seções de Instruções" className="sticky top-16 z-20 border-b border-secondary bg-background/95 backdrop-blur-md lg:top-0">
      <ul className="gutter flex gap-1 overflow-x-auto [scrollbar-width:none]">
        {tabs.map((t) => {
          const on = (active ?? 'instrucoes') === t.id;
          return (
            <li key={t.id} className="shrink-0">
              <a
                href={`#${t.id}`}
                aria-current={on ? 'page' : undefined}
                className={`relative flex min-h-12 items-center px-space-2 text-caption font-semibold no-underline transition-colors hover:bg-secondary/30 ${on ? 'text-text-primary' : 'text-text-secondary'}`}
              >
                {t.label}
                {on && <span className="absolute inset-x-space-1 bottom-0 h-[3px] rounded-t-full bg-highlight" aria-hidden />}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Instruções: tudo do design system num diretório (prompts, tipografia, cores, logomarca, componentes, diretrizes). */
export function Instrucoes({ section }: { section: InstrucaoId | null }) {
  const Section = section ? SECTION[section] : null;
  return (
    <div className="pt-16 lg:pt-0">
      <motion.header key="instrucoes" variants={fadeUp} initial="hidden" animate="visible" className="gutter flex flex-col gap-space-1 pb-space-3 pt-space-4 lg:pt-space-6">
        <h1 className="flex items-center gap-space-2 font-display text-h3 font-bold leading-tight text-text-primary sm:text-h2">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-on-primary" aria-hidden>
            <Books className="size-6" />
          </span>
          Instruções
        </h1>
        <p className="max-w-[680px] text-body text-text-secondary">Tudo do design system num só lugar, com prompts prontos para usar com IA.</p>
      </motion.header>
      <SubNav active={section} />
      {Section ? (
        <div key={section} className="[&>section]:border-t-0 [&>section]:pb-space-6 [&>section]:pt-space-4">
          <Section />
        </div>
      ) : (
        <div className="gutter flex flex-col gap-space-4 py-space-4">
          <InstrucoesIndex />
          <div className="flex flex-col gap-space-1">
            <h2 className="text-body-large font-semibold text-text-primary">Guia completo</h2>
            <p className="max-w-[680px] text-body text-text-secondary">Anexe o guia ou cole as instruções no início da conversa com a IA.</p>
            <DocActions doc={guide} filename="diretrizes-gove.md" topic="completo" />
          </div>
        </div>
      )}
    </div>
  );
}
