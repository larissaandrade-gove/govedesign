import { useEffect, useState } from 'react';
import { Loader2, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

/**
 * Roda um app do ecossistema dentro do design system: cada app é um HTML
 * autocontido (src/embedded/<id>.html, publicado em apps/<id>.html) aberto num
 * iframe da mesma origem, que acompanha o tema do design system.
 */
declare const __GOVE_EMBEDDED__: string[];

export const hasEmbedded = (id: string) => __GOVE_EMBEDDED__.includes(id);

export function EmbeddedApp({ id, name }: { id: string; name: string }) {
  const [loaded, setLoaded] = useState(false);
  const [full, setFull] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => setLoaded(false), [id, nonce]);

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

  if (!hasEmbedded(id)) return null;

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
      <div className={`relative ${full ? 'flex-1' : 'h-[82vh] min-h-[560px]'}`}>
        <iframe
          key={`${id}-${nonce}`}
          title={name}
          src={`apps/${id}.html`}
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 block h-full w-full border-0 bg-background"
        />
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center gap-space-1 bg-background text-caption text-text-secondary">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Carregando {name}…
          </div>
        )}
      </div>
    </section>
  );
}
