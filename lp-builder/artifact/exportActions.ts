/** Download e cópia do código exportado, compatíveis com o iframe do artefato. */
import { toast } from "sonner";
import { saveFile } from "@gove/runtime";
import { slugify } from "@/lib/gove/export";

export async function downloadCode(nome: string, code: string) {
  const filename = `landing-page-${slugify(nome)}.html`;
  const outcome = await saveFile(filename, new Blob([code], { type: "text/html;charset=utf-8" }));
  if (outcome === "saved") toast.success(`Arquivo ${filename} pronto.`);
  else if (outcome === "error")
    toast.error("Não foi possível baixar o arquivo. Use “Copiar código”.");
}

/** Copia texto; usa a API de área de transferência e, se bloqueada, execCommand. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* permissão negada no iframe: tenta o caminho antigo */
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
