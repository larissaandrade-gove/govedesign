import { useEffect, useState } from 'react';
import { APPS } from '../data/apps';
import { isInstrucao, teamById, type InstrucaoId } from '../data/teams';
import { rememberTeam } from './team';

/**
 * Navegação por hash (funciona também dentro do artifact; só letras, números e "-"):
 * - "#equipes": seletor de equipe; "#equipe-<id>": studio da equipe (e a escolhe);
 * - "#app-<id>": página do app;
 * - "#instrucoes" e as seções de sempre ("#cores", "#tipografia", "#prompts"…): diretório Instruções;
 * - "#solicitacoes": pedidos ao time de design;
 * - qualquer outro ("", "#inicio", "#aplicacoes"…): studio da equipe lembrada, ou o seletor.
 */
export type View =
  | { kind: 'app'; appId: string }
  | { kind: 'equipes' }
  | { kind: 'studio' }
  | { kind: 'instrucoes'; section: InstrucaoId | null }
  | { kind: 'solicitacoes' };

function parse(): View {
  const h = window.location.hash.replace(/^#/, '');
  if (h.startsWith('app-')) {
    const id = h.slice(4);
    if (APPS.some((a) => a.id === id)) return { kind: 'app', appId: id };
  }
  if (h.startsWith('equipe-') && teamById(h.slice(7))) {
    rememberTeam(h.slice(7));
    return { kind: 'studio' };
  }
  if (h === 'equipes') return { kind: 'equipes' };
  if (h === 'instrucoes') return { kind: 'instrucoes', section: null };
  if (isInstrucao(h)) return { kind: 'instrucoes', section: h };
  if (h === 'solicitacoes') return { kind: 'solicitacoes' };
  return { kind: 'studio' };
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

/** Chave da página atual (troca de página = volta ao topo). */
export const viewKey = (v: View) => (v.kind === 'app' ? `app-${v.appId}` : v.kind === 'instrucoes' ? `instrucoes-${v.section ?? ''}` : v.kind);

export const appHref = (id: string) => `#app-${id}`;
