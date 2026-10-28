# Publicar o Gove Links (time de tecnologia)

Enquanto o encurtador não estiver publicado na web, o Gove Design System mostra o
app como **Em breve**: os links curtos (`https://go.gove.digital/<slug>`) só
funcionam fora da plataforma quando um servidor responde nesse domínio.

O Design System libera o app sozinho quando os dois pontos abaixo valem:

1. `links/publicacao.json` traz o endereço público (ou o servidor Gove tem a
   variável `LINKS_PUBLIC_URL`);
2. `GET <endereço>/saude` responde `{ "ok": true, "app": "gove-links" }`.

## Passo a passo

1. **Supabase** — crie as tabelas `short_links` e `link_clicks` com as colunas de
   `src/integrations/supabase/types.ts` (o `link_clicks.short_link_id` referencia
   `short_links.id`). Configure no servidor (nunca no git) `SUPABASE_URL`,
   `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e as `VITE_SUPABASE_*`
   (veja `.env.example`).
2. **Build e hospedagem** — publique o build TanStack Start desta pasta
   (`npm run build`; a configuração Lovable gera para Cloudflare por padrão, ou
   rode em Node). As rotas `/:slug` e `/r/:slug` fazem o redirecionamento 302 e
   registram o clique; `/saude` é a verificação de publicação.
3. **DNS** — crie um `CNAME` de `go.gove.digital` para o host da publicação e
   ative HTTPS.
4. **Domínio curto no app** — defina `VITE_SHORT_DOMAIN=https://go.gove.digital`
   no build.
5. **Conferência** — `curl https://go.gove.digital/saude` deve responder
   `{"ok":true,"app":"gove-links"}`, e um slug de teste deve redirecionar.
6. **Liberação no Design System** — preencha `links/publicacao.json`
   (`{ "url": "https://go.gove.digital" }`), rode `npm run build` em
   `design-system/` e publique. No servidor Gove, basta definir
   `LINKS_PUBLIC_URL`. O selo "Em breve" some e o app passa a abrir a versão
   publicada (em nova aba no claude.ai).

Os links criados na versão de demonstração do Design System ficaram guardados só
nela e não existem no Supabase: recrie no app publicado os que forem usados em
campanhas.
