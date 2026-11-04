// Checagem de números do texto gerado: todo número precisa estar nos dados do case.
// Aceita o número em qualquer arredondamento coerente com o que foi escrito
// ("1,2 mi" bate com 1.234.567; "12,5%" com 12,48 não bate, porque 12,48 → 12,5 bate só se
// arredondado a 1 casa: a regra é arredondar o valor do dado às casas escritas no texto).
import type { CaseData } from '../data/case.ts';
import { INDICATORS, isNum, variation } from '../data/indicators.ts';

export type NumberToken = { raw: string; value: number; num: number; decimals: number; mult: number; index: number };

const MULT: [RegExp, number][] = [
  [/^(mil)$/i, 1e3],
  [/^(mi|milh(ão|ao|ões|oes))$/i, 1e6],
  [/^(bi|bilh(ão|ao|ões|oes))$/i, 1e9],
];

// número (com milhar por ponto ou não), decimais por vírgula ou ponto, e um multiplicador opcional
const NUM_RE = /(?<![\p{L}\d])(\d{1,3}(?:\.\d{3})+|\d+)(?:[,.](\d+))?(?:\s*(%|mil|mi|milh(?:ão|ao|ões|oes)|bi|bilh(?:ão|ao|ões|oes))(?![\p{L}]))?/giu;

/** Números escritos num texto em pt-BR. */
export function extractNumbers(text: string): NumberToken[] {
  const out: NumberToken[] = [];
  for (const m of text.matchAll(NUM_RE)) {
    const int = m[1]!.replace(/\./g, '');
    const frac = m[2] ?? '';
    const num = Number(frac ? `${int}.${frac}` : int);
    const unit = m[3] ?? '';
    const mult = MULT.find(([re]) => re.test(unit))?.[1] ?? 1;
    out.push({ raw: m[0], num, decimals: frac.length, mult, value: num * mult, index: m.index ?? 0 });
  }
  return out;
}

/** Números presentes nos dados do case (o que o Claude recebe). */
export function allowedNumbers(c: CaseData): number[] {
  const out: number[] = [];
  for (const d of INDICATORS) {
    const v = c.values[d.id];
    if (!v?.enabled) continue;
    if (d.unit === 'lista') {
      const n = (v.items ?? []).filter((s) => s.trim()).length;
      if (n) out.push(n);
      continue;
    }
    for (const n of [v.value, v.before, v.after]) if (isNum(n)) out.push(n);
    if (d.comparison && isNum(v.before) && isNum(v.after)) {
      out.push(v.after - v.before);
      const p = variation(v.before, v.after);
      if (p != null) out.push(p);
    }
    if (d.unit === 'nota') out.push(c.notaMax);
  }
  for (const s of [c.periodo.inicio, c.periodo.fim]) {
    const m = /^(\d{4})-(\d{2})$/.exec(s || '');
    if (m) out.push(Number(m[1]), Number(m[2]));
  }
  for (const t of extractNumbers(`${c.contexto} ${c.municipio}`)) out.push(t.value);
  return out;
}

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

export function tokenMatches(t: NumberToken, allowed: number[]): boolean {
  return allowed.some((a) => {
    const scaled = Math.abs(a) / t.mult;
    return Math.abs(round(scaled, t.decimals) - t.num) < 1e-9;
  });
}

/** Números do texto que não aparecem nos dados. */
export function unknownNumbers(text: string, allowed: number[]): string[] {
  return extractNumbers(text)
    .filter((t) => !tokenMatches(t, allowed))
    .map((t) => t.raw.trim());
}
