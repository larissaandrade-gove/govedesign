// Logomarca oficial da Gove (brand/logos) no modo servidor: o backend serve os
// arquivos em /print-studio/marca/. (No build de artefato, o alias troca este
// módulo por brand.embedded.ts, com os arquivos embutidos.)

/** URL de um arquivo da logomarca oficial (ex.: "gove-logo-roxo.webp"). */
export const brandLogoUrl = (file: string) => `marca/${file}`;
