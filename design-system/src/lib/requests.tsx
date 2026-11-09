import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { currentUser, detectMode, submitTicket, watchSchedule, watchTickets, type Me, type Mode, type ScheduleState, type StoredTicket, type SubmitResult } from './tickets';

/** Tela do pop-up de solicitação. */
export type RequestView = 'frentes' | 'form' | 'feito' | 'pedidos';

type Requests = {
  mode: Mode | null;
  me: Me;
  /** Expediente vigente (a página só mostra os detalhes para a responsável). */
  expediente: ScheduleState | null;
  /** Pedidos de quem vê (todos, para a responsável). */
  list: StoredTicket[];
  isOpen: boolean;
  view: RequestView;
  setView: (v: RequestView) => void;
  /** Abre o pop-up por cima da página atual. */
  openRequest: (v?: RequestView) => void;
  closeRequest: () => void;
  /** Guarda um pedido enviado (ou reenviado) na lista sem esperar a próxima leitura. */
  remember: (t: StoredTicket) => void;
  /** Reenvia com o mesmo código, refazendo só os passos que falharam. */
  retry: (t: StoredTicket) => Promise<SubmitResult>;
};

const Ctx = createContext<Requests | null>(null);

/**
 * Provedor global das solicitações: modo (servidor, artefato ou local), quem
 * está vendo, expediente, pedidos e o pop-up. Fica acima de todas as telas,
 * inclusive o seletor de equipe, para o botão flutuante abrir o formulário sem
 * sair da página.
 */
export function RequestProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [me, setMe] = useState<Me>(null);
  const [expediente, setExpediente] = useState<ScheduleState | null>(null);
  const [list, setList] = useState<StoredTicket[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [view, setView] = useState<RequestView>('frentes');

  useEffect(() => {
    let alive = true;
    detectMode().then(async (m) => {
      if (!alive) return;
      setMode(m);
      const u = await currentUser(m);
      if (alive) setMe(u);
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => (mode ? watchTickets(mode, setList) : undefined), [mode]);
  useEffect(() => (mode ? watchSchedule(mode, setExpediente) : undefined), [mode]);

  const openRequest = useCallback((v: RequestView = 'frentes') => {
    setView((cur) => (v === 'frentes' && cur === 'form' ? cur : v)); // rascunho em andamento continua de onde parou
    setOpen(true);
  }, []);
  const closeRequest = useCallback(() => setOpen(false), []);
  const remember = useCallback((t: StoredTicket) => setList((l) => [t, ...l.filter((x) => x.id !== t.id)]), []);
  const retry = useCallback(
    async (t: StoredTicket) => {
      const r = await submitTicket(mode ?? 'local', t, { previous: t });
      remember(r.ticket);
      return r;
    },
    [mode, remember],
  );

  // Busca do celular e outros atalhos abrem o pop-up direto
  useEffect(() => {
    const on = () => openRequest('frentes');
    window.addEventListener('gove:nova-solicitacao', on);
    return () => window.removeEventListener('gove:nova-solicitacao', on);
  }, [openRequest]);

  const value = useMemo(() => ({ mode, me, expediente, list, isOpen, view, setView, openRequest, closeRequest, remember, retry }), [mode, me, expediente, list, isOpen, view, openRequest, closeRequest, remember, retry]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRequests(): Requests {
  const v = useContext(Ctx);
  if (!v) throw new Error('useRequests fora do RequestProvider');
  return v;
}
