# Gove Design — apps de marketing da Gove Digital

Este repositório reúne seis aplicações independentes, acessadas por uma tela
inicial com um botão para cada uma:

| App | Pasta | O que faz | Stack |
| --- | --- | --- | --- |
| **Revisor de identidade visual** | raiz (`backend/`, `db/`, `frontend/`) | Audita peças prontas contra os tokens de marca | Node + Express + SQLite |
| **Gerador de Criativos GOVE** | [`criativos/`](criativos/) | Gera criativos de mídia paga (estático, lote, vídeo) dentro do manual de marca | TanStack Start + React (Vite) |
| **Gove Links** | [`links/`](links/) | Encurtador de links com rastreamento de cliques | TanStack Start + React + Supabase |
| **LP Builder** | [`lp-builder/`](lp-builder/) | Editor visual de landing pages com exportação de HTML | TanStack Start + React (Vite) |
| **Design System** | [`design-system/`](design-system/) | Documentação e UI Kit (tokens, tipografia, componentes) | React + Vite + Tailwind + Framer Motion |
| **Gove Print Studio** | [`print-studio/`](print-studio/) | PDFs de impressão do Kit de Boas-Vindas (CMYK, sangria, lote por município) | React + Fabric.js · Express + pdfkit + SQLite |

Cada app tem o próprio `package.json`, dependências e servidor; um não altera o
outro. Os scripts da raiz só encurtam os comandos:

```bash
npm start                  # tela inicial em http://localhost:3040 (revisor em /revisor/)

npm run criativos:install && npm run criativos:dev   # http://localhost:5173
npm run links:install     && npm run links:dev       # http://localhost:5174
npm run lp:install        && npm run lp:dev          # http://localhost:5175
# build de produção de cada um: criativos:build, links:build, lp:build
```

O Print Studio roda dentro do mesmo servidor do revisor, em `/print-studio/`
(`npm run print:install && npm run print:build` só é necessário ao alterar a interface).

O Design System também é servido pelo mesmo servidor, em `/design-system/`
(build de arquivo único em `design-system/dist/`; `npm run ds:install && npm run ds:build`
após alterar o código, `npm run ds:dev` para desenvolver).

Na tela inicial (`/`), "Revisor de identidade visual" abre `/revisor/`, "Print Studio" abre `/print-studio/` e "Design System" abre `/design-system/`; os
outros botões passam por `/criativos`, `/links` e `/lp`, que redirecionam para
o endereço de cada app definido em `CRIATIVOS_URL`, `LINKS_URL` e `LP_URL`
(padrão: as portas locais acima). Ao publicar, aponte essas variáveis para as
URLs públicas.

Os três apps de `criativos/`, `links/` e `lp-builder/` vieram do Lovable. As
pastas não estão ligadas à sincronização do Lovable: alterações feitas aqui não
voltam para lá, e vice-versa. O build de cada um gera um worker para Cloudflare
(padrão do `@lovable.dev/vite-tanstack-config`).

## Gove Links (`links/`)

Trazido do Lovable sem mudanças. Login por e-mail e senha do Supabase (contas
criadas pela administração), criação de links curtos, dashboard e
redirecionamento público em `/:slug` e `/r/:slug`, que registra o clique
(dispositivo, navegador, sistema e país vindos dos cabeçalhos da borda, sem IP).

Configuração: copie `links/.env.example` para `links/.env` e preencha com os
dados do projeto Supabase do app. O `.env` original não foi versionado (este
repositório é público). `SUPABASE_SERVICE_ROLE_KEY` é necessária no servidor
para o redirecionamento registrar cliques; `VITE_SHORT_DOMAIN` define um domínio
curto próprio. As tabelas (`short_links`, `link_clicks`) vivem no projeto
Supabase; o zip não trazia migrações delas.

## LP Builder (`lp-builder/`)

Trazido do Lovable. Editor visual com biblioteca de blocos (seção, linhas,
texto, CTA, imagem, card com ícone, vídeo, contagem regressiva, formulário RD
Station), presets de Hero, visualização desktop/mobile e exportação de HTML.
Os projetos ficam só no `localStorage` do navegador.

Única mudança: o e-mail e a senha de acesso estavam escritos no código e agora
vêm de `lp-builder/.env` (`VITE_LP_EMAIL`, `VITE_LP_PASSWORD`; ver
`.env.example`). A checagem continua no navegador, então os valores ficam
visíveis no JavaScript publicado.

## Design System (`design-system/`)

Documentação navegável e UI Kit no visual "Cyberpunk Premium / Urban Tech":
Dark Mode nativo, neon roxo e amarelo, cidade noturna ao fundo.

- `src/data/tokens.js` é a fonte única dos tokens (cores da paleta oficial —
  `#FFC72C #3D0099 #351F65 #F4F4F4 #2F3539 #A278DA #5B6770 #20133D #5AC2CD #16499F` —, escala tipográfica,
  espaçamento de 8px, raios, sombras e movimento). O `tailwind.config.js`
  importa esse arquivo, e a documentação lê os mesmos valores.
- Seções: hero com parallax, aplicações (cada app tem página própria em
  `#app-<id>`, navegável pela barra lateral e por botões: telas, recursos,
  stack e como rodar; servido pelo projeto, "Abrir aplicação" leva ao app e
  Revisor/Print Studio abrem ao vivo dentro da página), cores (cards com brilho da própria cor, cópia do
  HEX e contraste sobre o fundo, mais a paleta institucional do manual de
  marca), tipografia (Montserrat × Inter, nota do fallback impresso Helvetica),
  espaçamento, raio e sombras e componentes ao vivo (botões, cards, inputs).
- Animações com Framer Motion: entrada Fade In + Slide Up (600ms,
  `cubic-bezier(0.16, 1, 0.3, 1)`) disparada por Intersection Observer,
  cascata de 70ms nos grids, hover com `scale 1.02` em 250ms. Com "reduzir
  movimento" ativo no sistema, só a opacidade anima.
- As paisagens noturnas são desenhadas em canvas (`CityBackdrop.tsx`), sem
  imagens externas, com overlay escuro para não atrapalhar a leitura.

## Gove Print Studio (`print-studio/`)

Gera os PDFs prontos para gráfica dos 4 materiais do Kit de Boas-Vindas —
Flyer A4, Flyer 10x15cm, Adesivo 5x10cm e Display Acrílico A6 — personalizados
por município, conforme o briefing "Produtor de Layouts do Kit de Boas-Vindas".

- **Um motor de layout para tudo** (`shared/layout.js`): calcula cada elemento em
  milímetros; o preview (Fabric.js, no navegador) e o PDF (pdfkit, no servidor)
  desenham a mesma lista, com as mesmas Montserrat `.ttf` (Regular, SemiBold,
  Bold, Black — oficiais de JulietaUla/Montserrat, licença OFL, embutidas no PDF).
- **Produção gráfica**: sangria de 5 mm em todas as peças, área de segurança de
  5 mm, todas as cores em CMYK (logos e foto do mockup convertidos para JPEG
  CMYK a 300 dpi; nenhum objeto RGB), QR code `wa.me/55{ddd}{numero}` com
  correção de erro H, módulos K100 sobre branco sólido e mínimo de 20 mm.
- **Fundo**: gradiente a 135° escurecido em relação ao briefing — com
  `#25D366 → #1AA652`, nem branco (1,98:1) nem verde-escuro-2 (1,71:1) atingiam
  o contraste do H1. Decisão da Gove: `#128541 → #0F7A3B`, onde o texto branco
  fica entre 4,7:1 e 5,4:1.
- **Interface** (criada com o web-artifacts-builder: React + Tailwind +
  shadcn/ui, empacotada num único `web/bundle.html`): editor com seleção de
  layouts, município, logo do Banco do Brasil, ícones de serviços (Lucide,
  reordenáveis), imagem do mockup com recorte 9:16 e ajuste de enquadramento,
  textos editáveis, preview com sangria/corte/área de segurança e arraste
  travado na área de segurança; cadastro de municípios; logos fixos (Gove e
  Banco do Brasil); fila de exportação com verificação antes do download
  ("Sangria / Fontes embutidas / Cores em CMYK / Contraste QR") e `.zip` com um
  PDF por peça (`{layout}_{municipio}_{ddmmaaaa}.pdf`).
- **Dados**: SQLite + arquivos em `print-studio/data/` (fora do Git).

Pendências (`TODO_VALIDAR_GRAFICA` em `shared/tokens.js`): os CMYK dos verdes
são conversões aproximadas do HEX — validar com a gráfica (ou Pantone oficial)
antes da primeira tiragem. A marca d'água do WhatsApp é uma aproximação em
contorno (ícones Lucide); troque pelo contorno oficial em
`scripts/build-icons.mjs`. Os logos da Gove e do Banco do Brasil são enviados
em "Logos fixos". O PDF tem cores CMYK, mas não é PDF/X-1a certificado.

## Gerador de Criativos GOVE (`criativos/`)

Trazido do Lovable sem mudanças de comportamento: login restrito, Studio ao
vivo com 8 diagramações, gerador em lote, material colaborativo (especialista),
vídeo de 15 s (MP4 via ffmpeg.wasm), texto alternativo e a checagem de
conformidade de `src/lib/creative/brand.ts` (paleta travada, pares texto/fundo,
CTA com verbo de ação, limites de headline/subhead).

Configuração: copie `criativos/.env.example` para `criativos/.env` e preencha
`SESSION_SECRET` (≥ 32 caracteres), `GATE_EMAIL` e `GATE_PASSWORD`;
`PEXELS_API_KEY` é opcional (busca de fotos).

Única adaptação: os logos ficam hospedados no Lovable (`/__l5e/assets-v1/…`),
endereço que não existe fora dele. O app agora procura antes uma cópia em
`criativos/public/logos/` (ver o README dessa pasta); sem ela, mantém o
comportamento original (endereço do Lovable e, na falha, o texto "GOVE").


---

# Revisor de identidade visual — Gove Digital

Módulo que audita peças de marketing e apresentações da Gove Digital contra os
tokens de marca (paleta, gradientes, Montserrat, ícones, logomarca, margens e QR
code) e gera um relatório JSON + HTML, com preview anotado, empacotado em ZIP.

Stack: Node.js + Express + SQLite (better-sqlite3), no mesmo padrão do Gove
Print Studio (`/frontend`, `/backend`, `/db`), com `fabric`, `sharp`, `qrcode`,
`@fontsource/montserrat`, `lucide`, `@phosphor-icons/core` e `archiver`.

```bash
npm install
npm run db:init      # cria db/revisor.sqlite com os tokens iniciais
npm start            # http://localhost:3040
npm test
```

## Estrutura

```
backend/
  server.js                 API Express + arquivos estáticos do frontend
  services/auditService.js  detecta o modo, roda checagens, grava histórico e artefatos
  audit/modeA.js            Modo A — Fabric.js JSON (checagens exatas)
  audit/modeB.js            Modo B — PNG/JPG (sharp), com limitações explícitas
  audit/common.js           margens, espaçamento, formato dos itens
  lib/color.js              parse de cor, ΔE2000 (L*a*b*), contraste WCAG
  lib/fonts.js              variações da Montserrat (@fontsource/montserrat)
  lib/icons.js              identificação de ícones Lucide/Phosphor por nome ou paths
  lib/raster.js             paleta dominante (k-means em Lab), amostragem de regiões
  lib/qrcode.js             geração de QR code no padrão Gove
  report/                   relatório JSON, HTML, preview anotado e ZIP
db/
  schema.sql                tabelas brand_tokens e audit_history
  seed.js                   valores iniciais (com TODOs)
  database.js / init.js
  assets/logos/             arquivos oficiais da logomarca (TODO)
frontend/                   tela inicial (index.html) e interface do revisor (revisor/)
test/                       testes (node:test) e peças de exemplo
```

## O que falta preencher (TODOs)

Tudo em `db/seed.js`. Os valores atuais vêm do design system Gove (tema
Noturno) e estão marcados como provisórios; enquanto isso, o relatório avisa
que usou tokens provisórios.

| Item | Onde |
| --- | --- |
| Paleta HEX oficial | `COLORS` |
| Gradientes aprovados (stops + ângulo) | `GRADIENTS` (hoje só um exemplo) |
| Arquivos oficiais da logomarca (2 versões/cores) | `LOGOS` + arquivos em `db/assets/logos/` + `npm run db:init -- --hash-logos` |
| Ícones aprovados | `ICONS` (ou `icon_policy.mode = "set"` para aceitar qualquer Lucide/Phosphor) |
| Margens mínimas por tipo de peça | `MARGINS` |

Depois do primeiro boot, edite pela API (`PUT /api/tokens/:category/:name`) ou
rode `npm run db:init -- --reseed` para regravar a partir do `seed.js`.

## Modos de entrada

### Modo A — Vetorial (Fabric.js JSON), preferencial

Envie o resultado de `canvas.toJSON()` (idealmente com `width`/`height`, ou
informe o artboard). O Fabric carrega os objetos para obter a geometria real
(origem, escala, rotação, grupos) e as checagens usam as propriedades exatas:

- **Tipografia**: `fontFamily`/`fontWeight`/`fontStyle` de cada texto, inclusive
  trechos com estilo próprio (`styles`), contra as variações aprovadas
  (Regular, Bold, Italic, Black). Também avisa se a variação nem existe na
  Montserrat de referência.
- **Cor**: todo `fill`/`stroke` sólido contra a paleta por ΔE2000 (≤ 3 conforme,
  ≤ 6 atenção, > 6 fora da paleta; configurável).
- **Gradientes**: número e posição dos stops, cor de cada stop (ΔE) e ângulo
  visual (considera coords, `gradientTransform`, escala, flip e rotação).
- **Contraste**: cor do texto contra o que está pintado por baixo (sólido,
  gradiente no pior stop, ou imagem → revisão manual). WCAG 4.5:1 / 3:1.
- **Margens e espaçamento**: bbox real de textos, logos, ícones e QR codes até
  a borda do artboard e entre si.
- **Logomarca**: arquivo oficial (nome/asset id ou sha256 da data URL), filtros
  de cor, opacidade, cores embutidas, versão certa para o fundo, distorção,
  espelhamento e rotação.
- **Ícones**: por referência (`gove.icon`, `iconSet`/`iconName`, `name:
  "lucide:arrow-right"`, src `.../lucide/arrow-right.svg`) ou pela geometria
  dos paths, comparada com os pacotes Lucide e Phosphor. Paths pequenos sem
  correspondência viram alerta.
- **QR code**: fundo branco sólido (nunca gradiente/imagem), zona de silêncio,
  contraste dos módulos e tamanho mínimo.

Marcações opcionais nos objetos: `gove.role` = `logo` | `icon` | `qrcode` |
`background` | `shape`, e `gove.assetId` para logos.

### Modo B — Raster (PNG/JPG)

- Paleta dominante por quantização (k-means em L*a*b*) comparada com a paleta.
- Contraste, margens e QR code **somente onde as coordenadas vierem em
  metadados**: arquivo `.regions.json` enviado junto (veja
  `test/fixtures/post-raster.regions.json`) ou chunk PNG `gove:regions`. Sem
  metadados, esses itens são pulados e sinalizados.
- **Limitação:** nenhuma lib desta stack faz OCR, detecção de texto em imagem ou
  template-matching de logo. Tipografia, logomarca, ícones e gradientes saem
  como "não verificável com confiança neste modo — revisão manual recomendada".

## Status

- **Reprovado**: algum item ❌.
- **Aprovado com ressalvas**: nenhum ❌, mas algum ⚠️ (atenção ou revisão manual).
- **Aprovado**: tudo ✅.

## API

| Método | Rota | |
| --- | --- | --- |
| POST | `/api/audits` | multipart: `file`, `regions?`, `pieceType?`, `artboardWidth?`, `artboardHeight?` |
| GET | `/api/audits` · `/api/audits/:id` | histórico |
| GET | `/api/audits/:id/relatorio.html` · `/preview.png` · `/zip` | artefatos |
| GET/PUT/DELETE | `/api/tokens[/:category/:name]` | tokens de marca |
| GET | `/api/tokens/resolved` | tokens carregados + status dos arquivos de logo |
| POST | `/api/qrcode` | `{ text, format: "png" \| "svg" \| "fabric", width? }` |

`format: "fabric"` devolve os objetos Fabric (base branca + imagem marcada como
QR code) prontos para inserir numa peça nova; eles passam na checagem de QR code.
Cores ou tamanhos fora do padrão são corrigidos e listados no cabeçalho
`X-Gove-QR-Adjustments`.

## Login do ambiente

Todo o ambiente servido por `npm start` (tela inicial, Design System, Revisor, Print Studio) exige login com e-mail `@gove.digital`.

- Primeiro acesso: e-mail → código de 6 dígitos enviado ao e-mail → a pessoa cria a senha (mínimo 10 caracteres).
- Acessos seguintes: e-mail + senha. "Esqueci a senha" envia um novo código.
- Variáveis: `AUTH_SECRET` (obrigatória em produção), `AUTH_EMAIL_DOMAIN` (padrão `gove.digital`), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE=1`, `MAIL_FROM`. Sem SMTP em desenvolvimento, o código aparece no log do servidor. `AUTH_DISABLED=1` desliga o login (só desenvolvimento).

## Diretrizes de design

`docs/diretrizes-gove.md` reúne as regras de marca para pessoas e ferramentas de IA (apresentações, mídia, impressos, e-mails, páginas). O Design System mostra o documento na seção Diretrizes, com botão para copiar as instruções para IA.

## Logomarcas

Arquivos oficiais em `brand/logos/`; a escolha da versão por contraste (≥ 4,5:1) está em `brand/logos.js` (`pickLogo`).
