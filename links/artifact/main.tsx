import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { syncTheme } from "@gove/runtime";

import "./artifact.css";
import { createArtifactRouter } from "./router";

// Claro por padrão; acompanha o data-theme do Design System quando embutido.
syncTheme();

const router = createArtifactRouter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
