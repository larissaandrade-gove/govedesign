import { useEffect } from 'react';
import { claudeCandidates } from './claude';

/** Resultado de um download (mesmo contrato de `saveFileDetailed` do artifact-runtime). */
export type DownloadOutcome = 'saved' | 'declined' | 'rate_limited' | 'unavailable' | 'too_large' | 'error';
export type DownloadResult = { outcome: DownloadOutcome; code: string; method: 'capacidade' | 'navegador' };

const ERROR_CODES = new Set(['rejected_extension', 'bad_request', 'transform_error', 'request_unknown', 'not_signed']);

function outcomeOf(code: string): DownloadOutcome {
  if (code === 'declined' || code === 'rate_limited' || code === 'too_large') return code;
  if (ERROR_CODES.has(code)) return 'error';
  return 'unavailable'; // inclui UNAVAILABLE_CODES e códigos desconhecidos
}

/**
 * Entrega um arquivo ao visitante e diz o que de fato aconteceu. Dentro do artefato
 * do claude.ai usa a capacidade de downloads (o visitante confirma), procurada no
 * `claude` de cada janela ao alcance; fora dele, download comum. Dentro do artefato
 * nunca usa `<a download>`: o iframe do claude.ai descarta esse clique em silêncio.
 */
export async function downloadDetailed(filename: string, data: Blob | string, type = 'text/plain;charset=utf-8'): Promise<DownloadResult> {
  const cands = claudeCandidates();
  for (const { claude, win } of cands) {
    let downloads: { save: (r: { filename: string; data: Blob | string }) => Promise<{ status?: string } | undefined> } | null = null;
    try {
      downloads = await claude.use('downloads');
    } catch {
      downloads = null;
    }
    if (!downloads) continue;
    try {
      // O `claude` de outra janela confere o Blob com o construtor dela
      const B = (win as unknown as { Blob?: typeof Blob }).Blob;
      const payload = typeof data !== 'string' && B && B !== Blob ? new B([await data.arrayBuffer()], { type: data.type }) : data;
      const r = await downloads.save({ filename, data: payload });
      return { outcome: 'saved', code: String(r?.status ?? 'saved'), method: 'capacidade' };
    } catch (e) {
      const code = typeof (e as { code?: unknown })?.code === 'string' ? (e as { code: string }).code : 'erro_sem_codigo';
      return { outcome: code === 'erro_sem_codigo' ? 'error' : outcomeOf(code), code, method: 'capacidade' };
    }
  }
  if (cands.length) return { outcome: 'unavailable', code: 'sem_capacidade', method: 'capacidade' };
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(typeof data === 'string' ? new Blob([data], { type }) : data);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return { outcome: 'saved', code: 'saved', method: 'navegador' };
  } catch {
    return { outcome: 'error', code: 'falha_navegador', method: 'navegador' };
  }
}

/** Baixa um texto. Devolve `true` só quando o arquivo foi entregue. */
export async function downloadText(filename: string, text: string, type = 'text/markdown;charset=utf-8'): Promise<boolean> {
  return (await downloadDetailed(filename, text, type)).outcome === 'saved';
}

/** Os iframes dos apps (mesma origem) que podem pedir downloads pela ponte. */
const isOwnFrame = (source: MessageEventSource | null) => !!source && [...document.querySelectorAll('iframe')].some((f) => f.contentWindow === source);

/**
 * Ponte de reserva para os apps embutidos: quando o app (iframe da mesma origem) não
 * alcança a capacidade `downloads`, manda os bytes por postMessage e o Design System
 * faz o download com o próprio `claude`. Ver `saveViaBridge` no artifact-runtime.
 */
export function useDownloadBridge() {
  useEffect(() => {
    const onMessage = async (e: MessageEvent) => {
      const m = e.data as { type?: unknown; id?: unknown; filename?: unknown; mime?: unknown; buffer?: unknown } | null;
      if (!m || typeof m !== 'object' || m.type !== 'gove:download') return;
      if (e.origin !== window.location.origin || !isOwnFrame(e.source)) return;
      if (typeof m.id !== 'string' || typeof m.filename !== 'string' || !(m.buffer instanceof ArrayBuffer)) return;
      const source = e.source as Window;
      const reply = (msg: Record<string, unknown>) => {
        try {
          source.postMessage({ ...msg, id: m.id }, window.location.origin);
        } catch {
          /* o iframe foi fechado */
        }
      };
      reply({ type: 'gove:download:ack' });
      const blob = new Blob([m.buffer], { type: typeof m.mime === 'string' ? m.mime : '' });
      const r = await downloadDetailed(m.filename, blob);
      reply({ type: 'gove:download:result', outcome: r.outcome, code: r.code, method: 'ponte' });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
}

export const aiBlockOf = (md: string) => /```text\n([\s\S]*?)```/.exec(md)?.[1].trim() ?? md;
