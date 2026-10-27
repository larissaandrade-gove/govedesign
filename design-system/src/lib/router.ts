import { useEffect, useState } from 'react';
import { APPS } from '../data/apps';

/**
 * Navegação por hash simples: "#app-criativos" abre a página do app; qualquer
 * outro hash ("#cores", "#componentes"…) mostra a documentação e rola até a seção.
 * Só usa letras, números e "-" no hash (funciona também dentro do artifact).
 */
export type View = { kind: 'docs'; section: string } | { kind: 'app'; appId: string };

function parse(): View {
  const h = window.location.hash.replace(/^#/, '');
  if (h.startsWith('app-')) {
    const id = h.slice(4);
    if (APPS.some((a) => a.id === id)) return { kind: 'app', appId: id };
  }
  return { kind: 'docs', section: h || 'inicio' };
}

export function useView() {
  const [view, setView] = useState<View>(parse);
  useEffect(() => {
    const on = () => setView(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return view;
}

export const appHref = (id: string) => `#app-${id}`;
