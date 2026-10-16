/**
 * Logomarcas oficiais (brand/logos/) no build do artefato.
 *
 * - Importar um arquivo de brand/logos/ devolve uma data URL já reduzida
 *   (sharp, em tempo de build): o HTML único continua leve e sem rede.
 * - O favicon usa o símbolo escolhido por `pickLogo` (brand/logos.js) para
 *   o fundo claro da aba.
 */
import path from "node:path";
import sharp from "sharp";
import type { Plugin } from "vite";
import { pickLogo } from "../../brand/logos.js";

/** Altura máxima (px) dos derivados: 3× o maior uso na interface. */
const HEIGHT = { simbolo: 192, logotipo: 120 } as const;

export function goveLogos(repoRoot: string): Plugin {
  const dir = path.join(repoRoot, "brand", "logos") + path.sep;
  const cache = new Map<string, string>();

  async function dataUrl(file: string): Promise<string> {
    const hit = cache.get(file);
    if (hit) return hit;
    const name = path.basename(file);
    const kind = name.startsWith("gove-simbolo") ? "simbolo" : "logotipo";
    const img = sharp(file).resize({ height: HEIGHT[kind], withoutEnlargement: true });
    const out = name.endsWith(".png")
      ? `data:image/png;base64,${(await img.png({ compressionLevel: 9, palette: true }).toBuffer()).toString("base64")}`
      : `data:image/webp;base64,${(await img.webp({ quality: 90, alphaQuality: 100 }).toBuffer()).toString("base64")}`;
    cache.set(file, out);
    return out;
  }

  return {
    name: "gove-official-logos",
    enforce: "pre",
    async load(id) {
      const file = id.split("?")[0]!;
      if (!file.startsWith(dir) || !/\.(png|webp)$/.test(file)) return null;
      return `export default ${JSON.stringify(await dataUrl(file))};`;
    },
    async transformIndexHtml() {
      const icon = pickLogo("#FFFFFF", "simbolo") as { file: string };
      return [
        {
          tag: "link",
          attrs: { rel: "icon", type: "image/png", href: await dataUrl(path.join(dir, icon.file)) },
          injectTo: "head",
        },
      ];
    },
  };
}
