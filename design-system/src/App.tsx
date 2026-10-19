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

export default function App() {
  const view = useView();
  const key = view.kind === 'app' ? `app-${view.appId}` : 'docs';

  // Ao trocar de página, vai para o topo (app) ou para a seção pedida (documentação)
  useEffect(() => {
    if (view.kind === 'app') {
      window.scrollTo({ top: 0 });
      return;
    }
    const el = document.getElementById(view.section);
    if (el && view.section !== 'inicio') requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
    else if (view.section === 'inicio') window.scrollTo({ top: 0 });
  }, [key, view]);

  return (
    <div className="min-h-screen bg-background">
      <a href="#cores" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent">
        Pular para o conteúdo
      </a>
      <Sidebar view={view} />
      <main className="transition-[padding] duration-300 ease-entry lg:pl-[var(--rail,248px)]">
        {view.kind === 'app' ? (
          <AppPage key={view.appId} appId={view.appId} />
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
        {view.kind !== 'app' && <Footer />}
        <BackToTop />
      </main>
    </div>
  );
}
