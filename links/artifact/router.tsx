/**
 * Árvore de rotas do build do artefato (roteamento por código, histórico em
 * memória: um iframe `srcdoc` não tem URL própria). Sem login: o acesso ao
 * artefato já é controlado pelo compartilhamento do claude.ai.
 *
 * Rotas públicas /:slug e /r/:slug não existem aqui — dependem do servidor.
 * Em seu lugar, "Testar link" abre o destino e registra um clique.
 */
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { Route as CreateLinkFileRoute } from "@/routes/_authenticated/criar-link";
import { ArtifactShell } from "./components/ArtifactShell";
import { PublicUrlNotice } from "./components/LinkTools";
import { clicksCol, linksCol } from "./lib/store";
import { DashboardPage } from "./routes/dashboard";
import { LinkDetailPage } from "./routes/link-detail";
import { LinksPage } from "./routes/links-index";

/** Reflete na tela mudanças vindas do db compartilhado (outros visitantes). */
function LiveData() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const invalidate = () => void queryClient.invalidateQueries();
    const offA = linksCol.subscribe(invalidate);
    const offB = clicksCol.subscribe(invalidate);
    return () => {
      offA();
      offB();
    };
  }, [queryClient]);
  return null;
}

function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-sm text-muted-foreground">Este endereço não existe no Gove Links.</p>
      <Link
        to="/dashboard"
        className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Ir para o dashboard
      </Link>
    </div>
  );
}

function RouteError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="py-16 text-center">
      <h1 className="text-xl font-semibold">Esta página não carregou</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Tentar novamente
      </button>
    </div>
  );
}

const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: function Root() {
    const { queryClient } = rootRoute.useRouteContext();
    return (
      <QueryClientProvider client={queryClient}>
        <LiveData />
        <ArtifactShell>
          <Outlet />
        </ArtifactShell>
      </QueryClientProvider>
    );
  },
  notFoundComponent: NotFound,
  errorComponent: RouteError,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const linksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/links",
  component: LinksPage,
});

const linkDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/links/$id",
  component: LinkDetailPage,
});

/** Reaproveita a página "Criar link" do app publicado sem alterações. */
const CreateLinkPage = CreateLinkFileRoute.options.component!;
const createLinkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/criar-link",
  component: function CreateLink() {
    return (
      <>
        <CreateLinkPage />
        <div className="mt-6 max-w-xl">
          <PublicUrlNotice />
        </div>
      </>
    );
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  linksRoute,
  linkDetailRoute,
  createLinkRoute,
]);

export function createArtifactRouter() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 0, refetchOnWindowFocus: false, retry: 1 } },
  });
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/dashboard"] }),
    context: { queryClient },
    defaultPreloadStaleTime: 0,
  });
}
