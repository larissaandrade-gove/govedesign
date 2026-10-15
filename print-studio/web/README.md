# Interface do Gove Print Studio

React + TypeScript + Tailwind + shadcn/ui (scaffold do web-artifacts-builder),
empacotada pelo Parcel num único `bundle.html`, servido pelo Express em
`/print-studio/`. Ver o README da raiz do repositório.

```bash
pnpm install
pnpm run bundle   # gera bundle.html
```

## Build de artefato (sem servidor)

Versão 100% no navegador, num único HTML, embutida no Gove Design System
(iframe `srcdoc`):

```bash
pnpm run bundle:artifact   # → ../../design-system/src/embedded/print-studio.html
```

`vite.artifact.config.ts` troca `@/lib/api` por `src/lib/api.local.ts` (dados via
`artifact-runtime`, PDF com pdfkit no navegador, .zip com fflate) e `@/lib/fonts`
pela Montserrat embutida (`src/assets/fonts`, gerada por
`../scripts/subset-fonts.sh`). Nesse modo as imagens entram no PDF em RGB — a
verificação avisa para convertê-las para CMYK antes da gráfica.
