/**
 * Entrada do build do artefato: app 100% no navegador, sem SSR, sem login e
 * sem funções de servidor. Usa as mesmas rotas de `src/routes` com histórico
 * em memória (o app roda num iframe `srcdoc`, sem URL própria).
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Link,
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
  useRouter,
} from "@tanstack/react-router";
import { syncTheme } from "@gove/runtime";

import { Route as IndexRouteImport } from "@/routes/index";
import { Route as StudioRouteImport } from "@/routes/studio";
import "./artifact.css";

syncTheme();

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Página não encontrada</h1>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Voltar ao gerador
        </Link>
      </div>
    </div>
  );
}

function ErrorView({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tente novamente. Se persistir, recarregue a página.</p>
        <button
          type="button"
          onClick={() => {
            void router.invalidate();
            reset();
          }}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

const rootRoute = createRootRoute({
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: ErrorView,
});

const IndexRoute = IndexRouteImport.update({
  id: "/",
  path: "/",
  getParentRoute: () => rootRoute,
} as any);
const StudioRoute = StudioRouteImport.update({
  id: "/studio",
  path: "/studio",
  getParentRoute: () => rootRoute,
} as any);

const routeTree = rootRoute.addChildren([IndexRoute, StudioRoute]);

const router = createRouter({
  routeTree,
  history: createMemoryHistory({ initialEntries: ["/"] }),
  defaultPreloadStaleTime: 0,
});

// Volta ao topo ao trocar de tela (não há scroll restoration por URL).
router.subscribe("onResolved", () => window.scrollTo(0, 0));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
