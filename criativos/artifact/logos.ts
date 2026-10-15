/**
 * Logos embutidos no HTML do artefato (não há servidor de arquivos estáticos).
 * Qualquer arquivo colocado em `criativos/public/logos/` com o nome original
 * (Asset_2.png, Asset_6.png, Asset_7.png, Asset_8.png) entra como data URL no
 * próximo `build:artifact`. Sem o arquivo, o renderer desenha o texto "GOVE".
 */
const files = import.meta.glob("../public/logos/*.{png,webp,jpg,jpeg,svg}", {
  eager: true,
  query: "?inline",
  import: "default",
}) as Record<string, string>;

const byName = new Map(Object.entries(files).map(([path, url]) => [path.split("/").pop()!, url]));

/** Data URL do logo cujo endereço original termina com o mesmo nome de arquivo. */
export function embeddedLogo(originalUrl: string): string | null {
  return byName.get(originalUrl.split("/").pop() ?? "") ?? null;
}

export const embeddedLogoCount = byName.size;
