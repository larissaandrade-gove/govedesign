import { useSyncExternalStore } from 'react';
import { teamById, type Team } from '../data/teams';

/**
 * Equipe escolhida no seletor: lembrada neste navegador quando há armazenamento
 * local (sem ele, vale só nesta visita). "#equipe-<id>" também escolhe a equipe.
 */
const KEY = 'gove-equipe';
const listeners = new Set<() => void>();

function stored(): string | null {
  try {
    return teamById(window.localStorage.getItem(KEY))?.id ?? null;
  } catch {
    return null;
  }
}

let current: string | null = stored();

export function rememberTeam(id: string) {
  if (!teamById(id) || current === id) return;
  current = id;
  try {
    window.localStorage.setItem(KEY, id);
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
  // Avisa depois do render em curso (a troca pode vir da leitura do hash)
  queueMicrotask(() => listeners.forEach((l) => l()));
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useTeam(): Team | null {
  return teamById(useSyncExternalStore(subscribe, () => current));
}

export const teamHref = (id: string) => `#equipe-${id}`;
