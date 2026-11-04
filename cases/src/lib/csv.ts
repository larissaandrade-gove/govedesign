// Importação de indicadores por CSV (exportado do painel ou montado à mão).
//
// Formato: uma linha por indicador, com cabeçalho.
//   indicador;valor;antes;depois;periodo
// - indicador: id (ex.: taxa_abertura) ou nome (ex.: Taxa de abertura), sem diferença de acento ou caixa;
// - valor: número em pt-BR (1.234,5) ou en (1234.5); R$ e % são ignorados;
//   para "funcionalidades", os itens separados por "|";
// - antes / depois (opcionais): para o gráfico de comparação;
// - periodo (opcional): AAAA-MM ou AAAA-MM a AAAA-MM.
// Separador: ponto e vírgula, vírgula ou tabulação (detectado pelo cabeçalho).
import { INDICATORS, parseNumberBR, type IndicatorId, type IndicatorValue } from '../data/indicators.ts';

export type CsvResult = {
  values: Partial<Record<IndicatorId, Partial<IndicatorValue>>>;
  periodo?: { inicio: string; fim: string };
  errors: { line: number; message: string }[];
  imported: number;
};

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9%$]+/g, ' ')
    .trim();

const ALIASES = new Map<string, IndicatorId>();
for (const d of INDICATORS) {
  ALIASES.set(norm(d.id), d.id);
  ALIASES.set(norm(d.label), d.id);
}
// Nomes curtos usuais
ALIASES.set(norm('aumento de arrecadacao'), 'aumento_arrecadacao_pct');
ALIASES.set(norm('aumento de arrecadacao %'), 'aumento_arrecadacao_pct');
ALIASES.set(norm('aumento de arrecadacao r$'), 'aumento_arrecadacao_valor');
ALIASES.set(norm('avaliacao'), 'avaliacao_media');
ALIASES.set(norm('funcionalidades'), 'funcionalidades');
ALIASES.set(norm('casos de uso'), 'funcionalidades');

export const resolveIndicator = (name: string): IndicatorId | null => ALIASES.get(norm(name)) ?? null;

/** Quebra uma linha CSV respeitando aspas. */
function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function detectSep(header: string): string {
  const counts = [';', '\t', ','].map((s) => [s, header.split(s).length - 1] as const);
  const best = counts.reduce((a, b) => (b[1] > a[1] ? b : a));
  return best[1] > 0 ? best[0] : ';';
}

const PERIOD = /^(\d{4}-\d{2})(?:\s*(?:a|até|-|–|\/)\s*(\d{4}-\d{2}))?$/i;

export function parseCsv(text: string): CsvResult {
  const res: CsvResult = { values: {}, errors: [], imported: 0 };
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const first = lines.findIndex((l) => l.trim());
  if (first < 0) {
    res.errors.push({ line: 0, message: 'Arquivo vazio.' });
    return res;
  }
  const sep = detectSep(lines[first]!);
  const header = splitLine(lines[first]!, sep).map(norm);
  const col = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const iInd = col('indicador', 'id', 'nome', 'indicator');
  const iVal = col('valor', 'value');
  const iBefore = col('antes', 'before');
  const iAfter = col('depois', 'after');
  const iPer = col('periodo', 'period');
  if (iInd < 0 || (iVal < 0 && iAfter < 0)) {
    res.errors.push({ line: first + 1, message: 'Cabeçalho precisa das colunas "indicador" e "valor".' });
    return res;
  }
  for (let li = first + 1; li < lines.length; li++) {
    const raw = lines[li]!;
    if (!raw.trim()) continue;
    const cells = splitLine(raw, sep);
    const lineNo = li + 1;
    const name = cells[iInd] ?? '';
    const id = resolveIndicator(name);
    if (!id) {
      res.errors.push({ line: lineNo, message: `Indicador desconhecido: "${name}".` });
      continue;
    }
    const cell = (i: number) => (i >= 0 ? (cells[i] ?? '') : '');
    const entry: Partial<IndicatorValue> = {};
    if (id === 'funcionalidades') {
      const items = cell(iVal)
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean);
      if (!items.length) continue; // linha do modelo em branco
      entry.items = items;
    } else {
      const v = cell(iVal);
      const b = cell(iBefore);
      const a = cell(iAfter);
      if (!v && !b && !a) continue; // linha do modelo em branco
      const bad = [
        [v, 'valor'],
        [b, 'antes'],
        [a, 'depois'],
      ].find(([s]) => s && parseNumberBR(s) == null);
      if (bad) {
        res.errors.push({ line: lineNo, message: `Número inválido em "${bad[1]}": "${bad[0]}".` });
        continue;
      }
      entry.value = parseNumberBR(v);
      if (b) entry.before = parseNumberBR(b);
      if (a) entry.after = parseNumberBR(a);
    }
    entry.enabled = true;
    res.values[id] = entry;
    res.imported += 1;
    const per = PERIOD.exec(cell(iPer));
    if (per && !res.periodo) res.periodo = { inicio: per[1]!, fim: per[2] ?? per[1]! };
  }
  return res;
}

/** Modelo para baixar: cabeçalho e uma linha (vazia) por indicador. */
export function csvTemplate(): string {
  const rows = [['indicador', 'valor', 'antes', 'depois', 'periodo'], ...INDICATORS.map((d) => [d.id, '', '', '', ''])];
  return '﻿' + rows.map((r) => r.join(';')).join('\r\n') + '\r\n';
}
