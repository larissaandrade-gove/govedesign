# VectorCraft — ferramenta interna da Gove

[VectorCraft](https://github.com/storytold/vectorcraft) é um editor vetorial de código aberto (MIT/Apache-2.0, versão alfa), escrito em Rust. Ele abre e salva PDF, AI, EPS, SVG e DXF. Aqui ele roda no navegador (WebAssembly) e é uma ferramenta **interna**: a equipe e os agentes o usam para revisar e diagramar os arquivos gerados por cada app (impressos do Print Studio, criativos, LPs) antes da entrega. Ele não faz parte do Design System nem aparece para quem usa o sistema.

## O que a barra Gove faz

| Botão | O que faz |
|---|---|
| Abrir peça | Abre PDF, AI, EPS, SVG, DXF, EMF/WMF, PSD ou imagem. Cada arquivo vira uma aba. |
| Amostras GOVE / BB | Cria amostras CMYK globais com os mesmos valores do Print Studio (`print-studio/shared/tokens.js`). As da BB trazem os Pantone do guia. |
| Converter para CMYK | Passa o documento para CMYK e separa as cores RGB pelas configurações de cor. |
| Checar impressão | Mostra os avisos do PDF/X-4, como imagens RGB que serão convertidas e efeitos aproximados, e as fontes ausentes ou substituídas. |
| Exportar PDF/X-4 | PDF 1.6 com vetores e texto preservados (fontes embutidas), cores convertidas para CMYK, sangria do documento e marcas de corte. |
| PDF/X-1a | Para gráficas que exigem PDF 1.3: a transparência é achatada, e peças com degradê e transparência podem virar uma imagem CMYK de alta resolução. |

## Como usar

```bash
npm run vectorcraft          # http://localhost:3041/ (só nesta máquina)
```

Abra o arquivo exportado pelo app (por exemplo, o PDF baixado da fila do Print Studio) com **Abrir peça**. Agentes podem dirigir o editor com Playwright pela API `window.vectorcraft` da página.

Regras que continuam valendo:

- O QR code é sempre preto (#000000, K100) sobre branco.
- A identidade Banco do Brasil usa só a paleta BB, com texto em contraste de pelo menos 4,5:1.

Montserrat e as fontes BB, as mesmas dos PDFs do Print Studio, são carregadas no editor ao abrir. Assim, o texto das peças abre como texto editável na fonte certa.

A mesma pasta guarda também os `.ttf` de Montserrat e BB, em `fonts/`.

## Arquivos

- `web/index.html`, `web/main.js`, `web/boot.js` e `web/palettes.js`: a barra Gove e o carregador.
- `scripts/serve.mjs`: servidor local de `dist/` (`npm run vectorcraft`).
- `scripts/build-web.mjs`: monta `vectorcraft/dist/index.html` e a pasta `vectorcraft/dist/vectorcraft/`. A pasta guarda o `.js` do wasm-bindgen, as licenças e o `.wasm` em gzip, dividido em partes de 12 MB com extensão `.wasm` (`parts.json`), porque cada arquivo de apoio do artefato tem limite de 15 MB. O navegador junta e descompacta as partes.
- `patches/`: o script aplica estes patches no código do VectorCraft antes de compilar.
  - `web-clock.patch` dá à build web o relógio do navegador. Sem ele, o PDF/X fica sem data de criação e a exportação é recusada.
  - `web-add-font.patch` cria `vectorcraft.addFont(bytes)` para a página carregar as fontes da marca.

## Recompilar o editor

```bash
rustup target add wasm32-unknown-unknown            # Rust 1.95 ou mais novo
cargo install wasm-bindgen-cli --version 0.2.129    # a versão do Cargo.lock do VectorCraft
cargo install wasm-opt                              # opcional: deixa o .wasm menor (otimiza para tamanho, com LTO completo)
node vectorcraft/scripts/build-web.mjs --src <pasta do código-fonte do VectorCraft>
```

Para mudar só a barra Gove, rode `npm run vectorcraft:build`. O `.wasm` que já está montado é reaproveitado.

## Servidor

O `serve.mjs` só escuta em 127.0.0.1 e entrega o `.wasm` com `Content-Type: application/wasm`. Em localhost o navegador libera WebGPU; sem ele, o editor usa WebGL2.
