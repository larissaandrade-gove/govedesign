import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Ticket, X } from '@phosphor-icons/react';
import { LEAD_HOURS } from '../../../shared/tickets.js';
import { useRequests } from '../lib/requests';

const TIP_KEY = 'gove:dica-solicitacao';
const tipSeen = () => {
  try {
    return window.localStorage.getItem(TIP_KEY) === 'vista';
  } catch {
    return true; // sem armazenamento: não insiste a cada página
  }
};
const markTipSeen = () => {
  try {
    window.localStorage.setItem(TIP_KEY, 'vista');
  } catch {
    /* sem armazenamento */
  }
};

/**
 * Botão único de Solicitações: redondo (56 px), no canto inferior direito de
 * todas as telas, na cor de ação. Abre o formulário em pop-up por cima da
 * página. Um balão explica o que é na primeira visita e ao passar o mouse.
 * `aboveBar`: no celular, fica acima da navigation bar.
 */
export function RequestFab({ aboveBar = false }: { aboveBar?: boolean }) {
  const { openRequest, isOpen } = useRequests();
  const [tip, setTip] = useState<'off' | 'first' | 'hover'>('off');
  const button = useRef<HTMLButtonElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const id = useId();

  // Primeira visita: o balão aparece sozinho (sem roubar o foco) até ser fechado
  useEffect(() => {
    if (tipSeen()) return;
    const t = setTimeout(() => setTip((v) => (v === 'off' ? 'first' : v)), 900);
    return () => clearTimeout(t);
  }, []);
  // O formulário aberto esconde o balão
  useEffect(() => {
    if (isOpen) setTip('off');
  }, [isOpen]);

  const dismiss = useCallback((focusButton = false) => {
    markTipSeen();
    setTip('off');
    if (focusButton) button.current?.focus();
  }, []);

  // Esc fecha o balão
  useEffect(() => {
    if (tip === 'off') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const inside = wrap.current?.contains(document.activeElement);
      dismiss(Boolean(inside));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tip, dismiss]);

  const showHover = () => {
    clearTimeout(hideTimer.current);
    setTip((v) => (v === 'off' ? 'hover' : v));
  };
  const hideHover = () => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setTip((v) => (v === 'hover' ? 'off' : v)), 200);
  };

  const open = () => {
    dismiss();
    openRequest('frentes');
  };

  const bottom = aboveBar ? 'calc(96px + env(safe-area-inset-bottom, 0px))' : 'calc(16px + env(safe-area-inset-bottom, 0px))';

  return (
    <div
      ref={wrap}
      data-request-fab
      className="fixed z-40 flex flex-col items-end gap-space-1 lg:!bottom-space-3 lg:!right-space-3"
      style={{ bottom, right: 'max(16px, env(safe-area-inset-right, 0px))' }}
      onMouseEnter={showHover}
      onMouseLeave={hideHover}
      onFocus={(e) => {
        const t = e.target as HTMLElement;
        if (t === button.current && t.matches(':focus-visible')) showHover();
      }}
      onBlur={(e) => !wrap.current?.contains(e.relatedTarget as Node) && hideHover()}
    >
      <AnimatePresence>
        {tip !== 'off' && (
          <motion.div
            key="tip"
            role="dialog"
            aria-labelledby={`${id}-t`}
            aria-describedby={`${id}-d`}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="relative w-[min(300px,calc(100vw-32px))] origin-bottom-right rounded-lg border border-secondary bg-background p-space-2 pr-12 text-left shadow-md"
          >
            <p id={`${id}-t`} className="font-display text-body font-semibold text-text-primary">
              Solicitações ao design
            </p>
            <p id={`${id}-d`} className="mt-1 text-caption text-text-secondary">
              Precisa de algo do time de design? Abra uma solicitação aqui: prazo mínimo de {LEAD_HOURS.normal} h úteis ({LEAD_HOURS.alta} h na prioridade alta).
            </p>
            {tip === 'first' && (
              <button type="button" onClick={open} className="mt-space-1 inline-flex min-h-11 items-center text-caption font-semibold text-link">
                Abrir solicitação
              </button>
            )}
            <button
              type="button"
              onClick={() => dismiss(true)}
              aria-label="Fechar dica"
              title="Fechar dica"
              className="absolute right-1 top-1 flex size-11 items-center justify-center rounded-md text-text-secondary hover:bg-secondary/50 hover:text-text-primary"
            >
              <X className="size-4" aria-hidden />
            </button>
            {/* Seta apontando para o botão */}
            <span aria-hidden className="absolute -bottom-[7px] right-[22px] size-3 rotate-45 border-b border-r border-secondary bg-background" />
          </motion.div>
        )}
      </AnimatePresence>
      <button
        ref={button}
        type="button"
        onClick={open}
        aria-label="Nova solicitação ao time de design"
        aria-haspopup="dialog"
        aria-describedby={tip !== 'off' ? `${id}-d` : undefined}
        className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-glow-yellow transition-[box-shadow,transform] duration-200 hover:scale-105 hover:shadow-glow-yellow-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Ticket className="size-6" weight="bold" aria-hidden />
      </button>
    </div>
  );
}
