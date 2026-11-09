import { motion } from 'framer-motion';
import { ArrowRight, ArrowsLeftRight, Books, CaretRight, Desktop, Star, Ticket } from '@phosphor-icons/react';
import type { GoveApp } from '../data/apps';
import { teamApps, type Team } from '../data/teams';
import { isOpen, useStatuses } from '../lib/appStatus';
import { fadeUp, stagger } from '../lib/motion';
import { appHref } from '../lib/router';
import { useMobile } from '../lib/useMobile';
import { InstrucoesIndex } from './Instrucoes';
import { SoonBadge } from './SoonBadge';

type CardState = { href?: string; badge: React.ReactNode; label: string };

/** Link (ou nada, quando "Em breve" ou só no computador) e selo de cada app. */
function useCardStates(apps: GoveApp[]): Record<string, CardState> {
  const status = useStatuses(apps);
  const mobile = useMobile();
  return Object.fromEntries(
    apps.map((a) => {
      if (!isOpen(status[a.id] ?? 'ok')) return [a.id, { badge: <SoonBadge />, label: `${a.name}: em breve` }];
      if (mobile && a.desktopOnly)
        return [
          a.id,
          {
            label: `${a.name}: disponível no computador`,
            badge: (
              <span className="inline-flex min-h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-surface px-2 text-caption font-semibold text-text-secondary">
                <Desktop className="size-3.5" aria-hidden /> <span className="max-sm:sr-only">No computador</span>
              </span>
            ),
          },
        ];
      return [a.id, { href: appHref(a.id), badge: null, label: `Abrir ${a.name}` }];
    }),
  );
}

const cardBase = 'flex h-full overflow-hidden rounded-lg border border-secondary bg-background no-underline shadow-md';
const cardLive = 'transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-lilac hover:shadow-card-hover';

/** Card grande: tela do app, nome, resumo e recursos. `wide` deixa a imagem ao lado (destaque). */
function AppCard({ app, state, wide = false, featured = false }: { app: GoveApp; state: CardState; wide?: boolean; featured?: boolean }) {
  // Destaque compacto (Marketing): no celular, sem a tela do app
  const Icon = app.icon;
  const shot = app.shots[0];
  return (
    <a
      href={state.href}
      aria-disabled={!state.href || undefined}
      aria-label={state.label}
      className={`${cardBase} flex-col ${wide ? 'md:flex-row' : ''} ${state.href ? cardLive : 'cursor-default'}`}
    >
      {shot && (
        <span className={`relative block shrink-0 overflow-hidden bg-surface ${wide ? 'aspect-[16/9] md:aspect-auto md:w-1/2' : 'aspect-[16/9]'} ${featured ? 'max-md:hidden' : ''}`}>
          <img src={shot.src} alt="" loading="lazy" className={`absolute inset-0 h-full w-full object-cover object-top ${state.href ? '' : 'opacity-60'}`} />
        </span>
      )}
      <span className="flex flex-1 flex-col gap-space-2 p-space-3">
        <span className="flex items-start gap-space-2">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-secondary text-highlight" aria-hidden>
            <Icon className="size-6" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            {featured && (
              <span className="inline-flex items-center gap-1 text-caption font-semibold text-highlight">
                <Star className="size-4" weight="fill" aria-hidden /> Mais usado
              </span>
            )}
            <span className={`font-display font-bold leading-snug text-text-primary ${wide ? 'text-h3' : 'text-body-large'}`}>{app.name}</span>
          </span>
          {state.badge}
        </span>
        <span className="text-body text-text-secondary">{app.summary}</span>
        <span className="flex flex-wrap gap-1">
          {app.features.slice(0, 4).map((f) => (
            <span key={f} className="rounded-full bg-surface px-3 py-1 text-caption text-text-secondary">
              {f}
            </span>
          ))}
        </span>
        {state.href && (
          <span className="mt-auto inline-flex items-center gap-1 pt-space-1 text-body font-semibold text-link">
            Abrir <ArrowRight className="size-4" aria-hidden />
          </span>
        )}
      </span>
    </a>
  );
}

/** Linha compacta (Marketing): ícone, nome e uma linha. */
function AppRow({ app, state }: { app: GoveApp; state: CardState }) {
  const Icon = app.icon;
  return (
    <a
      href={state.href}
      aria-disabled={!state.href || undefined}
      aria-label={state.label}
      className={`${cardBase} min-h-[72px] items-center gap-space-2 p-space-2 shadow-sm ${state.href ? cardLive : 'cursor-default opacity-80'}`}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-secondary text-highlight" aria-hidden>
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-display text-body font-bold text-text-primary">{app.name}</span>
        <span className="line-clamp-2 text-caption text-text-secondary">{app.tagline}</span>
      </span>
      {state.badge ?? <CaretRight className="size-5 shrink-0 text-text-muted" aria-hidden />}
    </a>
  );
}

/** Atalho para Solicitações e Instruções, no fim do studio. */
function Shortcut({ href, icon: Icon, title, text }: { href: string; icon: typeof Ticket; title: string; text: string }) {
  return (
    <a href={href} className={`${cardBase} min-h-[88px] items-center gap-space-2 p-space-3 shadow-sm ${cardLive}`}>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-secondary text-highlight" aria-hidden>
        <Icon className="size-6" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-display text-body-large font-bold text-text-primary">{title}</span>
        <span className="text-caption text-text-secondary">{text}</span>
      </span>
      <CaretRight className="size-5 shrink-0 text-text-muted" aria-hidden />
    </a>
  );
}

/** Studio da equipe: só os apps dela (o primeiro em destaque), Solicitações e Instruções. */
export function TeamStudio({ team }: { team: Team }) {
  const apps = teamApps(team);
  const states = useCardStates(apps);
  const Icon = team.icon;
  const [first, ...rest] = apps;
  const single = apps.length === 1;

  return (
    <motion.div key={team.id} variants={stagger} initial="hidden" animate="visible" className="flex flex-col gap-space-6 pb-space-6 pt-[88px] lg:pt-space-6">
      <motion.header variants={fadeUp} className="gutter flex flex-col gap-space-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-center gap-space-2">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary shadow-glow-purple" aria-hidden>
            <Icon className="size-7" />
          </span>
          <div className="flex min-w-0 flex-col">
            <p className="text-caption font-semibold text-text-secondary">Studio da equipe</p>
            <h1 className="font-display text-h3 font-bold leading-tight text-text-primary sm:text-h2">{team.label}</h1>
          </div>
        </div>
        <a
          href="#equipes"
          className="inline-flex min-h-11 items-center gap-space-1 self-start rounded-md border border-secondary px-space-2 text-caption font-semibold text-text-primary no-underline transition-colors hover:border-primary sm:self-auto"
        >
          <ArrowsLeftRight className="size-4" aria-hidden /> Trocar equipe
        </a>
      </motion.header>

      {apps.length > 0 && (
        <motion.section variants={fadeUp} aria-labelledby="studio-apps" className="gutter flex flex-col gap-space-2">
          <h2 id="studio-apps" className="text-body-large font-semibold text-text-primary">
            {single ? 'Seu app' : 'Seus apps'}
          </h2>
          {team.compact ? (
            <>
              <AppCard app={first} state={states[first.id]} wide featured />
              <ul className="grid grid-cols-1 gap-space-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="Outros apps">
                {rest.map((a) => (
                  <li key={a.id}>
                    <AppRow app={a} state={states[a.id]} />
                  </li>
                ))}
              </ul>
            </>
          ) : single ? (
            <AppCard app={first} state={states[first.id]} wide />
          ) : (
            <ul className="grid grid-cols-1 gap-space-3 md:grid-cols-2 xl:grid-cols-3">
              {apps.map((a) => (
                <li key={a.id}>
                  <AppCard app={a} state={states[a.id]} />
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      )}

      {team.instrucoes && (
        <motion.section variants={fadeUp} aria-labelledby="studio-instrucoes" className="gutter flex flex-col gap-space-2">
          <h2 id="studio-instrucoes" className="text-body-large font-semibold text-text-primary">
            Instruções
          </h2>
          <InstrucoesIndex only={team.instrucoes} />
        </motion.section>
      )}

      <motion.section variants={fadeUp} aria-label="Atalhos" className="gutter grid grid-cols-1 gap-space-2 md:grid-cols-2">
        <Shortcut href="#solicitacoes" icon={Ticket} title="Seus pedidos" text="Acompanhe as solicitações que você abriu ao time de design." />
        {!team.instrucoes && <Shortcut href="#instrucoes" icon={Books} title="Instruções" text="Cores, tipografia, logomarca e prompts para IA." />}
      </motion.section>
    </motion.div>
  );
}
