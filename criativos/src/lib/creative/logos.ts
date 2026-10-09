import asset2 from "@/assets/Asset_2.png.asset.json";
import asset6 from "@/assets/Asset_6.png.asset.json";
import asset7 from "@/assets/Asset_7.png.asset.json";
import asset8 from "@/assets/Asset_8.png.asset.json";

export type LogoOption = {
  id: string;
  label: string;
  url: string;
  /** "light" = para fundos claros (wordmark roxo); "dark" = para fundos escuros (wordmark branco). */
  variant: "light" | "dark";
  /** Possui o sorriso dourado — não pode ser aplicado sobre fundo/placa dourada. */
  hasGold: boolean;
};

export const LOGO_OPTIONS: LogoOption[] = [
  {
    id: "purple-gold",
    label: "Wordmark roxo + sorriso dourado",
    url: asset6.url,
    variant: "light",
    hasGold: true,
  },
  {
    id: "purple",
    label: "Wordmark roxo monocromático",
    url: asset7.url,
    variant: "light",
    hasGold: false,
  },
  {
    id: "white-gold",
    label: "Wordmark branco + sorriso dourado",
    url: asset2.url,
    variant: "dark",
    hasGold: true,
  },
  {
    id: "white",
    label: "Wordmark branco monocromático",
    url: asset8.url,
    variant: "dark",
    hasGold: false,
  },
];


/**
 * Cópia local opcional dos logos, para rodar fora da hospedagem do Lovable
 * (onde `/__l5e/assets-v1/*` não existe). Coloque os arquivos em
 * `public/logos/` com o nome original (Asset_2.png, Asset_6.png…).
 */
const LOCAL_LOGO_DIR = "/logos/";
const localLogoUrl = (url: string) => LOCAL_LOGO_DIR + (url.split("/").pop() ?? "");

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar logo: ${url}`));
    img.src = url;
  });
}

export async function loadLogoLibrary(): Promise<Record<string, HTMLImageElement>> {
  const entries = await Promise.all(
    LOGO_OPTIONS.map(
      async (o) =>
        [o.id, await loadImageFromUrl(localLogoUrl(o.url)).catch(() => loadImageFromUrl(o.url))] as const,
    ),
  );
  return Object.fromEntries(entries);
}
