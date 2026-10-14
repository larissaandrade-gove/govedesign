import { createFileRoute } from "@tanstack/react-router";

function page(title: string, message: string, status: number) {
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${title} — Gove Links</title>
<style>
  :root { color-scheme: light }
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#f7f8fa;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif; color:#0f172a; padding:24px }
  .card { max-width:420px; text-align:center; background:#fff; border:1px solid #e6e8ee;
    border-radius:14px; padding:40px 32px }
  .mark { font-size:11px; font-weight:800; letter-spacing:.18em; text-transform:uppercase; color:#0f172a; opacity:.55 }
  h1 { font-size:20px; margin:20px 0 8px; letter-spacing:-.01em }
  p { font-size:14px; line-height:1.6; color:#5b6478; margin:0 }
</style></head>
<body><div class="card"><div class="mark">Gove Links</div>
<h1>${title}</h1><p>${message}</p></div></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/r/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const slug = String(params.slug ?? "")
          .toLowerCase()
          .trim();

        if (!slug) {
          return page(
            "Link não encontrado",
            "O endereço pode estar incorreto ou não estar mais disponível.",
            404,
          );
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { parseUserAgent, readGeoHeaders } = await import(
            "@/lib/click-tracking.server"
          );

          // Somente os campos mínimos necessários para o redirecionamento.
          const { data: link, error } = await supabaseAdmin
            .from("short_links")
            .select("id, final_url, is_active")
            .eq("slug", slug)
            .maybeSingle();

          if (error) throw error;

          if (!link) {
            return page(
              "Link não encontrado",
              "O endereço pode estar incorreto ou não estar mais disponível.",
              404,
            );
          }

          if (!link.is_active) {
            return page(
              "Este link não está disponível",
              "O responsável pela campanha desativou este link.",
              410,
            );
          }

          const userAgent = request.headers.get("user-agent");
          const { device_type, browser, operating_system } = parseUserAgent(userAgent);
          const geo = readGeoHeaders(request.headers);

          await supabaseAdmin.from("link_clicks").insert({
            short_link_id: link.id,
            user_agent: userAgent,
            referer: request.headers.get("referer"),
            device_type,
            browser,
            operating_system,
            ...geo,
          });

          return new Response(null, {
            status: 302,
            headers: { location: link.final_url, "cache-control": "no-store" },
          });
        } catch (err) {
          console.error("[redirect] falha ao processar slug", { slug });
          if (err instanceof Error) console.error("[redirect]", err.message);
          return page(
            "Não foi possível processar este link",
            "Ocorreu um erro ao localizar o destino. Tente novamente em alguns instantes.",
            500,
          );
        }
      },
    },
  },
});
