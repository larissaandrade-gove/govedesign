// Conector "Gove Grafana" para o claude.ai (MCP por HTTP, OAuth 2.1). O Grafana da Gove
// fica dentro da VPN; este servidor, que também fica, conversa com ele e expõe à internet
// só /mcp/grafana, /oauth/* e /.well-known/*. Cada pessoa entra com o usuário e a senha do
// próprio Grafana (backend/grafana/oauth.js) e toda consulta usa a sessão dela: as
// permissões do Grafana valem também aqui.
//
// Ferramentas (só leitura):
//   list_case_dashboards  dashboards de cases (tag GRAFANA_CASES_TAG, padrão "cases")
//   describe_dashboard    painéis de um dashboard (diagnóstico do mapa de indicadores)
//   get_case_indicators   indicadores do Gerador de cases, já reduzidos a um número
//
// Configuração (variáveis de ambiente):
//   GRAFANA_URL                  endereço interno do Grafana (ex.: https://grafana.interno.gove.digital)
//   GRAFANA_CONNECTOR_SECRET     segredo longo e aleatório (criptografia da sessão, formulário)
//   PUBLIC_BASE_URL              endereço público deste servidor (ex.: https://design.gove.digital)
//   GRAFANA_CONNECTOR_REDIRECTS  redirect_uri aceitos, separados por vírgula
//   GRAFANA_CASES_TAG            tag dos dashboards de cases (padrão: cases)
//   GRAFANA_SESSION_COOKIE       nome do cookie de sessão do Grafana (padrão: grafana_session)
// Sem GRAFANA_URL, segredo ou PUBLIC_BASE_URL, as rotas respondem 503 e o resto do servidor sobe normalmente.
import express from 'express';
import { GrafanaError, createGrafanaClient } from './grafana/client.js';
import { buildQuery, flattenPanels, guessMunicipio, loadIndicatorMap, mapPanels, normalizeTitle, parsePeriod, queryErrors, reduceResponse } from './grafana/indicators.js';
import { MCP_PATH, createOAuth, parseRedirects } from './grafana/oauth.js';

export const DEFAULT_REDIRECTS = 'https://claude.ai/api/mcp/auth_callback,https://claude.com/api/mcp/auth_callback';
const SECRET_MIN = 32;
const UID = /^[A-Za-z0-9_.-]{1,64}$/;

const TOOLS = [
  {
    name: 'list_case_dashboards',
    title: 'Listar dashboards de cases',
    description: 'Lista os dashboards de cases de municípios no Grafana da Gove (um por município) que a pessoa conectada pode ver. Devolve uid, título, município provável, pasta e endereço.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Parte do nome do município ou do título do dashboard' },
        folder: { type: 'string', description: 'Só dashboards desta pasta (nome da pasta)' },
      },
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'describe_dashboard',
    title: 'Descrever dashboard',
    description: 'Lista os painéis de um dashboard (id, título, tipo, fonte de dados) e o indicador do case que cada um alimenta. Serve para conferir o mapa de indicadores.',
    inputSchema: {
      type: 'object',
      properties: { dashboard_uid: { type: 'string', description: 'uid do dashboard (de list_case_dashboards)' } },
      required: ['dashboard_uid'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'get_case_indicators',
    title: 'Indicadores do case',
    description:
      'Indicadores do Gerador de cases de um município no período: atendimentos, ganho financeiro, arrecadação, taxa de abertura, avaliação e funcionalidades. Devolve só números já reduzidos (sem dados linha a linha), com antes/depois quando o indicador tem comparação.',
    inputSchema: {
      type: 'object',
      properties: {
        dashboard_uid: { type: 'string', description: 'uid do dashboard do município' },
        from: { type: 'string', description: 'Início: AAAA-MM, AAAA-MM-DD, data ISO ou now-90d' },
        to: { type: 'string', description: 'Fim: AAAA-MM, AAAA-MM-DD, data ISO ou now' },
      },
      required: ['dashboard_uid', 'from', 'to'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

/** Erro de ferramenta com código estável (o app cases mapeia o código para a mensagem). */
class ToolError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
/** Sessão do Grafana recusada: a resposta HTTP vira 401 e o claude.ai pede o login de novo. */
class SessionExpired extends Error {}

const MESSAGES = {
  forbidden: 'Sem permissão no Grafana para este dashboard.',
  not_found: 'Dashboard não encontrado no Grafana. Confira o uid em list_case_dashboards.',
  timeout: 'O Grafana demorou demais para responder. Tente um período menor ou tente de novo.',
  unavailable: 'O Grafana não respondeu agora. Tente de novo em alguns minutos.',
  bad_response: 'Resposta inesperada do Grafana.',
};

function asToolError(err) {
  if (err instanceof ToolError) return err;
  if (err instanceof GrafanaError) {
    if (err.kind === 'unauthorized') return new SessionExpired();
    return new ToolError(err.kind, MESSAGES[err.kind] ?? MESSAGES.unavailable);
  }
  if (err instanceof RangeError) return new ToolError('invalid_argument', err.message);
  return new ToolError('error', 'Falha ao consultar o Grafana.');
}

function missingConfig({ grafanaUrl, secret, publicBaseUrl }) {
  const missing = [];
  if (!grafanaUrl) missing.push('GRAFANA_URL');
  if (!secret) missing.push('GRAFANA_CONNECTOR_SECRET');
  if (!publicBaseUrl) missing.push('PUBLIC_BASE_URL');
  if (missing.length) return `Conector Gove Grafana não configurado no servidor: defina ${missing.join(', ')}.`;
  if (String(secret).length < SECRET_MIN) return `Conector Gove Grafana: GRAFANA_CONNECTOR_SECRET precisa de pelo menos ${SECRET_MIN} caracteres.`;
  if (!URL.canParse(grafanaUrl) || !URL.canParse(publicBaseUrl)) return 'Conector Gove Grafana: GRAFANA_URL e PUBLIC_BASE_URL precisam ser endereços completos (https://…).';
  return null;
}

export function createGrafanaConnector({
  db,
  grafanaUrl = process.env.GRAFANA_URL,
  secret = process.env.GRAFANA_CONNECTOR_SECRET,
  publicBaseUrl = process.env.PUBLIC_BASE_URL,
  redirects = process.env.GRAFANA_CONNECTOR_REDIRECTS || DEFAULT_REDIRECTS,
  casesTag = process.env.GRAFANA_CASES_TAG || 'cases',
  sessionCookie = process.env.GRAFANA_SESSION_COOKIE || 'grafana_session',
  fetchImpl = fetch,
  timeoutMs,
  indicatorMap = loadIndicatorMap(),
  log = console,
  now = Date.now,
} = {}) {
  const router = express.Router();
  const problem = missingConfig({ grafanaUrl, secret, publicBaseUrl });
  if (problem) {
    const off = (_req, res) => res.status(503).json({ error: problem });
    for (const p of ['/.well-known/oauth-protected-resource', '/.well-known/oauth-authorization-server']) router.all([p, `${p}/*rest`], off);
    router.all(['/oauth', '/oauth/*rest', MCP_PATH], off);
    return router;
  }

  const grafana = createGrafanaClient({ baseUrl: grafanaUrl, cookieName: sessionCookie, fetchImpl, timeoutMs });
  const auditStmt = () => db.prepare('INSERT INTO grafana_audit (grafana_login, tool, dashboard_uid, outcome) VALUES (?, ?, ?, ?)');
  let insertAudit;
  const audit = ({ login, tool, dashboard = null, outcome }) => {
    try {
      (insertAudit ??= auditStmt()).run(login ?? null, tool, dashboard, outcome);
    } catch (err) {
      log.error?.(`[grafana-connector] falha no registro de uso: ${err.message}`);
    }
  };
  const oauth = createOAuth({ db, secret, publicBaseUrl, redirects: parseRedirects(redirects), grafana, audit, log, now });
  router.use(oauth.router);

  /* ------------------------------------------------------------ ferramentas */

  const dashboardUrl = (u) => (u ? new URL(u, grafanaUrl).toString() : '');

  async function listDashboards(g, args) {
    const params = { type: 'dash-db', limit: '1000' };
    if (casesTag) params.tag = casesTag;
    const query = String(args.query ?? '').trim().slice(0, 100);
    if (query) params.query = query;
    const hits = await g.get('/api/search', params);
    const folder = normalizeTitle(args.folder);
    const dashboards = (Array.isArray(hits) ? hits : [])
      .filter((h) => h?.type === 'dash-db' && (!folder || normalizeTitle(h.folderTitle ?? 'General').includes(folder)))
      .map((h) => {
        const m = guessMunicipio(h.title);
        return { uid: h.uid, title: h.title, municipio: m.nome, uf: m.uf ?? null, folder: h.folderTitle ?? 'General', url: dashboardUrl(h.url) };
      })
      .sort((a, b) => a.municipio.localeCompare(b.municipio, 'pt-BR'));
    return { tag: casesTag || null, total: dashboards.length, dashboards };
  }

  async function getDashboard(g, uid) {
    if (!UID.test(uid)) throw new ToolError('invalid_argument', 'dashboard_uid inválido.');
    const d = await g.get(`/api/dashboards/uid/${encodeURIComponent(uid)}`);
    if (!d?.dashboard) throw new ToolError('bad_response', MESSAGES.bad_response);
    return d;
  }

  const dsLabel = (ds) => (ds == null ? null : typeof ds === 'string' ? ds : ds.uid ?? ds.type ?? null);

  async function describeDashboard(g, uid) {
    const { dashboard, meta } = await getDashboard(g, uid);
    const { mapped } = mapPanels(dashboard, uid, indicatorMap);
    const byPanel = new Map(mapped.map((m) => [m.panel, m.indicator.id]));
    const panels = flattenPanels(dashboard)
      .filter((p) => p.type !== 'row')
      .map((p) => ({
        id: p.id ?? null,
        title: String(p.title ?? ''),
        type: p.type ?? '',
        datasource: dsLabel(p.datasource) ?? dsLabel(p.targets?.find((t) => t?.datasource)?.datasource),
        queries: (p.targets ?? []).filter((t) => !t?.hide).length,
        indicator: byPanel.get(p) ?? null,
      }));
    const m = guessMunicipio(dashboard.title);
    return { uid, title: dashboard.title ?? '', municipio: m.nome, uf: m.uf ?? null, folder: meta?.folderTitle ?? 'General', panels };
  }

  async function runPanel(g, panel, dashboard, fromMs, toMs, indicator) {
    const body = buildQuery(panel, dashboard, fromMs, toMs);
    if (!body.queries.length) return { failed: 'painel sem consultas' };
    const { data } = await g.post('/api/ds/query', body, [207, 400]);
    if (queryErrors(data) === body.queries.length) return { failed: 'consulta do painel falhou no Grafana' };
    return reduceResponse(data, { reduce: indicator.reduce, unit: indicator.unit, panel });
  }

  async function caseIndicators(g, args) {
    const uid = String(args.dashboard_uid ?? '').trim();
    const { fromMs, toMs } = parsePeriod(args.from, args.to, { tz: indicatorMap.timezoneOffset, now: now() });
    const { dashboard } = await getDashboard(g, uid);
    const { mapped, unmapped } = mapPanels(dashboard, uid, indicatorMap);
    const indicators = [];
    const failed = [];
    for (const { indicator, panel } of mapped) {
      const title = String(panel.title ?? '');
      try {
        const cur = await runPanel(g, panel, dashboard, fromMs, toMs, indicator);
        if (cur.failed) {
          failed.push({ id: panel.id ?? null, title, indicator: indicator.id, reason: cur.failed });
          continue;
        }
        const out = { id: indicator.id, unit: indicator.unit, panel_title: title, panel_id: panel.id ?? null };
        if (indicator.unit === 'lista') out.items = cur.items;
        else out.value = cur.value;
        if (indicator.comparison && indicator.unit !== 'lista') {
          const span = toMs - fromMs;
          const prev = await runPanel(g, panel, dashboard, fromMs - span - 1, fromMs - 1, indicator);
          if (!prev.failed && prev.value != null) out.before = prev.value;
          if (cur.value != null) out.after = cur.value;
        }
        indicators.push(out);
      } catch (err) {
        const e = asToolError(err);
        if (e instanceof SessionExpired) throw e;
        // Painel sem permissão na fonte de dados ou lento: os outros seguem
        if (e.code === 'forbidden' || e.code === 'timeout' || e.code === 'not_found') failed.push({ id: panel.id ?? null, title, indicator: indicator.id, reason: MESSAGES[e.code] });
        else throw e;
      }
    }
    const m = guessMunicipio(dashboard.title);
    return {
      dashboard_uid: uid,
      dashboard_title: dashboard.title ?? '',
      municipio: m.nome,
      uf: m.uf ?? null,
      period: { from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString() },
      indicators,
      unmapped_panels: unmapped,
      failed_panels: failed,
    };
  }

  /* -------------------------------------------------------------- protocolo */

  const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
  const fail = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
  const toolResult = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data });
  const toolError = (code, message) => ({ content: [{ type: 'text', text: message }], structuredContent: { error: { code, message } }, isError: true });

  async function handle(msg, who) {
    const { id, method, params = {} } = msg ?? {};
    if (method === 'initialize') {
      return ok(id, {
        protocolVersion: params.protocolVersion || '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'gove-grafana', title: 'Gove Grafana', version: '1.0.0' },
        instructions:
          'Dashboards de cases de municípios no Grafana da Gove, com as permissões de quem está conectado. Use list_case_dashboards para achar o uid do município e get_case_indicators para os números do período. Só leitura; sem dados linha a linha.',
      });
    }
    if (typeof method === 'string' && method.startsWith('notifications/')) return null;
    if (method === 'ping') return ok(id, {});
    if (method === 'tools/list') return ok(id, { tools: TOOLS });
    if (method === 'tools/call') {
      const args = params.arguments ?? {};
      const tool = params.name;
      if (!TOOLS.some((t) => t.name === tool)) return fail(id, -32602, `Ferramenta desconhecida: ${tool}`);
      const dashboard = typeof args.dashboard_uid === 'string' ? args.dashboard_uid.slice(0, 64) : null;
      const g = grafana.session(who.cookie, (next) => who.saveCookie(next));
      try {
        let data;
        if (tool === 'list_case_dashboards') data = await listDashboards(g, args);
        else if (tool === 'describe_dashboard') data = await describeDashboard(g, String(args.dashboard_uid ?? '').trim());
        else data = await caseIndicators(g, args);
        audit({ login: who.login, tool, dashboard, outcome: 'ok' });
        return ok(id, toolResult(data));
      } catch (err) {
        const e = asToolError(err);
        audit({ login: who.login, tool, dashboard, outcome: e instanceof SessionExpired ? 'session_expired' : e.code });
        if (e instanceof SessionExpired) throw e;
        if (e.code === 'error') log.error?.(`[grafana-connector] ${tool}: ${err?.message ?? 'erro'}`);
        return ok(id, toolError(e.code, e.message));
      }
    }
    return fail(id, -32601, `Método não suportado: ${method}`);
  }

  router.all(MCP_PATH, express.json({ limit: '64kb' }), async (req, res) => {
    if (req.method !== 'POST') return res.status(405).set('Allow', 'POST').end();
    const who = oauth.authenticate(req);
    if (!who) return oauth.unauthorized(res, { invalid: Boolean(req.headers.authorization) });
    try {
      const body = req.body;
      if (Array.isArray(body)) {
        const out = [];
        for (const m of body) {
          const r = await handle(m, who);
          if (r) out.push(r);
        }
        return out.length ? res.json(out) : res.status(202).end();
      }
      const out = await handle(body, who);
      return out ? res.json(out) : res.status(202).end();
    } catch (err) {
      if (err instanceof SessionExpired) {
        who.revoke();
        return oauth.unauthorized(res, { invalid: true, description: 'Sessão do Grafana expirada. Entre de novo.' });
      }
      log.error?.(`[grafana-connector] erro interno: ${err?.message ?? 'erro'}`);
      return res.status(500).json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Erro interno do conector.' } });
    }
  });

  return router;
}
