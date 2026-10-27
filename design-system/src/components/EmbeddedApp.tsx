import { useEffect, useState } from 'react';
import { ArrowsIn, SpinnerGap } from '@phosphor-icons/react';

/**
 * Roda um app do ecossistema dentro do design system: cada app é um HTML
 * autocontido (src/embedded/<id>.html, publicado em apps/<id>.html) aberto num
 * iframe da mesma origem, que acompanha o tema do design system.
 */
declare const __GOVE_EMBEDDED__: string[];

export const hasEmbedded = (id: string) => __GOVE_EMBEDDED__.includes(id);

type Props = { id: string; name: string; reloadKey: number; full: boolean; onExitFull: () => void; hash?: string };

export function EmbeddedApp({ id, name, reloadKey, full, onExitFull, hash = '' }: Props) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => setLoaded(false), [id, reloadKey]);

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onExitFull();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [full, onExitFull]);

  if (!hasEmbedded(id)) return null;

  return (
    <section
      aria-label={name}
      className={full ? 'fixed inset-0 z-[60] bg-background' : 'relative h-[calc(100vh-152px)] min-h-[560px] overflow-hidden rounded-lg border border-secondary bg-background shadow-md lg:h-[calc(100vh-112px)]'}
    >
      <iframe
        key={`${id}-${reloadKey}`}
        title={name}
        src={`apps/${id}.html${hash}`}
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 block h-full w-full border-0 bg-background"
      />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-background text-text-secondary" role="status">
          <SpinnerGap className="size-6 animate-spin" aria-hidden />
          <span className="sr-only">Carregando {name}</span>
        </div>
      )}
      {full && (
        <button
          type="button"
          onClick={onExitFull}
          aria-label="Sair da tela cheia"
          title="Sair da tela cheia (Esc)"
          className="absolute bottom-space-2 right-space-2 flex size-11 items-center justify-center rounded-full border border-secondary bg-background/95 text-text-primary shadow-md backdrop-blur"
        >
          <ArrowsIn className="size-5" aria-hidden />
        </button>
      )}
    </section>
  );
}
