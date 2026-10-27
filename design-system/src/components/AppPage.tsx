import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ArrowCounterClockwise, ArrowLeft, ArrowsOut, CaretLeft, CaretRight, Check, Copy, Info, TerminalWindow } from '@phosphor-icons/react';
import { APPS } from '../data/apps';
import { appHref } from '../lib/router';
import { fadeUp, stagger } from '../lib/motion';
import { EmbeddedApp, hasEmbedded } from './EmbeddedApp';
import { useMobile } from '../lib/useMobile';

/** Botão só de ícone: 44×44, rótulo acessível e dica. */
function IconButton({ label, onClick, href, children, pressed }: { label: string; onClick?: () => void; href?: string; children: React.ReactNode; pressed?: boolean }) {
  const cls = 'flex size-11 shrink-0 items-center justify-center rounded-full text-text-primary no-underline transition-colors hover:bg-secondary/60 aria-pressed:bg-secondary/70 aria-expanded:bg-secondary/70';
  return href ? (
    <a href={href} aria-label={label} title={label} className={cls}>
      {children}
    </a>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} title={label} aria-expanded={pressed} className={cls}>
      {children}
    </button>
  );
}

export function AppPage({ appId }: { appId: string }) {
  const index = APPS.findIndex((a) => a.id === appId);
  const app = APPS[index];
  const prev = APPS[(index - 1 + APPS.length) % APPS.length];
  const next = APPS[(index + 1) % APPS.length];
  const [info, setInfo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [full, setFull] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);
  const Icon = app.icon;
  const embedId = app.embed?.file ?? app.id;
  const exitFull = useCallback(() => setFull(false), []);
  // Celular: Sobre e Recarregar vão para a top app bar (sem fileira extra acima do app)
  const mobile = useMobile();
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => setSlot(document.getElementById('appbar-actions')), [mobile]);

  // Fecha o painel "Sobre" com Esc ou clique fora
  useEffect(() => {
    if (!info) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setInfo(false);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!infoRef.current?.contains(t) && !document.getElementById('appbar-actions')?.contains(t)) setInfo(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [info]);

  async function copyRun() {
    try {
      await navigator.clipboard.writeText(app.run.split('  →')[0]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* área de transferência indisponível: o comando continua selecionável */
    }
  }

  return (
    <article className="gutter pb-space-3 pt-[72px] lg:pb-space-4 lg:pt-space-2" aria-label={app.name}>
      {mobile &&
        slot &&
        createPortal(
          <>
            <IconButton label="Sobre o app" onClick={() => setInfo((v) => !v)} pressed={info}>
              <Info className="size-5" aria-hidden />
            </IconButton>
            {hasEmbedded(embedId) && (
              <IconButton label="Recarregar" onClick={() => setReloadKey((n) => n + 1)}>
                <ArrowCounterClockwise className="size-5" aria-hidden />
              </IconButton>
            )}
          </>,
          slot,
        )}
      <motion.div key={app.id} variants={stagger} initial="hidden" animate="visible" className="flex flex-col gap-space-2">
        <div className="relative" ref={infoRef}>
          {/* Barra de ferramentas do app (no celular, as ações ficam na top app bar) */}
          <motion.header variants={fadeUp} className="hidden items-center gap-space-1 lg:flex">
            {/* No celular, voltar e o nome do app ficam na top app bar (Sidebar) */}
            <span className="hidden lg:contents">
              <IconButton label="Voltar para Aplicações" href="#aplicacoes">
                <ArrowLeft className="size-6" aria-hidden />
              </IconButton>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-highlight" aria-hidden>
                <Icon className="size-5" />
              </span>
            </span>
            <h1 id="app-title" className="mr-auto min-w-0 truncate font-display text-h3">
              {app.name}
            </h1>
            {/* No celular, a troca de app fica na aba Apps: sobra espaço para o nome */}
            <span className="hidden sm:contents">
              <IconButton label={`Anterior: ${prev.name}`} href={appHref(prev.id)}>
                <CaretLeft className="size-5" aria-hidden />
              </IconButton>
              <IconButton label={`Próximo: ${next.name}`} href={appHref(next.id)}>
                <CaretRight className="size-5" aria-hidden />
              </IconButton>
            </span>
            <span className="mx-1 hidden h-6 w-px bg-secondary sm:block" aria-hidden />
            <IconButton label="Sobre o app" onClick={() => setInfo((v) => !v)} pressed={info}>
              <Info className="size-5" aria-hidden />
            </IconButton>
            {hasEmbedded(embedId) && (
              <>
                <IconButton label="Recarregar" onClick={() => setReloadKey((n) => n + 1)}>
                  <ArrowCounterClockwise className="size-5" aria-hidden />
                </IconButton>
                <span className="hidden sm:contents">
                  <IconButton label="Tela cheia" onClick={() => setFull(true)}>
                    <ArrowsOut className="size-5" aria-hidden />
                  </IconButton>
                </span>
              </>
            )}
          </motion.header>
          {info && (
            <div
              role="dialog"
              aria-label={`Sobre ${app.name}`}
              className="fixed right-2 top-[72px] z-40 flex lg:absolute lg:right-0 lg:top-[52px] w-[min(380px,calc(100vw-32px))] flex-col gap-space-2 rounded-lg border border-secondary bg-background p-space-3 shadow-md"
            >
              <p className="text-body text-text-primary">{app.summary}</p>
              <ul className="flex flex-wrap gap-1" aria-label="Recursos">
                {app.features.map((f) => (
                  <li key={f} className="rounded-full bg-surface px-3 py-1 text-caption text-text-secondary">
                    {f}
                  </li>
                ))}
              </ul>
              <p className="text-caption text-text-secondary">{app.embeddedNote}</p>
              <div className="flex items-center gap-space-1 rounded-md bg-surface py-1 pl-space-2 pr-1">
                <TerminalWindow className="size-4 shrink-0 text-text-muted" aria-hidden />
                <code className="token min-w-0 flex-1 select-all truncate" title={app.run}>
                  {app.run.split('  →')[0]}
                </code>
                <IconButton label={copied ? 'Copiado' : 'Copiar comando'} onClick={copyRun}>
                  {copied ? <Check className="size-4 text-highlight" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                </IconButton>
              </div>
              <p className="text-caption text-text-secondary">{app.stack.join(' · ')}</p>
            </div>
          )}
        </div>

        <motion.div variants={fadeUp}>
          {hasEmbedded(embedId) ? (
            <EmbeddedApp id={embedId} hash={app.embed?.hash} name={app.name} reloadKey={reloadKey} full={full} onExitFull={exitFull} />
          ) : (
            <div className="grid grid-cols-1 gap-space-3 lg:grid-cols-2">
              {app.shots.map((s) => (
                <img key={s.src} src={s.src} alt={s.caption} loading="lazy" className="block h-auto w-full rounded-lg border border-secondary" />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </article>
  );
}
