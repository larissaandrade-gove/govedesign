import { useEffect, useState } from 'react';
import { Loader2, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

/**
 * Roda um app do ecossistema dentro do design system: cada app é um HTML
 * autocontido (src/embedded/<id>.html) carregado num iframe `srcdoc`. O iframe
 * é do mesmo documento, então o app alcança as capacidades do artefato
 * (dados compartilhados, arquivos e downloads) e acompanha o tema.
 */
const loaders = import.meta.glob<string>('../embedded/*.html', { query: '?raw', import: 'default' });

export const hasEmbedded = (id: string) => `../embedded/${id}.html` in loaders;

export function EmbeddedApp({ id, name }: { id: string; name: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [full, setFull] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setHtml(null);
    setError(false);
    const load = loaders[`../embedded/${id}.html`];
    if (!load) {
      setError(true);
      return;
    }
    load()
      .then((h) => alive && setHtml(h))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFull(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [full]);

  if (error) return null;

  return (
    <section
      aria-label={`${name} em execução`}
      className={
        full
          ? 'fixed inset-0 z-[60] flex flex-col bg-background'
          : 'flex flex-col overflow-hidden rounded-lg border border-secondary bg-background shadow-md'
      }
    >
      <div className="flex items-center justify-between gap-space-2 border-b border-secondary bg-surface px-space-2 py-space-1">
        <p className="flex min-w-0 items-center gap-space-1 text-caption font-semibold text-text-primary">
          <span className="size-2 shrink-0 rounded-full bg-cyan" aria-hidden />
          <span className="truncate">{name}</span>
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setNonce((n) => n + 1)}
            className="inline-flex h-9 items-center gap-1 rounded-md px-space-1 text-caption text-text-secondary transition-colors hover:bg-secondary/60 hover:text-text-primary"
            title="Recarregar o app"
          >
            <RotateCcw className="size-4" aria-hidden /> <span className="hidden sm:inline">Recarregar</span>
          </button>
          <button
            type="button"
            onClick={() => setFull((f) => !f)}
            aria-pressed={full}
            className="inline-flex h-9 items-center gap-1 rounded-md px-space-1 text-caption text-text-secondary transition-colors hover:bg-secondary/60 hover:text-text-primary"
          >
            {full ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
            <span className="hidden sm:inline">{full ? 'Sair da tela cheia' : 'Tela cheia'}</span>
          </button>
        </div>
      </div>
      {html ? (
        <iframe
          key={nonce}
          title={name}
          srcDoc={html}
          allow="clipboard-read; clipboard-write; fullscreen"
          className={`block w-full flex-1 border-0 bg-background ${full ? '' : 'h-[82vh] min-h-[560px]'}`}
        />
      ) : (
        <div className={`flex items-center justify-center gap-space-1 text-caption text-text-secondary ${full ? 'flex-1' : 'h-[82vh] min-h-[560px]'}`}>
          <Loader2 className="size-4 animate-spin" aria-hidden /> Carregando {name}…
        </div>
      )}
    </section>
  );
}
