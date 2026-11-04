// Texto do case com o Claude (capacidade `sample` do artefato). Só chamado num clique.
// Fora do claude.ai, ou sem a capacidade concedida, `getSample()` resolve null e o
// botão some: os textos ficam manuais.
import { capability } from '@gove/runtime';
import type { CaseData } from '../data/case.ts';
import { buildPrompt, sampleMessage, validateTexts, type Validated } from './prompt.ts';

type SampleFn = { json: <T = unknown>(input: string, options?: Record<string, unknown>) => Promise<T> };

export const getSample = () => capability<SampleFn>('sample');

export type GenerateResult = { ok: true; result: Validated } | { ok: false; message: string; hide: boolean };

const HIDE = new Set(['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed']);

export async function generateTexts(c: CaseData, signal: AbortSignal): Promise<GenerateResult> {
  const sample = await getSample();
  if (!sample) return { ok: false, message: sampleMessage({ code: 'not_granted' }), hide: true };
  try {
    // cache: false — "Gerar novamente" precisa de uma resposta nova
    const raw = await sample.json(buildPrompt(c), { signal, cache: false, modelTier: 'default' });
    return { ok: true, result: validateTexts(raw, c) };
  } catch (e) {
    const code = (e as { code?: string } | null)?.code ?? '';
    return { ok: false, message: sampleMessage(e), hide: HIDE.has(code) };
  }
}
