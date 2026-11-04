// Cases salvos: coleção do artifact-runtime (db compartilhado dentro do artefato do
// Design System; localStorage fora dele). Um documento por case; histórico por município.
import { collection, newId, type Doc } from '@gove/runtime';
import { normalizeCase, newCase, type CaseData } from '../data/case.ts';

type CaseDoc = CaseData & Doc;
export const cases = collection<CaseDoc>('cases', 'cases');

export const listCases = (): CaseData[] => cases.all().map((d) => normalizeCase(d)).sort((a, b) => b.updatedAt - a.updatedAt);

export const createCase = (): CaseData => newCase(newId('case-'));

export async function saveCase(c: CaseData): Promise<void> {
  await cases.set({ ...c, updatedAt: Date.now() } as CaseDoc);
}

export async function duplicateCase(c: CaseData): Promise<CaseData> {
  const now = Date.now();
  const copy: CaseData = { ...structuredClone(c), id: newId('case-'), createdAt: now, updatedAt: now };
  await saveCase(copy);
  return copy;
}

export const removeCase = (id: string) => cases.remove(id);

/** Cases agrupados por município (mais recentes primeiro). */
export function byMunicipio(list: CaseData[]): { municipio: string; cases: CaseData[] }[] {
  const map = new Map<string, CaseData[]>();
  for (const c of list) {
    const key = [c.municipio.trim(), c.uf].filter(Boolean).join(' – ') || 'Sem município';
    map.set(key, [...(map.get(key) ?? []), c]);
  }
  return [...map.entries()].map(([municipio, cs]) => ({ municipio, cases: cs }));
}
