// Prompt do texto do case (capacidade `sample` do artefato) e validação da resposta.
// Funções puras: testadas em test/cases.test.js.
import { municipioLabel, type CaseData, type Textos } from '../data/case.ts';
import { INDICATORS, formatPeriodo, formatValue, hasComparison, hasData, isNum, mainValue, variation } from '../data/indicators.ts';
import { allowedNumbers, unknownNumbers } from './numbers.ts';

/** Limites de tamanho de cada campo (cabem na one page e nos slides). */
export const TEXT_LIMITS = { titulo: 70, resumo: 260, desafio: 340, solucao: 340, resultado: 340, destaque: 110 } as const;

/** Regras de voz da marca (skill gove-design-system, "Imagens, ícones e texto"). */
export const VOICE_RULES = [
  'Português do Brasil; frases curtas e declarativas, com verbo de ação; foco no benefício, não na tecnologia.',
  'Títulos em sentence case (só a primeira letra e nomes próprios em maiúscula).',
  'Sem emoji, sem jargão burocrático, sem exclamações em sequência, sem textos repetidos.',
  'A Gove (Governo Zero Clique) é o governo que sabe, antecipa e age.',
];

/** Indicadores incluídos, como linhas de dados para o prompt. */
export function dataLines(c: CaseData): string[] {
  const out: string[] = [];
  for (const d of INDICATORS) {
    const v = c.values[d.id];
    if (!hasData(d, v)) continue;
    if (d.unit === 'lista') {
      out.push(`- ${d.label}: ${(v.items ?? []).filter((s) => s.trim()).join('; ')}`);
      continue;
    }
    const parts: string[] = [];
    const main = mainValue(d, v);
    if (isNum(main)) parts.push(formatValue(d, main, c.notaMax));
    if (hasComparison(d, v)) {
      const p = variation(v.before!, v.after!);
      parts.push(`antes ${formatValue(d, v.before!, c.notaMax)}, depois ${formatValue(d, v.after!, c.notaMax)}${p != null ? ` (variação de ${formatValue({ ...d, unit: 'pct' }, p)})` : ''}`);
    }
    out.push(`- ${d.label}: ${parts.join('; ')}`);
  }
  return out;
}

export function buildPrompt(c: CaseData): string {
  const periodo = formatPeriodo(c.periodo.inicio, c.periodo.fim);
  return [
    'Você escreve cases de sucesso da Gove Digital para a equipe de vendas: uma página sobre o resultado de um município que usa o Gove.',
    '',
    '## Dados do case (use SOMENTE estes números)',
    `- Município: ${municipioLabel(c) || '(não informado)'}`,
    periodo ? `- Período: ${periodo}` : '- Período: (não informado)',
    c.contexto.trim() ? `- Contexto informado pela equipe: ${c.contexto.trim()}` : '',
    ...dataLines(c),
    '',
    '## Regras',
    '- Use apenas os números acima, escritos do mesmo jeito (ex.: "R$ 1,2 mi", "12,5%"). Não calcule, não arredonde de outro jeito e não invente números, datas, nomes ou citações.',
    '- Se um dado não estiver acima, não fale dele.',
    ...VOICE_RULES.map((r) => `- ${r}`),
    '',
    '## Formato da resposta',
    'Responda só com um objeto JSON, sem texto antes ou depois:',
    `{"titulo": string (até ${TEXT_LIMITS.titulo} caracteres), "resumo": string (até ${TEXT_LIMITS.resumo}), "desafio": string (até ${TEXT_LIMITS.desafio}), "solucao": string (até ${TEXT_LIMITS.solucao}), "resultado": string (até ${TEXT_LIMITS.resultado}), "destaques": [até 3 frases curtas, cada uma até ${TEXT_LIMITS.destaque} caracteres]}`,
  ]
    .filter((l) => l !== '')
    .join('\n')
    .replace(/\n## /g, '\n\n## ');
}

export type TextField = Exclude<keyof Textos, 'destaques'> | `destaque${0 | 1 | 2}`;
export type Validated = {
  /** Campos aprovados (sem números fora dos dados). */
  accepted: Partial<Textos>;
  /** Campos com números fora dos dados: sugestão + números suspeitos. Não são aplicados sozinhos. */
  flagged: { field: TextField; text: string; numbers: string[] }[];
  /** Problemas de formato. */
  errors: string[];
};

const FIELDS = ['titulo', 'resumo', 'desafio', 'solucao', 'resultado'] as const;
const clean = (s: unknown) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '');

/** Confere o JSON devolvido pelo Claude: formato, tamanho e números. */
export function validateTexts(raw: unknown, c: CaseData): Validated {
  const res: Validated = { accepted: {}, flagged: [], errors: [] };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    res.errors.push('A resposta não veio no formato esperado.');
    return res;
  }
  const o = raw as Record<string, unknown>;
  const allowed = allowedNumbers(c);
  for (const f of FIELDS) {
    const text = clean(o[f]);
    if (!text) {
      res.errors.push(`Campo "${f}" veio vazio.`);
      continue;
    }
    const bad = unknownNumbers(text, allowed);
    if (bad.length) res.flagged.push({ field: f, text, numbers: bad });
    else res.accepted[f] = text;
  }
  const list = Array.isArray(o['destaques']) ? (o['destaques'] as unknown[]).map(clean).filter(Boolean).slice(0, 3) : [];
  const okList: string[] = [];
  list.forEach((text, i) => {
    const bad = unknownNumbers(text, allowed);
    if (bad.length) res.flagged.push({ field: `destaque${i as 0 | 1 | 2}`, text, numbers: bad });
    else okList.push(text);
  });
  if (list.length) res.accepted.destaques = [...okList, '', '', ''].slice(0, 3);
  return res;
}

/** Mensagem curta por código de erro da capacidade `sample`. */
export function sampleMessage(e: unknown): string {
  const code = (e as { code?: string } | null)?.code;
  switch (code) {
    case 'not_granted':
    case 'sampling_disabled':
    case 'not_declared':
    case 'capability_disabled':
    case 'capability_removed':
      return 'O texto com Claude não está liberado nesta página. Escreva os textos à mão.';
    case 'rate_limited':
      return 'Muitos pedidos seguidos. Tente de novo em alguns minutos.';
    case 'session_expired':
      return 'Sua sessão expirou. Entre de novo no claude.ai.';
    case 'invalid_json':
    case 'empty_completion':
      return 'A resposta veio incompleta. Clique em "Gerar novamente".';
    case 'refused':
      return 'O Claude não gerou este texto. Revise o contexto e tente de novo.';
    case 'cancelled':
      return '';
    default:
      return 'Não foi possível gerar o texto agora. Tente de novo.';
  }
}
