import { useCallback, useEffect, useState } from 'react';
import { Image as ImageIcon, LayoutTemplate, ListOrdered, Loader2, MapPin, type LucideIcon } from 'lucide-react';
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
    return api.onChange(() => {
      void refreshMunicipios();
      void refreshLogos();
    });
  }, [refreshMunicipios, refreshLogos]);

  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
      /* armazenamento indisponível */
    }
  }, [queue]);

  const pieces = queue.reduce((n, q) => n + q.layouts.length, 0);
  const tabs: { id: Tab; label: string; icon: LucideIcon; count?: number }[] = [
    { id: 'editor', label: 'Editor de layout', icon: LayoutTemplate },
    { id: 'municipios', label: 'Municípios', icon: MapPin },
    { id: 'fila', label: 'Fila de exportação', icon: ListOrdered, count: pieces },
    { id: 'config', label: 'Logos fixos', icon: ImageIcon },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4 min-[900px]:gap-6 min-[900px]:px-5">
        <button
          type="button"
          onClick={() => setTab('editor')}
          className="flex min-h-11 shrink-0 items-center rounded-md px-1 font-display text-base font-bold text-foreground sm:text-lg"
        >
          Gove Print Studio
        </button>
        {/* Controle segmentado: ícone + rótulo a partir de 900px; só ícone abaixo (rótulo fica acessível). */}
        <nav className="ml-auto flex items-center gap-1 rounded-xl bg-muted p-1 min-[900px]:ml-0" aria-label="Seções">
          {tabs.map(({ id, label, icon: Icon, count }) => {
            const current = tab === id;
            const name = count ? `${label} (${count} ${count === 1 ? 'peça' : 'peças'})` : label;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-current={current ? 'page' : undefined}
                aria-label={name}
                title={name}
                className={cn(
                  'relative flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2.5 text-sm font-medium transition-colors min-[900px]:px-3.5',
                  current ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="sr-only min-[900px]:not-sr-only min-[900px]:whitespace-nowrap">{label}</span>
                {count ? (
                  <span
                    aria-hidden
                    className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-primary px-1.5 text-center text-[11px] font-semibold leading-5 text-primary-foreground min-[900px]:static min-[900px]:text-xs"
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="min-h-0 flex-1">
        {fontError && <p className="p-6 text-destructive" role="alert">Não foi possível carregar a fonte Montserrat. Recarregue a página.</p>}
        {!fontsReady && !fontError && (
          <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Carregando fontes…
          </p>
        )}
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
