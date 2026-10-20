import { useEffect } from 'react';
import { AppPage } from './components/AppPage';
import { Apps } from './components/Apps';
import { ColorPalette } from './components/ColorPalette';
import { Footer } from './components/Footer';
import { BackToTop } from './components/BackToTop';
import { Diretrizes } from './components/Diretrizes';
import { Logomarca } from './components/Logomarca';
import { Hero } from './components/Hero';
import { Sidebar } from './components/Sidebar';
import { Solicitacoes } from './components/Solicitacoes';
import { Typography } from './components/Typography';
import { UIKit } from './components/UIKit';
import { useView } from './lib/router';
import { appsFor } from './data/apps';
import { groupOf, useMobile } from './lib/useMobile';
import { MobileHome } from './components/MobileHome';
import { MobileSearch } from './components/MobileSearch';
import { MobileTabs } from './components/MobileTabs';
import { AccessGate } from './components/AccessGate';

const CORES_TABS = [
  { id: 'cores', label: 'Bússola' },
  { id: 'logomarca', label: 'Logomarca' },
];
const GUIAS_TABS = [
  { id: 'tipografia', label: 'Tipografia' },
  { id: 'componentes', label: 'Componentes' },
  { id: 'diretrizes', label: 'Diretrizes' },
];

/** Celular: uma tela por aba (Início, Apps, Cores, Guias), como no app mobile. */
function MobileScreen({ section }: { section: string }) {
  const group = groupOf(section);
  if (group === 'aplicacoes') return <Apps />;
  if (group === 'cores')
    return (
      <>
        <MobileTabs label="Cores" tabs={CORES_TABS} active={section === 'logomarca' ? 'logomarca' : 'cores'} />
        {section === 'logomarca' ? <Logomarca /> : <ColorPalette />}
      </>
    );
  if (group === 'guias') {
    const active = GUIAS_TABS.some((t) => t.id === section) ? section : 'tipografia';
    return (
      <>
        <MobileTabs label="Guias" tabs={GUIAS_TABS} active={active} />
        {active === 'tipografia' ? <Typography /> : active === 'componentes' ? <UIKit /> : <Diretrizes />}
      </>
    );
  }
  return (
    <>
      <MobileHome />
      <Solicitacoes />
    </>
  );
}

export default function App() {
  return (
    <AccessGate>
      <Shell />
    </AccessGate>
  );
}

function Shell() {
  const view = useView();
  const mobile = useMobile();
  const key = view.kind === 'app' ? `app-${view.appId}` : mobile ? `m-${view.section}` : 'docs';

  // Ao trocar de página, vai para o topo (app) ou para a seção pedida (documentação)
  useEffect(() => {
    if (view.kind === 'app') {
      window.scrollTo({ top: 0 });
      return;
    }
    if (mobile) {
      if (view.section === 'solicitacoes') document.getElementById('solicitacoes')?.scrollIntoView({ block: 'start' });
      else window.scrollTo({ top: 0 });
      return;
    }
    const el = document.getElementById(view.section);
    if (el && view.section !== 'inicio') requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
    else if (view.section === 'inicio') window.scrollTo({ top: 0 });
  }, [key, view, mobile]);

  return (
    <div className="min-h-screen bg-background">
      <a href="#cores" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent">
        Pular para o conteúdo
      </a>
      <Sidebar view={view} />
      <main className="transition-[padding] duration-300 ease-entry lg:pl-[var(--rail,248px)]">
        {view.kind === 'app' && mobile && appsFor(true).every((a) => a.id !== view.appId) ? (
          <div className="pb-[104px] pt-[56px] [&>section]:pt-space-3">
            <Apps />
          </div>
        ) : view.kind === 'app' ? (
          <AppPage key={view.appId} appId={view.appId} />
        ) : mobile ? (
          <div className="pb-[104px] pt-[56px] [&>section]:pt-space-3">
            <MobileScreen section={view.section} />
          </div>
        ) : (
          <>
            <Hero />
            <Apps />
            <Solicitacoes />
            <ColorPalette />
            <Logomarca />
            <Typography />
            <UIKit />
            <Diretrizes />
          </>
        )}
        {view.kind !== 'app' && !mobile && <Footer />}
        {mobile && <MobileSearch />}
        <BackToTop />
      </main>
    </div>
  );
}
