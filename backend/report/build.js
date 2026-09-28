// Montagem do relatório estruturado (JSON) a partir das checagens.
import { CATEGORY_LABELS, STATUS } from '../audit/common.js';
import { RASTER_LIMITATION } from '../audit/modeB.js';

export const MODES = {
  A: {
    code: 'A',
    name: 'Vetorial (Fabric.js JSON)',
    description: 'Checagens exatas sobre as propriedades dos objetos (fonte, cor, geometria, arquivos e paths), sem heurística.',
  },
  B: {
    code: 'B',
    name: 'Raster (PNG/JPG)',
    description: 'Checagens por amostragem de pixels com sharp. Itens sem dados vetoriais são marcados para revisão manual.',
  },
};

export const STATUS_OVERALL = {
  aprovado: { code: 'aprovado', label: 'Aprovado', icon: '✅' },
  aprovado_com_ressalvas: { code: 'aprovado_com_ressalvas', label: 'Aprovado com ressalvas', icon: '⚠️' },
  reprovado: { code: 'reprovado', label: 'Reprovado', icon: '❌' },
};

const ORDER = Object.keys(CATEGORY_LABELS);
const STATUS_ORDER = { fail: 0, warn: 1, manual: 2, pass: 3, skip: 4 };

export function overallStatus(checks) {
  if (checks.some((c) => c.status === 'fail')) return STATUS_OVERALL.reprovado;
  if (checks.some((c) => c.status === 'warn' || c.status === 'manual')) return STATUS_OVERALL.aprovado_com_ressalvas;
  return STATUS_OVERALL.aprovado;
}

function placeholderNotices(tokens) {
  const groups = [
    ['colors', 'paleta HEX'],
    ['gradients', 'gradientes'],
    ['icons', 'ícones aprovados'],
    ['logos', 'arquivos da logomarca'],
  ];
  const pending = groups.filter(([k]) => tokens[k].some((t) => t.placeholder)).map(([, l]) => l);
  if (Object.values(tokens.margins).some((m) => m.placeholder)) pending.push('margens mínimas');
  if (!pending.length) return [];
  return [
    `Tokens provisórios em uso (${pending.join(', ')}): os valores ainda não foram confirmados pela Gove Digital. ` +
      'Atualize-os em brand_tokens (ver TODOs em db/seed.js) para que o resultado seja definitivo.',
  ];
}

/**
 * @param {object} p
 * @param {'A'|'B'} p.mode
 * @param {{name:string, sha256?:string, size?:number, type?:string}} p.file
 * @param {object[]} p.checks
 */
export function buildReport({ mode, file, pieceType, artboard, checks, tokens, extra = {} }) {
  const sorted = [...checks].sort(
    (a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category) || STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
  );
  sorted.forEach((c, i) => {
    c.number = i + 1;
    c.id = `${c.category}-${i + 1}`;
    c.statusLabel = STATUS[c.status].label;
  });

  const counts = { pass: 0, warn: 0, fail: 0, manual: 0, skip: 0 };
  for (const c of sorted) counts[c.status] += 1;

  const categories = ORDER.filter((k) => sorted.some((c) => c.category === k)).map((k) => {
    const items = sorted.filter((c) => c.category === k);
    return { key: k, label: CATEGORY_LABELS[k], status: overallStatus(items).code, count: items.length };
  });

  const notices = [...placeholderNotices(tokens)];
  const limitations = [];
  if (mode === 'B') {
    limitations.push(RASTER_LIMITATION);
    if (!extra.regionSource) {
      limitations.push(
        'Nenhum metadado de regiões foi fornecido: contraste de texto, margens e QR code também ficaram sem verificação automática.',
      );
    }
  }
  if (mode === 'A' && extra.placeholderImages) {
    notices.push(
      `${extra.placeholderImages} imagem(ns) referenciadas por URL/arquivo não foram baixadas: a geometria foi preservada, mas o preview mostra um espaço vazio no lugar delas.`,
    );
  }

  return {
    schema: 'gove-revisor-identidade/1',
    generatedAt: new Date().toISOString(),
    file,
    pieceType: pieceType ?? null,
    artboard: artboard ?? null,
    mode: MODES[mode],
    status: overallStatus(sorted),
    summary: { total: sorted.length, ...counts },
    categories,
    limitations,
    notices,
    checks: sorted,
    ...(extra.palette ? { dominantPalette: extra.palette } : {}),
  };
}
