// Modos C (Documento: PPTX, PDF, DOCX) e D (HTML): parser → modelo normalizado
// → verificador comum (docModel.js). Mesmo formato de relatório dos modos A/B.
import { verifyDocModel } from './docModel.js';
import { parseDocx } from './parsers/docx.js';
import { parseHtml, HTML_VIEWPORT } from './parsers/html.js';
import { parsePdf } from './parsers/pdf.js';
import { parsePptx } from './parsers/pptx.js';

export const DOC_FORMATS = {
  '.pptx': { format: 'PPTX', mode: 'C', parse: parsePptx },
  '.pdf': { format: 'PDF', mode: 'C', parse: parsePdf },
  '.docx': { format: 'DOCX', mode: 'C', parse: parseDocx },
  '.html': { format: 'HTML', mode: 'D', parse: parseHtml },
  '.htm': { format: 'HTML', mode: 'D', parse: parseHtml },
};

const COMMON_LIMITS = 'Gradientes e imagens/fotos (retratos, paisagens) não são analisados por escolha: o foco é cor da logomarca, cor do texto, tipografia e tamanhos mínimos.';
const LIMITS = {
  PPTX: [
    COMMON_LIMITS,
    'Cores e fontes vêm do XML do PowerPoint, com herança de layout, mestre e tema; texto dentro de imagens, SmartArt e gráficos não é lido.',
  ],
  DOCX: [
    COMMON_LIMITS,
    'Cores e fontes vêm do XML do Word (estilos, docDefaults e tema); estilos de tabela e texto dentro de imagens não são lidos. Cor automática conta como preto.',
  ],
  PDF: [
    COMMON_LIMITS,
    'Texto em PDF escaneado ou convertido em curvas não é lido (sem OCR). A logomarca só é identificada quando o PDF é marcado (tagged) com texto alternativo contendo “logo”/“gove”.',
  ],
  HTML: [
    COMMON_LIMITS,
    `Página renderizada a ${HTML_VIEWPORT} px de largura (iPhone), sem executar scripts; folhas de estilo, fontes e imagens externas podem não carregar — a família avaliada é a declarada no CSS.`,
  ],
};

/** @returns {{ format, mode, parse } | null} */
export const docFormatOf = (ext) => DOC_FORMATS[ext] ?? null;

export async function auditDocument({ ext, buffer, tokens }) {
  const f = DOC_FORMATS[ext];
  const model = await f.parse(buffer);
  const checks = verifyDocModel(model, tokens);
  const counts = { textos: model.texts.length, logomarcas: model.logos.length, ...(model.targets?.length ? { alvos: model.targets.length } : {}), ...model.units };
  return {
    checks,
    pieceType: null,
    artboard: null,
    preview: null,
    extra: { limitations: LIMITS[f.format], document: { format: f.format, ...counts } },
  };
}
