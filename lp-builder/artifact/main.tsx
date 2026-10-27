import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createMemoryHistory, createRouter, type AnyRoute } from "@tanstack/react-router";
import { routeTree } from "@/routeTree.gen";
import { pagesReady } from "@artifact/storage";
import { startTheme } from "./theme";
import "./app.css";

startTheme();

const router = createRouter({
  // A raiz do artefato não usa o contexto de queryClient da raiz Lovable.
  routeTree: routeTree as unknown as AnyRoute,
  // Dentro de um iframe srcdoc não há URL própria: o histórico fica em memória.
  history: createMemoryHistory({ initialEntries: ["/"] }),
  defaultPreloadStaleTime: 0,
});

const el = document.getElementById("root")!;
el.innerHTML =
  '<p style="font:500 14px Inter,system-ui,sans-serif;padding:32px;color:var(--muted-foreground)">Carregando projetos…</p>';

pagesReady.finally(() => {
  el.innerHTML = "";
  createRoot(el).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
});
