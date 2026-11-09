import { motion } from 'framer-motion';
import { CaretRight, CheckCircle } from '@phosphor-icons/react';
import { TEAMS, type Team } from '../data/teams';
import { fadeUp, stagger } from '../lib/motion';
import { teamHref } from '../lib/team';
import { useTheme } from '../lib/theme';
import { CityBackdrop } from './CityBackdrop';
import { GoveLogo } from './GoveLogo';
import { ThemeToggle } from './ThemeToggle';
import { LogoutButton } from './LogoutButton';

/** Primeira tela: escolha da equipe, centralizada. Cada opção abre o studio da equipe (#equipe-<id>). */
export function TeamSelector({ current }: { current: Team | null }) {
  const [theme] = useTheme();
  return (
    <div className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden bg-background">
      <CityBackdrop className={`pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[38%] w-full ${theme === 'dark' ? 'opacity-60' : 'opacity-50'}`} seed={11} theme={theme} />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-background/40 via-background/85 to-background" />

      <header className="gutter flex h-16 shrink-0 items-center justify-between gap-space-2" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <GoveLogo kind="logotipo" height={24} />
        <div className="flex items-center gap-1">
          <ThemeToggle compact />
          <LogoutButton compact />
        </div>
      </header>

      <main className="gutter flex flex-1 items-center justify-center py-space-4">
        <motion.div variants={stagger} initial="hidden" animate="visible" className="flex w-full max-w-[640px] flex-col gap-space-3">
          <motion.div variants={fadeUp} className="flex flex-col gap-space-1 text-center">
            <p className="text-caption font-semibold text-text-secondary">Design System Gove</p>
            <h1 className="font-display text-h2 font-bold leading-tight text-text-primary sm:text-h1">Qual é a sua equipe?</h1>
            <p className="text-body text-text-secondary">Você vê só os apps que usa. Dá para trocar quando quiser.</p>
          </motion.div>

          <motion.ul variants={stagger} aria-label="Equipes" className="flex flex-col gap-space-1">
            {TEAMS.map((t) => {
              const on = current?.id === t.id;
              const Icon = t.icon;
              return (
                <motion.li key={t.id} variants={fadeUp}>
                  <a
                    href={teamHref(t.id)}
                    aria-current={on ? 'true' : undefined}
                    className={`group flex min-h-[72px] items-center gap-space-2 rounded-lg border bg-background p-space-2 no-underline shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-lilac hover:shadow-card-hover ${
                      on ? 'border-primary' : 'border-secondary'
                    }`}
                  >
                    <span className={`flex size-12 shrink-0 items-center justify-center rounded-md ${on ? 'bg-primary text-on-primary' : 'bg-secondary text-highlight'}`} aria-hidden>
                      <Icon className="size-6" weight={on ? 'fill' : 'regular'} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                      <span className="font-display text-body-large font-bold leading-snug text-text-primary">{t.label}</span>
                      <span className="text-caption text-text-secondary">{t.description}</span>
                    </span>
                    {on ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-caption font-semibold text-highlight">
                        <CheckCircle className="size-5" weight="fill" aria-hidden />
                        <span className="max-sm:sr-only">Atual</span>
                      </span>
                    ) : (
                      <CaretRight className="size-5 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                    )}
                  </a>
                </motion.li>
              );
            })}
          </motion.ul>

        </motion.div>
      </main>
    </div>
  );
}
