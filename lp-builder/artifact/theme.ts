import { useSyncExternalStore } from "react";
import { currentTheme, syncTheme, type Theme } from "@gove/runtime";

let theme: Theme = "light";
const listeners = new Set<() => void>();

/** Aplica o tema (claro por padrão) e acompanha o Design System. */
export function startTheme() {
  syncTheme((t) => {
    theme = t;
    listeners.forEach((fn) => fn());
  });
  theme = currentTheme();
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => theme,
  );
}
