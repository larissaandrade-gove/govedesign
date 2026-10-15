import { useEffect, useState } from 'react';

/**
 * Tema da interface: claro (padrão, predominantemente branco) ou escuro.
 * Fica em <html data-gove-theme="…"> — os apps embutidos acompanham esse atributo.
 * A escolha é lembrada neste navegador quando o armazenamento local está disponível.
 */
export type Theme = 'light' | 'dark';
const KEY = 'gove-theme';
const EVENT = 'gove-theme-change';

function stored(): Theme {
  try {
    return window.localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function getTheme(): Theme {
  return document.documentElement.dataset.goveTheme === 'dark' ? 'dark' : 'light';
}

export function applyTheme(t: Theme) {
  document.documentElement.dataset.goveTheme = t;
  document.documentElement.style.colorScheme = t;
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function initTheme() {
  applyTheme(stored());
}

export function setTheme(t: Theme) {
  try {
    window.localStorage.setItem(KEY, t);
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
  applyTheme(t);
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, set] = useState<Theme>(getTheme);
  useEffect(() => {
    const on = () => set(getTheme());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return [theme, setTheme];
}
