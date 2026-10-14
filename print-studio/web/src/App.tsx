import { useCallback, useEffect, useState } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { api, type LogosFixos, type Municipio, type QueueItem } from '@/lib/api';
import { loadPrintFonts } from '@/lib/studio';
import { cn } from '@/lib/utils';
import { Configuracoes } from '@/pages/Configuracoes';
import { Editor } from '@/pages/Editor';
import { Fila } from '@/pages/Fila';
import { Municipios } from '@/pages/Municipios';

type Tab = 'editor' | 'municipios' | 'fila' | 'config';
const QUEUE_KEY = 'gove-print-studio:fila';

function readQueue(): QueueItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export default function App() {
  const [tab, setTab] = useState<Tab>('editor');
  const [fontsReady, setFontsReady] = useState(false);
  const [fontError, setFontError] = useState(false);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [logos, setLogos] = useState<LogosFixos>({ gove: null, bb: null });
  const [queue, setQueue] = useState<QueueItem[]>(readQueue);

  const refreshMunicipios = useCallback(() => api.municipios().then(setMunicipios).catch(() => undefined), []);
  const refreshLogos = useCallback(() => api.logosFixos().then(setLogos).catch(() => undefined), []);

  useEffect(() => {
    loadPrintFonts().then(() => setFontsReady(true), () => setFontError(true));
    void refreshMunicipios();
    void refreshLogos();
  }, [refreshMunicipios, refreshLogos]);

  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
      /* armazenamento indisponível */
    }
  }, [queue]);

  const pieces = queue.reduce((n, q) => n + q.layouts.length, 0);
  const tabs: { id: Tab; label: string }[] = [
    { id: 'editor', label: 'Editor de layout' },
    { id: 'municipios', label: 'Municípios' },
    { id: 'fila', label: `Fila de exportação${pieces ? ` (${pieces})` : ''}` },
    { id: 'config', label: 'Logos fixos' },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-8 border-b border-border px-5">
        <a href="/" className="flex items-baseline gap-2 text-white no-underline">
          <span className="font-display text-lg font-bold">Gove Print Studio</span>
          <span className="hidden text-xs text-muted-foreground lg:inline">Kit de Boas-Vindas</span>
        </a>
        <nav className="flex h-full items-stretch gap-1" aria-label="Seções">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={cn(
                'border-b-2 px-3 text-sm font-medium transition-colors',
                tab === t.id ? 'border-accent text-white' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="min-h-0 flex-1">
        {fontError && <p className="p-6 text-destructive">Não foi possível carregar a Montserrat do servidor. Verifique se o Print Studio está rodando.</p>}
        {!fontsReady && !fontError && <p className="p-6 text-sm text-muted-foreground">Carregando fontes…</p>}
        {fontsReady && (
          <>
            <div className={cn('h-full', tab !== 'editor' && 'hidden')}>
              <Editor
                municipios={municipios}
                logosFixos={logos}
                onMunicipioSaved={() => void refreshMunicipios()}
                onAddToQueue={(item) => setQueue((q) => [...q, item])}
              />
            </div>
            {tab === 'municipios' && <Municipios municipios={municipios} onChanged={() => void refreshMunicipios()} />}
            {tab === 'fila' && <Fila queue={queue} onRemove={(k) => setQueue((q) => q.filter((x) => x.key !== k))} onClear={() => setQueue([])} />}
            {tab === 'config' && <Configuracoes logos={logos} onChanged={() => void refreshLogos()} />}
          </>
        )}
      </main>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
