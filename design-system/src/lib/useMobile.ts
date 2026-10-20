import { useEffect, useState } from 'react';

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

/** Grupo (tela do celular) de cada seção da documentação. */
export const MOBILE_GROUP: Record<string, 'inicio' | 'aplicacoes' | 'cores' | 'guias'> = {
  inicio: 'inicio',
  solicitacoes: 'inicio',
  aplicacoes: 'aplicacoes',
  cores: 'cores',
  logomarca: 'cores',
  tipografia: 'guias',
  componentes: 'guias',
  diretrizes: 'guias',
};
export const groupOf = (section: string) => MOBILE_GROUP[section] ?? 'inicio';

/** Abre o pop-up de nova solicitação de qualquer ponto da página. */
export const openNewRequest = () => window.dispatchEvent(new CustomEvent('gove:nova-solicitacao'));
/** Abre a busca do celular. */
export const openSearch = () => window.dispatchEvent(new CustomEvent('gove:buscar'));
