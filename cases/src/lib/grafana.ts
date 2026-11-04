// Grafana pelo conector "Gove Grafana" do claude.ai (backend/grafana-mcp.js), com a capacidade
// `mcp` do artefato: cada consulta roda com o login do Grafana de quem está vendo a página e
// respeita as permissões dela no Grafana. Mesmo padrão do Pexels (artifact-runtime/pexels.ts).
//
// Este arquivo não depende do runtime (testável no Node): a instância ligada à capacidade `mcp`
// fica em grafana-runtime.ts.
import { INDICATORS, type IndicatorId, type IndicatorValue } from '../data/indicators.ts';

/** Nome do conector exatamente como cadastrado no claude.ai. */
export const GRAFANA_CONNECTOR = 'Gove Grafana';
export const GRAFANA_TOOLS = ['list_case_dashboards', 'get_case_indicators', 'describe_dashboard'] as const;

export const GRAFANA_CONNECT_HINT = 'Ligue o conector Gove Grafana em claude.ai → Configurações → Conectores';

/** ready: dá para consultar; not_connected / needs_reauth: falta ligar ou entrar de novo; unavailable: fora do claude.ai. */
export type GrafanaStatus = 'ready' | 'not_connected' | 'needs_reauth' | 'unavailable';
export type GrafanaMunicipio = { id: string; nome: string; uf?: string; dashboardUid?: string; titulo?: string; pasta?: string };
export type GrafanaIndicators = Partial<Record<IndicatorId, Partial<IndicatorValue>>>;
export type GrafanaFetch = {
  values: GrafanaIndicators;
  /** Indicadores preenchidos pelo Grafana. */
  filled: IndicatorId[];
  /** Títulos de painéis sem indicador no mapa (para a TI ajustar). */
  unmapped: string[];
  /** Painéis do mapa que o Grafana não conseguiu calcular. */
  failed: string[];
};

export interface GrafanaSource {
  status(): Promise<GrafanaStatus>;
  /** Municípios com dashboard de cases (um dashboard por município), filtrados por nome. */
  listMunicipios(query?: string): Promise<GrafanaMunicipio[]>;
  /** Indicadores de um município no período ('AAAA-MM'). */
  fetchIndicators(municipio: GrafanaMunicipio, periodo: { inicio: string; fim: string }): Promise<GrafanaFetch>;
}

/** Parte da capacidade `mcp` usada aqui (ver mcp.d.ts do runtime de artefatos). */
export type McpLike = {
  callTool(server: string, tool: string, input?: unknown, options?: { cache?: false | Record<string, unknown> }): Promise<{ payload?: unknown; structuredContent?: unknown; content?: { type: string; text?: string }[] }>;
  listTools?(server?: string): Promise<{ servers: { server: string; authStatus?: string }[] }>;
};

export class GrafanaError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? grafanaMessage({ code }));
    this.code = code;
  }
}

type ErrLike = { code?: string; message?: string; result?: unknown } | null | undefined;

/** Código do erro da ferramenta (forbidden, not_found, timeout…), vindo do conector. */
export function toolErrorCode(e: unknown): string | null {
  const r = (e as ErrLike)?.result as { structuredContent?: { error?: { code?: string } } } | undefined;
  const code = r?.structuredContent?.error?.code;
  if (code) return code;
  try {
    return (JSON.parse(String((e as ErrLike)?.message ?? '')) as { error?: { code?: string } })?.error?.code ?? null;
  } catch {
    return null;
  }
}

/** Mensagem curta por código de erro. */
export function grafanaMessage(e: unknown): string {
  const err = e as ErrLike;
  switch (err?.code) {
    case 'unavailable':
    case 'not_granted':
    case 'capability_disabled':
    case 'capability_removed':
      return 'A busca no Grafana funciona com o app aberto no claude.ai. Aqui, preencha os números à mão ou importe um CSV.';
    case 'server_not_connected':
    case 'not_in_manifest':
    case 'server_not_found':
    case 'selection_required':
      return `${GRAFANA_CONNECT_HINT}. Enquanto isso, preencha à mão ou importe um CSV.`;
    case 'needs_reauth':
      return 'Sua sessão do Grafana expirou. Entre de novo no Gove Grafana em claude.ai → Configurações → Conectores.';
    case 'rate_limited':
      return 'Muitas consultas seguidas ao Grafana. Tente em alguns segundos.';
    case 'blocked_by_policy':
      return 'O uso do Gove Grafana está bloqueado para a sua conta. Fale com o admin do claude.ai da Gove.';
    case 'server_unavailable':
      return 'O Gove Grafana não respondeu agora. Tente de novo em alguns minutos.';
    case 'tool_error':
      switch (toolErrorCode(e)) {
        case 'forbidden':
          return 'Sem permissão no Grafana para este dashboard. Peça acesso a quem administra o Grafana ou escolha outro município.';
        case 'not_found':
          return 'Dashboard não encontrado no Grafana. Escolha o município de novo na lista.';
        case 'timeout':
          return 'O Grafana demorou demais para responder. Tente um período menor ou tente de novo.';
        case 'invalid_argument':
          return 'Período inválido para o Grafana. Confira o início e o fim no passo Período.';
        default:
          return 'O Grafana não conseguiu responder a esta consulta. Tente de novo ou preencha à mão.';
      }
    case 'no_dashboard':
      return 'Escolha o município na lista do Grafana (passo Município) antes de buscar.';
    case 'no_period':
      return 'Escolha o período (passo Período) antes de buscar no Grafana.';
    default:
      return 'Grafana indisponível no momento. Preencha os números à mão ou importe um CSV.';
  }
}

const payloadOf = (r: { payload?: unknown; structuredContent?: unknown; content?: { type: string; text?: string }[] } | null | undefined): any => {
  if (r?.payload && typeof r.payload === 'object') return r.payload;
  if (r?.structuredContent && typeof r.structuredContent === 'object') return r.structuredContent;
  const text = r?.content?.find?.((c) => c?.type === 'text')?.text;
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};

const num = (n: unknown): number | null => (typeof n === 'number' && Number.isFinite(n) ? n : null);

type ConnectorIndicator = { id?: string; value?: number | null; before?: number | null; after?: number | null; items?: string[]; panel_title?: string };

/** Resposta de get_case_indicators → valores do formulário (só ids conhecidos; quem revisa ainda pode editar). */
export function toIndicatorValues(payload: any): GrafanaFetch {
  const values: GrafanaIndicators = {};
  const filled: IndicatorId[] = [];
  for (const raw of (payload?.indicators ?? []) as ConnectorIndicator[]) {
    const def = INDICATORS.find((d) => d.id === raw?.id);
    if (!def || filled.includes(def.id)) continue;
    if (def.unit === 'lista') {
      const items = (raw.items ?? []).map((s) => String(s).trim()).filter(Boolean);
      if (!items.length) continue;
      values[def.id] = { enabled: true, items };
    } else {
      const value = num(raw.value);
      const before = def.comparison ? num(raw.before) : null;
      const after = def.comparison ? num(raw.after) : null;
      if (value == null && after == null) continue;
      values[def.id] = { enabled: true, value, ...(def.comparison ? { before, after } : {}) };
    }
    filled.push(def.id);
  }
  const titles = (list: unknown) => ((list ?? []) as { title?: string }[]).map((p) => String(p?.title ?? '').trim()).filter(Boolean);
  return { values, filled, unmapped: titles(payload?.unmapped_panels), failed: titles(payload?.failed_panels) };
}

/** Fonte Grafana ligada a uma capacidade `mcp` (null fora do claude.ai). */
export function createGrafanaSource(getMcp: () => Promise<McpLike | null>): GrafanaSource {
  const need = async () => {
    const mcp = await getMcp();
    if (!mcp) throw new GrafanaError('unavailable');
    return mcp;
  };
  const call = async (tool: (typeof GRAFANA_TOOLS)[number], input: Record<string, unknown>) => {
    const mcp = await need();
    try {
      return payloadOf(await mcp.callTool(GRAFANA_CONNECTOR, tool, input, { cache: false }));
    } catch (e) {
      const code = (e as ErrLike)?.code ?? 'upstream_error';
      const err = new GrafanaError(code, grafanaMessage(e));
      (err as GrafanaError & { tool?: string | null }).tool = toolErrorCode(e);
      throw err;
    }
  };

  return {
    async status() {
      const mcp = await getMcp();
      if (!mcp) return 'unavailable';
      if (typeof mcp.listTools !== 'function') return 'ready';
      try {
        const { servers } = await mcp.listTools(GRAFANA_CONNECTOR);
        const s = servers.find((x) => x.server === GRAFANA_CONNECTOR);
        if (!s) return 'not_connected';
        return s.authStatus === 'needs_reauth' ? 'needs_reauth' : 'ready';
      } catch (e) {
        const code = (e as ErrLike)?.code;
        if (code === 'server_not_connected' || code === 'not_in_manifest') return 'not_connected';
        if (code === 'needs_reauth') return 'needs_reauth';
        return 'ready'; // decide na hora da consulta
      }
    },

    async listMunicipios(query = '') {
      const q = query.trim();
      const d = await call('list_case_dashboards', q ? { query: q } : {});
      return ((d?.dashboards ?? []) as { uid: string; title?: string; municipio?: string; uf?: string | null; folder?: string }[])
        .filter((x) => x?.uid)
        .map((x) => ({ id: x.uid, dashboardUid: x.uid, nome: x.municipio || x.title || x.uid, ...(x.uf ? { uf: x.uf } : {}), titulo: x.title ?? '', pasta: x.folder ?? '' }));
    },

    async fetchIndicators(municipio, periodo) {
      const uid = municipio.dashboardUid ?? municipio.id;
      if (!uid) throw new GrafanaError('no_dashboard');
      const from = periodo.inicio || periodo.fim;
      const to = periodo.fim || periodo.inicio;
      if (!from || !to) throw new GrafanaError('no_period');
      return toIndicatorValues(await call('get_case_indicators', { dashboard_uid: uid, from, to }));
    },
  };
}
