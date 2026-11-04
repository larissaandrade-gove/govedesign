// Mapa painel → indicador do Gerador de cases e redução das consultas a um número só.
// O mapa fica em indicators.json (títulos por expressão regular e, por dashboard,
// o id do painel). Daqui nunca sai dado linha a linha: só valores reduzidos
// (último, soma, média…) e, para "funcionalidades", nomes de funcionalidades.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_MAP_PATH = join(HERE, 'indicators.json');

const UNITS = new Set(['numero', 'brl', 'pct', 'nota', 'lista']);
const REDUCERS = new Set(['panel', 'last', 'first', 'sum', 'mean', 'max', 'min', 'names']);
const UFS = new Set('AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO'.split(' '));
const MAX_ITEMS = 30;
const MAX_RANGE_MS = 5 * 366 * 864e5;

/** Título em minúsculas, sem acento e com espaços simples (é contra isso que as expressões batem). */
export const normalizeTitle = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export function loadIndicatorMap(source = DEFAULT_MAP_PATH) {
  const raw = typeof source === 'string' ? JSON.parse(readFileSync(source, 'utf8')) : source;
  const indicators = Object.entries(raw.indicators ?? {}).map(([id, d]) => {
    if (!UNITS.has(d.unit)) throw new Error(`indicators.json: unidade inválida em ${id}`);
    const reduce = d.reduce ?? 'panel';
    if (!REDUCERS.has(reduce)) throw new Error(`indicators.json: reduce inválido em ${id}`);
    return { id, unit: d.unit, reduce, comparison: Boolean(d.comparison), titles: (d.titles ?? []).map((t) => new RegExp(t, 'i')) };
  });
  const overrides = {};
  for (const [uid, panels] of Object.entries(raw.overrides ?? {})) {
    if (uid.startsWith('_')) continue;
    overrides[uid] = Object.fromEntries(Object.entries(panels ?? {}).map(([pid, ind]) => [String(pid), ind]));
  }
  return { indicators, overrides, ignoreTypes: new Set(raw.ignore_panel_types ?? ['row', 'text']), timezoneOffset: raw.timezone_offset ?? '-03:00' };
}

/** Painéis do dashboard, incluindo os que estão dentro de linhas recolhidas. */
export function flattenPanels(dashboard) {
  const out = [];
  const walk = (list) => {
    for (const p of list ?? []) {
      out.push(p);
      if (Array.isArray(p.panels)) walk(p.panels);
    }
  };
  walk(dashboard?.panels);
  return out;
}

/** Associa cada painel a um indicador (override por id do painel, senão o título). */
export function mapPanels(dashboard, uid, map) {
  const byId = new Map(map.indicators.map((i) => [i.id, i]));
  const over = map.overrides[uid] ?? {};
  const mapped = [];
  const unmapped = [];
  const taken = new Map();
  for (const panel of flattenPanels(dashboard)) {
    if (map.ignoreTypes.has(panel.type)) continue;
    const info = { id: panel.id ?? null, title: String(panel.title ?? ''), type: panel.type ?? '' };
    let ind = null;
    if (Object.hasOwn(over, String(panel.id))) {
      ind = over[String(panel.id)] === null ? null : byId.get(over[String(panel.id)]) ?? null;
    } else {
      const t = normalizeTitle(panel.title);
      ind = t ? map.indicators.find((i) => i.titles.some((r) => r.test(t))) ?? null : null;
    }
    if (!ind) {
      unmapped.push(info);
    } else if (taken.has(ind.id)) {
      unmapped.push({ ...info, duplicate_of: ind.id });
    } else {
      taken.set(ind.id, panel);
      mapped.push({ indicator: ind, panel });
    }
  }
  return { mapped, unmapped };
}

/** Indicador que o mapa daria para o painel (para o diagnóstico em describe_dashboard). */
export function indicatorFor(dashboard, uid, map, panelId) {
  return mapPanels(dashboard, uid, map).mapped.find((m) => m.panel.id === panelId)?.indicator.id ?? null;
}

/* ------------------------------------------------------------- município */

/** Nome e UF do município a partir do título do dashboard ("Cases - São Carlos/SP" → São Carlos, SP). */
export function guessMunicipio(title) {
  let s = String(title ?? '').trim();
  const prefix = /^(cases?|gove|dashboard|painel|resultados?)\s*[-–—:|]\s*/i;
  while (prefix.test(s)) s = s.replace(prefix, '');
  s = s.replace(/\s*[-–—|]\s*(cases?|gove|dashboard|painel|resultados?)$/i, '').replace(/\s*\((cases?)\)$/i, '');
  s = s.replace(/^(prefeitura( municipal)? de|munic[ií]pio de)\s+/i, '');
  let uf;
  const m = /(?:\s*[-–—/|,]\s*|\s+\(|\s+)([A-Za-z]{2})\)?$/.exec(s);
  if (m && UFS.has(m[1].toUpperCase()) && m[1] === m[1].toUpperCase()) {
    uf = m[1];
    s = s.slice(0, m.index);
  }
  return { nome: s.replace(/[\s\-–—/|,:]+$/, '').trim() || String(title ?? '').trim(), ...(uf ? { uf } : {}) };
}

/* ---------------------------------------------------------------- período */

const RELATIVE = /^now(?:-(\d+)([smhdwMy]))?$/;
const UNIT_MS = { s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 };

function parseInstant(raw, end, tz, nowMs) {
  const s = String(raw ?? '').trim();
  if (/^\d{10,13}$/.test(s)) return Number(s.length === 10 ? s + '000' : s);
  let m = /^(\d{4})-(\d{2})$/.exec(s);
  if (m) {
    const start = Date.parse(`${m[1]}-${m[2]}-01T00:00:00${tz}`);
    if (!end) return start;
    const y = Number(m[1]) + (m[2] === '12' ? 1 : 0);
    const mo = m[2] === '12' ? 1 : Number(m[2]) + 1;
    return Date.parse(`${y}-${String(mo).padStart(2, '0')}-01T00:00:00${tz}`) - 1;
  }
  m = /^(\d{4}-\d{2}-\d{2})$/.exec(s);
  if (m) return Date.parse(`${m[1]}T${end ? '23:59:59.999' : '00:00:00'}${tz}`);
  m = RELATIVE.exec(s);
  if (m) {
    if (!m[1]) return nowMs;
    const n = Number(m[1]);
    if (m[2] === 'M' || m[2] === 'y') {
      const d = new Date(nowMs);
      d.setUTCMonth(d.getUTCMonth() - (m[2] === 'M' ? n : n * 12));
      return d.getTime();
    }
    return nowMs - n * UNIT_MS[m[2]];
  }
  return /^\d{4}-\d{2}-\d{2}T/.test(s) ? Date.parse(s) : NaN;
}

/** from/to em AAAA-MM, AAAA-MM-DD, ISO, epoch (ms) ou relativo (now-30d). Erro com mensagem clara. */
export function parsePeriod(from, to, { tz = '-03:00', now = Date.now() } = {}) {
  const fromMs = parseInstant(from, false, tz, now);
  const toMs = parseInstant(to, true, tz, now);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) throw new RangeError('Período inválido. Use AAAA-MM, AAAA-MM-DD, data ISO ou now-30d.');
  if (fromMs >= toMs) throw new RangeError('O início do período precisa vir antes do fim.');
  if (toMs - fromMs > MAX_RANGE_MS) throw new RangeError('Período longo demais (máximo de 5 anos).');
  return { fromMs, toMs };
}

/* -------------------------------------------------------------- consultas */

function templateVars(dashboard) {
  const vars = {};
  for (const v of dashboard?.templating?.list ?? []) {
    let val = v?.current?.value;
    if (Array.isArray(val)) val = val.filter((x) => x !== '$__all').join(',');
    if (v?.name && val != null && val !== '$__all') vars[v.name] = String(val);
  }
  return vars;
}

function interpolate(value, vars) {
  if (typeof value === 'string') {
    return value.replace(/\$\{(\w+)(?::[\w]+)?\}|\[\[(\w+)\]\]|\$(\w+)/g, (all, a, b, c) => {
      const name = a ?? b ?? c;
      return !name.startsWith('__') && Object.hasOwn(vars, name) ? vars[name] : all;
    });
  }
  if (Array.isArray(value)) return value.map((v) => interpolate(v, vars));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, interpolate(v, vars)]));
  return value;
}

function resolveDatasource(ds, vars) {
  if (ds == null) return undefined;
  if (typeof ds === 'string') {
    const name = interpolate(ds, vars);
    return { uid: name };
  }
  if (typeof ds === 'object' && typeof ds.uid === 'string') return { ...ds, uid: interpolate(ds.uid, vars) };
  return ds;
}

/** Corpo do POST /api/ds/query para os alvos (targets) de um painel. */
export function buildQuery(panel, dashboard, fromMs, toMs) {
  const vars = templateVars(dashboard);
  const intervalMs = Math.max(60_000, Math.round((toMs - fromMs) / 1000));
  const queries = (panel.targets ?? [])
    .filter((t) => t && !t.hide)
    .map((t, i) => {
      const q = interpolate({ ...t }, vars);
      q.refId = t.refId || String.fromCharCode(65 + i);
      const ds = resolveDatasource(t.datasource ?? panel.datasource, vars);
      if (ds) q.datasource = ds;
      q.intervalMs = intervalMs;
      q.maxDataPoints = 1000;
      return q;
    });
  return { queries, from: String(fromMs), to: String(toMs) };
}

/* ---------------------------------------------------------------- redução */

const CALC_MAP = { lastNotNull: 'last', last: 'last', firstNotNull: 'first', first: 'first', sum: 'sum', mean: 'mean', max: 'max', min: 'min' };

const reducer = (name) =>
  ({
    last: (v) => v[v.length - 1],
    first: (v) => v[0],
    sum: (v) => v.reduce((a, b) => a + b, 0),
    mean: (v) => v.reduce((a, b) => a + b, 0) / v.length,
    max: (v) => Math.max(...v),
    min: (v) => Math.min(...v),
  })[name];

const round = (n) => (Number.isFinite(n) ? Math.round(n * 1e4) / 1e4 : null);

/** Erros por consulta na resposta de /api/ds/query (mensagem do Grafana não sai: só "falhou"). */
export function queryErrors(response) {
  return Object.values(response?.results ?? {}).filter((r) => r?.error || (r?.status && r.status >= 400)).length;
}

function fieldsOf(response) {
  const out = [];
  for (const r of Object.values(response?.results ?? {})) {
    for (const frame of r?.frames ?? []) {
      const fields = frame?.schema?.fields ?? [];
      const values = frame?.data?.values ?? [];
      fields.forEach((f, i) => out.push({ field: f, values: Array.isArray(values[i]) ? values[i] : [] }));
    }
  }
  return out;
}

const displayName = (f) => {
  const name = f?.config?.displayNameFromDS || f?.config?.displayName || f?.name || '';
  const labels = f?.labels && Object.values(f.labels).filter(Boolean);
  return String(labels?.length && /^(value|valor|count)$/i.test(name) ? labels.join(' ') : name).trim();
};

/**
 * Reduz a resposta de /api/ds/query a um número (ou a uma lista de nomes, em "names").
 * Várias séries: soma dos valores reduzidos (média, quando o redutor é a média).
 */
export function reduceResponse(response, { reduce = 'panel', unit = 'numero', panel } = {}) {
  let how = reduce;
  if (how === 'panel') how = CALC_MAP[panel?.options?.reduceOptions?.calcs?.[0]] ?? 'last';
  const fields = fieldsOf(response);

  if (how === 'names' || unit === 'lista') {
    const items = [];
    const push = (s) => {
      const t = String(s ?? '').trim().slice(0, 80);
      if (t && !items.includes(t) && items.length < MAX_ITEMS) items.push(t);
    };
    const strings = fields.filter((f) => f.field?.type === 'string');
    if (strings.length) strings[0].values.forEach(push);
    else fields.filter((f) => f.field?.type === 'number' && f.values.some((v) => Number(v) > 0)).forEach((f) => push(displayName(f.field)));
    return { items };
  }

  const fn = reducer(how) ?? reducer('last');
  const per = fields
    .filter((f) => f.field?.type === 'number' || (f.field?.type !== 'time' && f.field?.type !== 'string' && f.values.some((v) => typeof v === 'number')))
    .map((f) => f.values.filter((v) => typeof v === 'number' && Number.isFinite(v)))
    .filter((v) => v.length)
    .map(fn);
  if (!per.length) return { value: null };
  let value = how === 'mean' ? per.reduce((a, b) => a + b, 0) / per.length : per.reduce((a, b) => a + b, 0);
  if (unit === 'pct' && panel?.fieldConfig?.defaults?.unit === 'percentunit') value *= 100;
  return { value: round(value) };
}
