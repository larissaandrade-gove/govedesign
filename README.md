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
frontend/                   upload, resultado, gerador de QR e histórico
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
