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

/** Celular: uma tela por destino da navigation bar (Início, Apps, Cores, Guias); Cores e Guias com tabs primárias (MD3). */
function MobileScreen({ section }: { section: string }) {
  const group = groupOf(section);
  if (group === 'aplicacoes')
    return (
      <div className="m-titled">
        <Apps />
      </div>
    );
  if (group === 'cores')
    return (
      <div className="m-titled">
        <MobileTabs label="Cores" tabs={CORES_TABS} active={section === 'logomarca' ? 'logomarca' : 'cores'} />
        {section === 'logomarca' ? <Logomarca /> : <ColorPalette />}
      </div>
    );
  if (group === 'guias') {
    const active = GUIAS_TABS.some((t) => t.id === section) ? section : 'tipografia';
    return (
      <div className="m-titled">
        <MobileTabs label="Guias" tabs={GUIAS_TABS} active={active} />
        {active === 'tipografia' ? <Typography /> : active === 'componentes' ? <UIKit /> : <Diretrizes />}
      </div>
    );
  }
  return (
    <>
      <MobileHome />
      <div className="m-home">
        <Solicitacoes />
      </div>
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
      <main className="transition-[padding] duration-300 ease-entry lg:pl-[var(--rail,264px)]">
        {view.kind === 'app' && mobile && appsFor(true).every((a) => a.id !== view.appId) ? (
          <div className="pb-[112px] pt-16 [&>section]:pt-space-3">
            <Apps />
          </div>
        ) : view.kind === 'app' ? (
          <AppPage key={view.appId} appId={view.appId} />
        ) : mobile ? (
          <div className="pb-[176px] pt-16 [&>section]:pt-space-3">
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
        {!mobile && <BackToTop />}
      </main>
    </div>
  );
}
