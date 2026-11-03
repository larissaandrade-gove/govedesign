import { useEffect } from 'react';
import { ArrowLeft, Desktop } from '@phosphor-icons/react';
import { AppPage } from './components/AppPage';
import { Footer } from './components/Footer';
import { BackToTop } from './components/BackToTop';
import { Instrucoes } from './components/Instrucoes';
import { Sidebar } from './components/Sidebar';
import { Solicitacoes } from './components/Solicitacoes';
import { TeamSelector } from './components/TeamSelector';
import { TeamStudio } from './components/TeamStudio';
import { useView, viewKey } from './lib/router';
import { useTeam } from './lib/team';
import { APPS } from './data/apps';
import { useMobile } from './lib/useMobile';
import { MobileSearch } from './components/MobileSearch';
import { AccessGate } from './components/AccessGate';

export default function App() {
  return (
    <AccessGate>
      <Shell />
    </AccessGate>
  );
}

/** Celular: apps só de computador (Kit de Boas-Vindas) explicam onde abrir. */
function DesktopOnly({ name, back }: { name: string; back: string }) {
  return (
    <div className="gutter flex min-h-[100dvh] flex-col items-center justify-center gap-space-2 pb-space-6 pt-[88px] text-center">
      <span className="flex size-14 items-center justify-center rounded-lg bg-secondary text-highlight" aria-hidden>
        <Desktop className="size-7" />
      </span>
      <p className="font-display text-h3 font-semibold text-text-primary">{name} abre no computador</p>
      <p className="max-w-[420px] text-body text-text-secondary">O editor precisa de uma tela maior. Abra o design system no computador para gerar as peças.</p>
      <a href="#inicio" className="inline-flex min-h-11 items-center gap-space-1 rounded-md border border-secondary px-space-2 font-semibold text-text-primary no-underline">
        <ArrowLeft className="size-4" aria-hidden /> {back}
      </a>
    </div>
  );
}

function Shell() {
  const view = useView();
  const team = useTeam();
  const mobile = useMobile();
  // Sem equipe escolhida, o início é o seletor
  const selector = view.kind === 'equipes' || (view.kind === 'studio' && !team);
  const key = `${viewKey(view)}-${team?.id ?? ''}-${selector}`;

  // Cada página abre no topo
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [key]);

  if (selector) return <TeamSelector current={team} />;

  const app = view.kind === 'app' ? APPS.find((a) => a.id === view.appId) : null;
  return (
    <div className="min-h-screen bg-background">
      <a href="#conteudo" onClick={(e) => (e.preventDefault(), document.getElementById('conteudo')?.focus())} className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent">
        Pular para o conteúdo
      </a>
      <Sidebar view={view} team={team} />
      <main id="conteudo" tabIndex={-1} className="outline-none transition-[padding] duration-300 ease-entry lg:pl-[var(--rail,264px)]">
        {app ? (
          mobile && app.desktopOnly ? (
            <DesktopOnly name={app.name} back={team ? `Voltar para ${team.label}` : 'Voltar ao início'} />
          ) : (
            <AppPage key={app.id} appId={app.id} />
          )
        ) : view.kind === 'instrucoes' ? (
          <Instrucoes section={view.section} />
        ) : view.kind === 'solicitacoes' ? (
          <div className="pt-16 lg:pt-0">
            <Solicitacoes level={1} />
          </div>
        ) : (
          team && <TeamStudio team={team} />
        )}
        {!app && <Footer />}
        {mobile && <MobileSearch team={team} />}
        {!mobile && <BackToTop />}
      </main>
    </div>
  );
}
