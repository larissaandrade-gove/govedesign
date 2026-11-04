import { useEffect, useRef, useState } from 'react';
import { ArrowsClockwise, CheckCircle, DownloadSimple, LinkBreak, MagnifyingGlass, PlugsConnected } from '@phosphor-icons/react';
import type { CaseData } from '@/data/case.ts';
import { INDICATORS, formatPeriodo, type IndicatorId } from '@/data/indicators.ts';
import { GRAFANA_CONNECTOR, grafanaMessage, type GrafanaFetch, type GrafanaMunicipio, type GrafanaStatus } from '@/lib/grafana.ts';
import { grafana } from '@/lib/grafana-runtime.ts';
import { Button, Note } from './ui.tsx';

type Props = { c: CaseData; update: (patch: Partial<CaseData>) => void };

let statusPromise: Promise<GrafanaStatus> | null = null;
const loadStatus = (fresh = false) => {
  if (fresh || !statusPromise) statusPromise = grafana.status();
  return statusPromise;
};

/** Situação do conector "Gove Grafana" nesta página (claude.ai, conector ligado ou não). */
function useGrafanaStatus() {
  const [status, setStatus] = useState<GrafanaStatus | null>(null);
  useEffect(() => {
    let alive = true;
    void loadStatus().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);
  const recheck = () => void loadStatus(true).then(setStatus);
  /** Erro de conexão numa chamada: atualiza a situação sem nova consulta. */
  const fromError = (code: string) => {
    if (code === 'server_not_connected' || code === 'not_in_manifest' || code === 'server_not_found') setStatus('not_connected');
    else if (code === 'needs_reauth') setStatus('needs_reauth');
  };
  return { status, recheck, fromError };
}

const STATUS_CODE: Record<Exclude<GrafanaStatus, 'ready'>, string> = { unavailable: 'unavailable', not_connected: 'server_not_connected', needs_reauth: 'needs_reauth' };

/** Aviso quando o Grafana não está disponível (fora do claude.ai, conector desligado ou sessão expirada). */
function StatusNote({ status, onRecheck }: { status: Exclude<GrafanaStatus, 'ready'>; onRecheck: () => void }) {
  const msg = grafanaMessage({ code: STATUS_CODE[status] });
  if (status === 'unavailable') return <Note>{msg}</Note>;
  return (
    <Note tone="warn">
      <p>
        <strong className="text-text-primary">{status === 'needs_reauth' ? 'Entre de novo no Grafana.' : 'Conector Gove Grafana não ligado.'}</strong> {msg}
      </p>
      <Button variant="ghost" className="mt-1 -ml-2" onClick={onRecheck}>
        <ArrowsClockwise className="size-5" aria-hidden /> Já liguei, verificar de novo
      </Button>
    </Note>
  );
}

/** Escolha do município entre os dashboards de cases do Grafana (com as permissões de quem usa). */
export function GrafanaPicker({ c, update }: Props) {
  const { status, recheck, fromError } = useGrafanaStatus();
  const [query, setQuery] = useState('');
  const [list, setList] = useState<GrafanaMunicipio[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (status == null) return null;
  if (status !== 'ready') return <StatusNote status={status} onRecheck={recheck} />;

  const search = async () => {
    setBusy(true);
    setError('');
    try {
      setList(await grafana.listMunicipios(query));
    } catch (e) {
      fromError((e as { code?: string }).code ?? '');
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const pick = (m: GrafanaMunicipio) => {
    update({ municipio: m.nome, uf: m.uf ?? c.uf, grafana: { dashboardUid: m.dashboardUid ?? m.id, titulo: m.titulo || m.nome } });
    setList(null);
  };

  return (
    <section aria-labelledby="grafana-mun" className="card space-y-space-2">
      <h2 id="grafana-mun" className="flex items-center gap-2 font-sans text-[16px] font-semibold">
        <PlugsConnected className="size-5 text-link" aria-hidden /> Município pelo Grafana
      </h2>
      {c.grafana?.dashboardUid ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-2 text-[14px] text-text-primary">
            <CheckCircle className="size-5 shrink-0 text-link" weight="fill" aria-hidden />
            <span className="min-w-0">
              Ligado ao dashboard <strong>{c.grafana.titulo}</strong>
            </span>
          </p>
          <Button variant="ghost" onClick={() => update({ grafana: undefined })}>
            <LinkBreak className="size-5" aria-hidden /> Desligar
          </Button>
        </div>
      ) : (
        <p className="text-[14px] text-text-secondary">Lista os dashboards de cases que você vê no Grafana. Ao escolher, o nome e a UF vêm junto e o passo Indicadores busca os números.</p>
      )}
      <form
        className="flex gap-2"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <label htmlFor="grafana-busca" className="sr-only">
          Buscar município no Grafana
        </label>
        <input id="grafana-busca" className="field" value={query} placeholder="ex.: parte do nome do município" autoComplete="off" onChange={(e) => setQuery(e.target.value)} />
        <Button type="submit" variant="primary" disabled={busy} aria-busy={busy}>
          <MagnifyingGlass className="size-5" aria-hidden /> {busy ? 'Buscando…' : 'Buscar'}
        </Button>
      </form>
      <div aria-live="polite">
        {error && <Note tone="warn">{error}</Note>}
        {list && !list.length && <p className="text-[14px] text-text-secondary">Nenhum dashboard de cases encontrado{query.trim() ? ` para “${query.trim()}”` : ''}.</p>}
        {list && list.length > 0 && (
          <ul className="max-h-72 divide-y divide-secondary overflow-y-auto rounded-md border border-secondary" aria-label="Dashboards de cases no Grafana">
            {list.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => pick(m)} className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-secondary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-highlight">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-text-primary">
                      {m.nome}
                      {m.uf ? ` – ${m.uf}` : ''}
                    </span>
                    <span className="block truncate text-[13px] text-text-secondary">
                      {m.titulo}
                      {m.pasta ? ` · pasta ${m.pasta}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-caption font-semibold text-link">Escolher</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const label = (id: IndicatorId) => INDICATORS.find((d) => d.id === id)?.label ?? id;

/** "Buscar no Grafana": preenche os indicadores do município no período (quem revisa ainda pode editar). */
export function GrafanaFetchPanel({ c, update }: Props) {
  const { status, recheck, fromError } = useGrafanaStatus();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GrafanaFetch | null>(null);
  const latest = useRef(c);
  latest.current = c;

  if (status == null) return null;
  if (status !== 'ready') return <StatusNote status={status} onRecheck={recheck} />;
  if (!c.grafana?.dashboardUid) return <GrafanaPicker c={c} update={update} />;

  const periodo = formatPeriodo(c.periodo.inicio, c.periodo.fim);
  const run = async () => {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const r = await grafana.fetchIndicators({ id: c.grafana!.dashboardUid, dashboardUid: c.grafana!.dashboardUid, nome: c.municipio }, c.periodo);
      const cur = latest.current;
      const values = { ...cur.values };
      for (const [id, v] of Object.entries(r.values)) values[id as IndicatorId] = { ...values[id as IndicatorId], ...v };
      update({ values, fonte: 'grafana' });
      setResult(r);
    } catch (e) {
      fromError((e as { code?: string }).code ?? '');
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="grafana-t" className="card space-y-space-2">
      <h3 id="grafana-t" className="font-sans text-[16px] font-semibold">
        Buscar no Grafana
      </h3>
      <p className="text-[14px]">
        Dashboard <strong className="text-text-primary">{c.grafana.titulo}</strong>
        {periodo ? (
          <>
            , de <strong className="text-text-primary">{periodo}</strong>
          </>
        ) : null}
        . Os números entram nos campos abaixo; revise e edite antes de exportar.
      </p>
      {!c.periodo.inicio && !c.periodo.fim ? (
        <Note tone="warn">{grafanaMessage({ code: 'no_period' })}</Note>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => void run()} disabled={busy} aria-busy={busy}>
            <DownloadSimple className="size-5" aria-hidden /> {busy ? 'Buscando no Grafana…' : 'Buscar no Grafana'}
          </Button>
          <Button variant="ghost" onClick={() => update({ grafana: undefined })}>
            Trocar município
          </Button>
        </div>
      )}
      <div aria-live="polite" className="space-y-2">
        {error && <Note tone="warn">{error}</Note>}
        {result && (
          <Note tone={result.filled.length ? 'info' : 'warn'}>
            {result.filled.length ? `${result.filled.length} indicador(es) preenchido(s) pelo Grafana: ${result.filled.map(label).join(', ')}.` : 'O Grafana não devolveu nenhum indicador deste dashboard.'}
            {result.failed.length > 0 && <span className="block">Sem resultado no período: {result.failed.join(', ')}.</span>}
            {result.unmapped.length > 0 && (
              <span className="block">
                Painéis sem indicador no mapa do {GRAFANA_CONNECTOR}: {result.unmapped.slice(0, 6).join(', ')}
                {result.unmapped.length > 6 ? '…' : ''}.
              </span>
            )}
          </Note>
        )}
      </div>
    </section>
  );
}
