/**
 * Marcação simples dos textos: **negrito**, ==destaque== e quebras de linha.
 *
 * Nunca interpreta HTML: o conteúdo vira trechos de texto puro (o export
 * escapa cada trecho; o canvas os renderiza como texto React). Marcadores sem
 * par ficam como texto. Sem marcação, o HTML exportado é o de antes.
 */

export interface RichSpan {
  text: string;
  bold: boolean;
  highlight: boolean;
}

/** Linhas → trechos. */
export function parseRich(content: string): RichSpan[][] {
  return content.split(/\r?\n/).map(parseLine);
}

function parseLine(line: string): RichSpan[] {
  const spans: RichSpan[] = [];
  let bold = false;
  let highlight = false;
  let buf = "";
  const flush = () => {
    if (buf) spans.push({ text: buf, bold, highlight });
    buf = "";
  };
  let i = 0;
  while (i < line.length) {
    const two = line.slice(i, i + 2);
    if (two === "**" || two === "==") {
      const open = two === "**" ? bold : highlight;
      // Abre só se houver o marcador de fechamento adiante.
      if (open || line.indexOf(two, i + 2) !== -1) {
        flush();
        if (two === "**") bold = !bold;
        else highlight = !highlight;
        i += 2;
        continue;
      }
    }
    buf += line[i];
    i += 1;
  }
  flush();
  return spans;
}

/** O texto usa alguma marcação (ou quebra de linha)? */
export const hasRich = (content: string) =>
  parseRich(content).some((line, i) => i > 0 || line.some((s) => s.bold || s.highlight));

/** Texto sem marcação (para rótulos e auditoria). */
export const plainText = (content: string) =>
  parseRich(content)
    .map((line) => line.map((s) => s.text).join(""))
    .join(" ");
