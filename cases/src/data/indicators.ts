// Indicadores de um case de município: unidade e formatação pt-BR. Os ids e as unidades
// são o contrato com o conector "Gove Grafana": o mapa painel → indicador fica no
// servidor, em backend/grafana/indicators.json (por isso `source` fica vazio aqui).

export type Unit = 'numero' | 'brl' | 'pct' | 'nota' | 'lista';

/** Painel/consulta do Grafana que alimenta o indicador (reservado; o mapa vigente fica em backend/grafana/indicators.json). */
export type GrafanaPanelRef = { dashboardUid?: string; panelTitle?: string; panelId?: number; query?: string };

export type IndicatorId =
  | 'atendimentos'
  | 'ganho_financeiro'
  | 'arrecadacao_pos_disparo'
  | 'aumento_arrecadacao_pct'
  | 'aumento_arrecadacao_valor'
  | 'taxa_abertura'
  | 'avaliacao_media'
  | 'avaliacao_positiva'
  | 'funcionalidades';

export type IndicatorDef = {
  id: IndicatorId;
  label: string;
  /** Rótulo curto para os KPIs da peça (até ~32 caracteres). */
  short: string;
  unit: Unit;
  /** Aceita antes/depois para o gráfico simples. */
  comparison: boolean;
  /** Dica do campo — exemplos sempre marcados como ilustrativos ("ex.:"). */
  placeholder: string;
  help?: string;
  /** Rótulo curto para eixos de gráfico. */
  chartLabel?: string;
  source?: GrafanaPanelRef;
};

export const INDICATORS: IndicatorDef[] = [
  { id: 'atendimentos', label: 'Atendimentos', short: 'atendimentos realizados', unit: 'numero', comparison: true, placeholder: 'ex.: 1.234' },
  { id: 'ganho_financeiro', label: 'Ganho financeiro', short: 'de ganho financeiro', unit: 'brl', comparison: false, placeholder: 'ex.: 1.200.000' },
  {
    id: 'arrecadacao_pos_disparo',
    label: 'Arrecadação após disparo',
    short: 'arrecadados após o disparo',
    unit: 'brl',
    comparison: true,
    placeholder: 'ex.: 350.000',
  },
  {
    id: 'aumento_arrecadacao_pct',
    label: 'Aumento de arrecadação entre munícipes que receberam disparo (%)',
    short: 'de aumento na arrecadação com disparo',
    chartLabel: 'Aumento de arrecadação',
    unit: 'pct',
    comparison: false,
    placeholder: 'ex.: 12,5',
  },
  {
    id: 'aumento_arrecadacao_valor',
    label: 'Aumento de arrecadação entre munícipes que receberam disparo (R$)',
    short: 'a mais na arrecadação com disparo',
    unit: 'brl',
    comparison: false,
    placeholder: 'ex.: 80.000',
  },
  { id: 'taxa_abertura', label: 'Taxa de abertura', short: 'de taxa de abertura', chartLabel: 'Taxa de abertura', unit: 'pct', comparison: false, placeholder: 'ex.: 45' },
  { id: 'avaliacao_media', label: 'Avaliação média', short: 'de avaliação média', unit: 'nota', comparison: false, placeholder: 'ex.: 4,5' },
  {
    id: 'avaliacao_positiva',
    label: 'Índice de avaliação positiva',
    short: 'de avaliações positivas',
    chartLabel: 'Avaliação positiva',
    unit: 'pct',
    comparison: false,
    placeholder: 'ex.: 90',
  },
  {
    id: 'funcionalidades',
    label: 'Funcionalidades e casos de uso utilizados',
    short: 'funcionalidades em uso',
    unit: 'lista',
    comparison: false,
    placeholder: 'ex.: nome de uma funcionalidade',
    help: 'Digite e tecle Enter para adicionar cada item.',
  },
];

export const INDICATOR_IDS = INDICATORS.map((i) => i.id);
export const indicatorById = (id: string) => INDICATORS.find((i) => i.id === id);

export type IndicatorValue = {
  enabled: boolean;
  value: number | null;
  before?: number | null;
  after?: number | null;
  items?: string[];
};
export type IndicatorValues = Record<IndicatorId, IndicatorValue>;

export const emptyValues = (): IndicatorValues =>
  Object.fromEntries(INDICATORS.map((i) => [i.id, { enabled: true, value: null, before: null, after: null, items: [] }])) as unknown as IndicatorValues;

/** O indicador tem algo para mostrar? */
export function hasData(def: IndicatorDef, v: IndicatorValue | undefined): boolean {
  if (!v || !v.enabled) return false;
  if (def.unit === 'lista') return (v.items ?? []).some((s) => s.trim());
  return isNum(v.value) || (def.comparison && isNum(v.after));
}
/** Valor principal (para comparação sem valor próprio, o "depois"). */
export const mainValue = (def: IndicatorDef, v: IndicatorValue): number | null => (isNum(v.value) ? v.value : def.comparison && isNum(v.after) ? v.after : null);
export const hasComparison = (def: IndicatorDef, v: IndicatorValue | undefined) => !!v && v.enabled && def.comparison && isNum(v.before) && isNum(v.after);

export const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/* ------------------------------------------------------------- formatação */

const NBSP = /[  ]/g;
function dec(n: number, max: number, min = 0): string {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: max, minimumFractionDigits: min }).format(n).replace(NBSP, ' ');
}

/** Número com milhar (1.234); a partir de 1 milhão, compacto (1,2 mi). */
export function formatNumber(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${dec(n / 1e9, 1)} bi`;
  if (a >= 1e6) return `${dec(n / 1e6, 1)} mi`;
  return dec(n, a < 100 ? 1 : 0);
}

/** Moeda: R$ 950, R$ 12.345, R$ 350 mil, R$ 1,2 mi, R$ 3,4 bi. */
export function formatBRL(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1e9) return `${sign}R$ ${dec(a / 1e9, 1)} bi`;
  if (a >= 1e6) return `${sign}R$ ${dec(a / 1e6, 1)} mi`;
  if (a >= 1e5) return `${sign}R$ ${dec(a / 1e3, 1)} mil`;
  if (a >= 1000) return `${sign}R$ ${dec(Math.round(a), 0)}`;
  return `${sign}R$ ${dec(a, 2, Number.isInteger(a) ? 0 : 2)}`;
}

/** Percentual com até 1 casa: 12,5%. */
export const formatPct = (n: number): string => `${dec(n, 1)}%`;

/** Nota com 1 casa: 4,7 (com a escala, "4,7 de 5"). */
export const formatNota = (n: number, max?: number): string => (max ? `${dec(n, 1, 1)} de ${max}` : dec(n, 1, 1));

export function formatValue(def: IndicatorDef, n: number, notaMax?: number): string {
  switch (def.unit) {
    case 'brl':
      return formatBRL(n);
    case 'pct':
      return formatPct(n);
    case 'nota':
      return formatNota(n, notaMax);
    default:
      return formatNumber(n);
  }
}

/** Unidade para os campos do formulário. */
export const unitAffix = (u: Unit): { prefix?: string; suffix?: string } =>
  u === 'brl' ? { prefix: 'R$' } : u === 'pct' ? { suffix: '%' } : u === 'nota' ? { suffix: 'nota' } : {};

/**
 * Lê um número escrito em pt-BR ou en: "1.234,5", "1234.5", "R$ 1.234,50", "12,5%".
 * "1.234" (grupos de 3) é milhar; "1.5" é decimal. Vazio ou inválido: null.
 */
export function parseNumberBR(raw: string | number | null | undefined): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (raw == null) return null;
  let s = String(raw).replace(NBSP, ' ').replace(/R\$|%/g, '').replace(/\s+/g, '').trim();
  if (!s) return null;
  const neg = /^-/.test(s);
  s = s.replace(/^[-+]/, '');
  if (!/^[\d.,]+$/.test(s)) return null;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    const decSep = lastComma > lastDot ? ',' : '.';
    const thouSep = decSep === ',' ? '.' : ',';
    s = s.split(thouSep).join('').replace(decSep, '.');
  } else if (lastComma >= 0) {
    if ((s.match(/,/g) ?? []).length > 1) {
      if (!/^\d{1,3}(,\d{3})+$/.test(s)) return null;
      s = s.replace(/,/g, '');
    } else s = s.replace(',', '.');
  } else if (lastDot >= 0) {
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    else if ((s.match(/\./g) ?? []).length > 1) return null;
  }
  const n = Number(s);
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}

/* ---------------------------------------------------------------- período */

const MESES = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
const ym = (s: string) => {
  const m = /^(\d{4})-(\d{2})$/.exec(s || '');
  return m ? { y: Number(m[1]), m: Number(m[2]) } : null;
};

/** "jan. a jun. de 2026", "nov. de 2025 a abr. de 2026", "maio de 2026". */
export function formatPeriodo(inicio: string, fim: string): string {
  const a = ym(inicio);
  const b = ym(fim);
  if (!a && !b) return '';
  if (!a || !b) {
    const x = (a ?? b)!;
    return `${MESES[x.m - 1]} de ${x.y}`;
  }
  if (a.y === b.y && a.m === b.m) return `${MESES[a.m - 1]} de ${a.y}`;
  if (a.y === b.y) return `${MESES[a.m - 1]} a ${MESES[b.m - 1]} de ${a.y}`;
  return `${MESES[a.m - 1]} de ${a.y} a ${MESES[b.m - 1]} de ${b.y}`;
}

/** Variação percentual entre antes e depois (null sem base). */
export const variation = (before: number, after: number): number | null => (before ? ((after - before) / Math.abs(before)) * 100 : null);
