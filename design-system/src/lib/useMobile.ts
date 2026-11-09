import { useEffect, useState } from 'react';
import type { View } from './router';

const QUERY = '(max-width: 1023px)';

/** Celular e tablet em pé (abaixo do breakpoint lg): navegação por telas, com barra de abas. */
export function useMobile() {
  const [mobile, setMobile] = useState(() => window.matchMedia(QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const on = () => setMobile(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return mobile;
}

/** Destino da navegação principal (navigation bar / rail) de cada página. */
export type Group = 'inicio' | 'instrucoes' | 'solicitacoes' | 'equipes';
export const groupOf = (view: View): Group =>
  view.kind === 'instrucoes' ? 'instrucoes' : view.kind === 'solicitacoes' ? 'solicitacoes' : view.kind === 'equipes' ? 'equipes' : 'inicio';

/** Abre o pop-up de nova solicitação por cima da página atual (provedor global em lib/requests.tsx). */
export const openNewRequest = () => window.dispatchEvent(new CustomEvent('gove:nova-solicitacao'));
/** Abre a busca do celular. */
export const openSearch = () => window.dispatchEvent(new CustomEvent('gove:buscar'));
