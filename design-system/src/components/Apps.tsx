import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { appHref } from '../lib/router';
import { APP_TAGS, appsFor, type AppTag } from '../data/apps';
import { useMobile } from '../lib/useMobile';
import { SectionHeader } from './SectionHeader';

/** Aplicações: carrossel no computador; lista no celular. */
export function Apps() {
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const [tag, setTag] = useState<AppTag | null>(null);
  const available = appsFor(useMobile());
  const shown = tag ? available.filter((a) => a.tag === tag) : available;

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const move = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const arrow =
    'hidden size-11 items-center justify-center rounded-full border border-secondary bg-background text-text-primary transition-colors hover:border-primary disabled:opacity-30 lg:flex';

  return (
    <section id="aplicacoes" className="gutter scroll-mt-[72px] py-space-8">
      <div className="flex items-end justify-between gap-space-2">
        <SectionHeader id="aplicacoes" title="Aplicações" />
        <div className="mb-space-4 flex gap-space-1">
          <button type="button" className={arrow} onClick={() => move(-1)} disabled={edge.start} aria-label="Aplicações anteriores" title="Anteriores">
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button type="button" className={arrow} onClick={() => move(1)} disabled={edge.end} aria-label="Próximas aplicações" title="Próximas">
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Celular: filtros por categoria */}
      <div role="group" aria-label="Filtrar aplicações" className="-mt-space-2 mb-space-2 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] lg:hidden">
        {[null, ...APP_TAGS.filter((t) => available.some((a) => a.tag === t))].map((t) => (
          <button
            key={t ?? 'todos'}
            type="button"
            aria-pressed={tag === t}
            onClick={() => setTag(t)}
            className={`min-h-11 shrink-0 rounded-full border px-space-2 text-caption font-semibold transition-colors ${tag === t ? 'border-primary bg-primary text-on-primary' : 'border-secondary text-text-primary'}`}
          >
            {t ?? 'Todos'}
          </button>
        ))}
      </div>

      <ul
        ref={track}
        aria-label="Aplicações"
        className="flex flex-col gap-space-2 lg:-mx-1 lg:snap-x lg:snap-mandatory lg:flex-row lg:overflow-x-auto lg:px-1 lg:pb-space-2 lg:[scrollbar-width:thin]"
      >
        {shown.map(({ id, name, icon: Icon, tagline }) => (
          <li key={id} className="lg:w-[280px] lg:shrink-0 lg:snap-start">
            <a
              href={appHref(id)}
              aria-label={`Abrir ${name}`}
              className="flex h-full items-center gap-space-2 rounded-lg border border-secondary bg-background p-space-2 no-underline shadow-md transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-1 hover:border-lilac hover:shadow-card-hover lg:flex-col lg:items-start lg:p-space-3"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-secondary text-highlight" aria-hidden>
                <Icon className="size-6" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-display text-body-large font-bold text-text-primary">{name}</span>
                <span className="text-caption text-text-secondary">{tagline}</span>
              </span>
              <ChevronRight className="size-5 shrink-0 text-text-muted lg:hidden" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
