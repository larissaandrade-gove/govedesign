import { createFileRoute } from "@tanstack/react-router";

// Verificação de publicação: o Gove Design System chama /saude e só libera o
// app (tira o "Em breve") quando o encurtador responde aqui com o domínio no ar.
export const Route = createFileRoute("/saude")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ ok: true, app: "gove-links" }), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "access-control-allow-origin": "*",
          },
        }),
    },
  },
});
