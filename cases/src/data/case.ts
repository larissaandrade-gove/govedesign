// Modelo de um case salvo (um documento por case; histórico por município).
import { emptyValues, type IndicatorValues } from './indicators.ts';

export type Textos = {
  titulo: string;
  resumo: string;
  desafio: string;
  solucao: string;
  resultado: string;
  destaques: string[];
};

export type Contato = { cta: string; nome: string; email: string; site: string };

export type CaseData = {
  id: string;
  municipio: string;
  uf: string;
  /** 'AAAA-MM' */
  periodo: { inicio: string; fim: string };
  /** Contexto do município digitado pela equipe (população, desafio de partida…). */
  contexto: string;
  values: IndicatorValues;
  /** Escala da avaliação média (nota de 0 a 5 ou de 0 a 10). */
  notaMax: 5 | 10;
  textos: Textos;
  contato: Contato;
  fonte: 'manual' | 'csv' | 'grafana';
  /** Dashboard do município no Grafana (conector Gove Grafana), quando escolhido na lista. */
  grafana?: { dashboardUid: string; titulo: string };
  createdAt: number;
  updatedAt: number;
};

export const emptyTextos = (): Textos => ({ titulo: '', resumo: '', desafio: '', solucao: '', resultado: '', destaques: ['', '', ''] });

export function newCase(id: string, now = Date.now()): CaseData {
  return {
    id,
    municipio: '',
    uf: '',
    periodo: { inicio: '', fim: '' },
    contexto: '',
    values: emptyValues(),
    notaMax: 5,
    textos: emptyTextos(),
    contato: { cta: 'Leve o Gove para o seu município', nome: '', email: '', site: '' },
    fonte: 'manual',
    createdAt: now,
    updatedAt: now,
  };
}

/** Completa um documento salvo com os campos que versões futuras acrescentarem. */
export function normalizeCase(raw: Partial<CaseData> & { id: string }): CaseData {
  const base = newCase(raw.id, raw.createdAt ?? Date.now());
  const values = { ...base.values };
  for (const [k, v] of Object.entries(raw.values ?? {})) if (k in values) values[k as keyof IndicatorValues] = { ...values[k as keyof IndicatorValues], ...v };
  const destaques = [...(raw.textos?.destaques ?? []), '', '', ''].slice(0, 3);
  return {
    ...base,
    ...raw,
    periodo: { ...base.periodo, ...raw.periodo },
    values,
    textos: { ...base.textos, ...raw.textos, destaques },
    contato: { ...base.contato, ...raw.contato },
  } as CaseData;
}

export const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];

export const municipioLabel = (c: Pick<CaseData, 'municipio' | 'uf'>) => [c.municipio.trim(), c.uf].filter(Boolean).join(' – ');
