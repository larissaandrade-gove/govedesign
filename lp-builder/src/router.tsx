import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// After a new deploy the old hashed chunks disappear, so a tab left open fails
// with "Failed to fetch dynamically imported module" and renders a blank screen.
// Reload once to pick up the fresh asset manifest instead of dying.
const RELOAD_FLAG = "gove-chunk-reload";

function recoverFromStaleChunk() {
  if (typeof window === "undefined") return;
  const reloadOnce = () => {
    try {
      if (sessionStorage.getItem(RELOAD_FLAG)) return;
      sessionStorage.setItem(RELOAD_FLAG, "1");
    } catch {
      /* storage unavailable — reload anyway */
    }
    window.location.reload();
  };
  const isStaleChunkError = (value: unknown) =>
    /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
      value instanceof Error ? value.message : String(value ?? ""),
    );

  window.addEventListener("vite:preloadError", reloadOnce);
  window.addEventListener("error", (event) => {
    if (isStaleChunkError(event.error ?? event.message)) reloadOnce();
  });
  window.addEventListener("unhandledrejection", (event) => {
    if (isStaleChunkError(event.reason)) reloadOnce();
  });
  // The flag intentionally lives for the whole tab session: at most one reload,
  // so a persistent failure surfaces as an error instead of a refresh loop.

}

recoverFromStaleChunk();

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};

