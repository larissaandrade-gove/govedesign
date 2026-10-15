/**
 * Raiz do app no build do artefato (substitui src/routes/__root.tsx):
 * só cliente, sem <html>/<head>, sem login e sem relatório de erros externo.
 */
import { Link, Outlet, createRootRoute, type ErrorComponentProps } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "./theme";

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold text-foreground">Página não encontrada</h1>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Voltar aos projetos
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorView({ error, reset }: ErrorComponentProps) {
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold text-foreground">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : String(error)}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

function Root() {
  const theme = useTheme();
  return (
    <>
      <Outlet />
      <Toaster position="bottom-right" richColors theme={theme} />
    </>
  );
}

export const Route = createRootRoute({
  component: Root,
  notFoundComponent: NotFound,
  errorComponent: ErrorView,
});
