// Solicitações para a área de design (tickets). Fonte única usada pelo
// servidor, pelo Design System e pelo Apps Script da planilha RAR: frentes,
// prazos em horas úteis, distribuição da produção na agenda do design, linha da
// aba "Novo RAR", e-mail e eventos de agenda.

/**
 * Expediente padrão da responsável pelas solicitações (Brasília, sem horário de
 * verão): seg–sex, 8h–12h e 13h–17h. Ela atualiza o expediente na página
 * Solicitações; cada pedido guarda uma cópia do expediente em que foi feito.
 */
export const DEFAULT_SCHEDULE = Object.freeze({
  days: Object.freeze([1, 2, 3, 4, 5]),
  periods: Object.freeze([Object.freeze(['08:00', '12:00']), Object.freeze(['13:00', '17:00'])]),
});
/** Períodos do expediente padrão em horas ([[8, 12], [13, 17]]). */
export const WORK_PERIODS = DEFAULT_SCHEDULE.periods.map((p) => p.map((h) => toMinutes(h) / 60));
export const TIME_ZONE = 'America/Sao_Paulo';
const OFFSET_MS = -3 * 3600e3; // UTC−3 o ano inteiro desde 2019
const HOUR = 3600e3;
const DAY = 24 * HOUR;
/** Hora de entrega no dia do prazo, no expediente padrão (fim do último período). */
export const DUE_HOUR = WORK_PERIODS[WORK_PERIODS.length - 1][1];

/** Responsável pelas solicitações: recebe os pedidos e os eventos na agenda (o servidor aceita TICKETS_INBOX). */
export const DESIGN_INBOX = 'larissa.andrade@gove.digital';
/** Planilha RAR (aba "Novo RAR") onde cada pedido vira uma linha. */
export const RAR_URL = 'https://docs.google.com/spreadsheets/d/1gtVN6m1Z0aPyNTVuLNJptKn8_TGrjN2yYymwy2c6QOY/edit';

/**
 * Prazo mínimo (horas úteis entre o pedido e a entrega) por prioridade, e horas
 * de produção reservadas na agenda do design. Cada frente multiplica os dois
 * pelo seu `factor` (edição de vídeo vale o dobro de uma demanda normal).
 */
export const LEAD_HOURS = { alta: 24, normal: 48 };
export const EFFORT_HOURS = 8;

export const TICKET_PRIORITIES = [
  { id: 'alta', label: 'Alta' },
  { id: 'normal', label: 'Normal' },
];

export const TICKET_TYPES = [
  {
    id: 'redesign',
    label: 'Redesign',
    summary: 'Revisão de diagramação e cores de peças',
    detail: 'Ajuste de diagramação e cores de peças existentes. Envie a peça atual.',
    factor: 1,
    pieceTypes: ['Post', 'Carrossel', 'Banner', 'Apresentação', 'Folder', 'E-mail marketing'],
    formats: ['Post 1:1', 'Post 4:5', 'Story 9:16', '16:9', 'A4'],
    linkLabel: 'Link da peça atual',
    linkRequired: false,
    fields: [],
  },
  {
    id: 'video',
    label: 'Edição de vídeo',
    summary: 'Corte e edição de vídeos de eventos da empresa',
    detail: 'Corte e edição de vídeos de eventos da Gove. Envie o link dos arquivos brutos.',
    factor: 2,
    pieceTypes: ['Aftermovie', 'Reels', 'Corte de palestra', 'Depoimento', 'Vídeo institucional'],
    formats: ['16:9', 'Story 9:16', 'Post 1:1', 'Post 4:5'],
    linkLabel: 'Link dos arquivos brutos',
    linkRequired: false,
    fields: [
      { id: 'evento', label: 'Evento', placeholder: 'Ex.: Governos do Futuro 2026' },
      { id: 'duracao', label: 'Duração final', placeholder: 'Ex.: 60 s, 3 min' },
    ],
  },
  {
    id: 'impressos',
    label: 'Documentação impressa',
    summary: 'Material para gráfica em formatos incomuns, customizados ou estratégicos',
    detail: 'Arquivos para gráfica em formatos especiais ou estratégicos.',
    factor: 1,
    pieceTypes: ['Folder', 'Flyer', 'Cartilha', 'Convite', 'Certificado', 'Crachá', 'Kit de boas-vindas'],
    formats: ['A4', 'A5', 'A3', '10×15 cm', '21×21 cm'],
    linkLabel: 'Especificação da gráfica ou referência',
    linkRequired: false,
    fields: [
      { id: 'acabamento', label: 'Acabamento', placeholder: 'Ex.: laminação fosca, dobra' },
      { id: 'tiragem', label: 'Tiragem', placeholder: 'Ex.: 500 unidades' },
    ],
  },
  {
    id: 'brindes',
    label: 'Brindes e outros materiais',
    summary: 'Garrafas, mochilas, itens tech e outros materiais além do papel',
    detail: 'Marca aplicada em garrafas, mochilas, itens tech e afins. Envie o link de cada item.',
    factor: 1,
    pieceTypes: ['Garrafa', 'Mochila', 'Caneca', 'Camiseta', 'Item tech', 'Ecobag'],
    formats: ['Área de gravação do fornecedor', '5×5 cm', '8×4 cm'],
    linkLabel: 'Link dos itens (especificações)',
    linkRequired: true,
    fields: [
      { id: 'quantidade', label: 'Quantidade', placeholder: 'Ex.: 200' },
      { id: 'fornecedor', label: 'Fornecedor', placeholder: 'Opcional' },
    ],
  },
];

export const typeById = (id) => TICKET_TYPES.find((t) => t.id === id);
/** Prazo mínimo em horas úteis para a frente e a prioridade. */
export const leadHours = (typeId, priority) => (LEAD_HOURS[priority] ?? LEAD_HOURS.normal) * (typeById(typeId)?.factor ?? 1);
/** Horas de produção reservadas na agenda do design. */
export const effortHours = (typeId) => EFFORT_HOURS * (typeById(typeId)?.factor ?? 1);

/* ------------------------------------------------------------ expediente */

function toMinutes(hhmm) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm ?? '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/**
 * Valida e normaliza um expediente `{ days: [0–6], periods: [['HH:MM', 'HH:MM'], …] }`.
 * Devolve `{ ok, error, schedule }` (períodos em ordem, sem sobreposição; ao
 * menos um dia e uma hora de trabalho por dia).
 */
export function normalizeSchedule(input) {
  const days = [...new Set((Array.isArray(input?.days) ? input.days : []).map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
  if (!days.length) return { ok: false, error: 'Escolha ao menos um dia de trabalho.', schedule: null };
  const raw = (Array.isArray(input?.periods) ? input.periods : []).slice(0, 6).map((p) => [toMinutes(p?.[0]), toMinutes(p?.[1])]);
  if (!raw.length) return { ok: false, error: 'Inclua ao menos um período de trabalho.', schedule: null };
  if (raw.some(([a, b]) => Number.isNaN(a) || Number.isNaN(b))) return { ok: false, error: 'Use horários no formato HH:MM.', schedule: null };
  if (raw.some(([a, b]) => b - a < 30)) return { ok: false, error: 'Cada período precisa terminar depois de começar (mínimo 30 min).', schedule: null };
  raw.sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < raw.length; i++) if (raw[i][0] < raw[i - 1][1]) return { ok: false, error: 'Os períodos não podem se sobrepor.', schedule: null };
  if (raw.reduce((n, [a, b]) => n + b - a, 0) < 60) return { ok: false, error: 'O expediente precisa ter ao menos 1 hora por dia.', schedule: null };
  const schedule = { days, periods: raw.map(([a, b]) => [hhmm(a), hhmm(b)]) };
  for (const k of ['updatedAt', 'updatedBy']) if (typeof input?.[k] === 'string') schedule[k] = input[k].slice(0, 80);
  return { ok: true, error: null, schedule };
}

/** Expediente válido ou o padrão. */
const sched = (s) => (s && s !== DEFAULT_SCHEDULE ? (normalizeSchedule(s).schedule ?? DEFAULT_SCHEDULE) : DEFAULT_SCHEDULE);
/** Períodos em ms a partir da meia-noite. */
const spansOf = (s) => sched(s).periods.map(([a, b]) => [toMinutes(a) * 60e3, toMinutes(b) * 60e3]);
/** Hora de entrega ("17:00"): fim do último período do expediente. */
export const dueTime = (schedule) => sched(schedule).periods.at(-1)[1];
/** Horas de trabalho por dia. */
export const dailyHours = (schedule) => spansOf(schedule).reduce((n, [a, b]) => n + b - a, 0) / HOUR;
/** "seg a sex · 08:00–12:00 e 13:00–17:00". */
export function scheduleLabel(schedule) {
  const s = sched(schedule);
  const d = s.days;
  const short = (i) => WEEKDAYS[i].slice(0, 3);
  const contiguous = d.length > 2 && d.every((x, i) => i === 0 || x === d[i - 1] + 1);
  const days = contiguous ? `${short(d[0])} a ${short(d.at(-1))}` : d.map(short).join(', ');
  return `${days} · ${s.periods.map(([a, b]) => `${a}–${b}`).join(' e ')}`;
}

/* ------------------------------------------------------------ calendário */

const wall = (ms) => new Date(ms + OFFSET_MS); // ler com getUTC*
const fromWall = (wallMs) => wallMs - OFFSET_MS;
const dayStartWall = (ms) => {
  const w = wall(ms);
  return Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate());
};
const iso = (d) => d.toISOString().slice(0, 10);

function easter(y) {
  // Algoritmo de Meeus/Jones/Butcher
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(y, month - 1, day);
}

const holidayCache = new Map();
/** Feriados nacionais (fixos e móveis, com Carnaval) no formato AAAA-MM-DD. */
export function holidays(year) {
  if (!holidayCache.has(year)) {
    const fixed = ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '11-20', '12-25'].map((md) => `${year}-${md}`);
    const e = easter(year);
    const moving = [-48, -47, -2, 60].map((d) => iso(new Date(e + d * DAY))); // Carnaval (2 dias), Sexta-feira Santa, Corpus Christi
    holidayCache.set(year, new Set([...fixed, ...moving]));
  }
  return holidayCache.get(year);
}

/** Dia útil? Recebe o início do dia em "hora de parede" (ms UTC deslocado). */
function isBusinessDayWall(dayWall, schedule) {
  const d = new Date(dayWall);
  return sched(schedule).days.includes(d.getUTCDay()) && !holidays(d.getUTCFullYear()).has(iso(d));
}

export const isBusinessDate = (yyyyMmDd, schedule) => isBusinessDayWall(Date.parse(`${yyyyMmDd}T00:00:00Z`), schedule);

/** Expedientes (ms UTC) entre dois instantes, por dia útil: [[início, fim], …][]. */
function workWindows(startMs, endMs, schedule) {
  const days = [];
  if (endMs <= startMs) return days;
  const periods = spansOf(schedule);
  for (let day = dayStartWall(startMs); fromWall(day) < endMs; day += DAY) {
    if (!isBusinessDayWall(day, schedule)) continue;
    const spans = [];
    for (const [a, b] of periods) {
      const s = Math.max(startMs, fromWall(day + a));
      const e = Math.min(endMs, fromWall(day + b));
      if (e > s) spans.push([s, e]);
    }
    if (spans.length) days.push(spans);
  }
  return days;
}

/** Instante (ms) em que se completam `hours` horas úteis a partir de `startMs`. */
export function addBusinessHours(startMs, hours, schedule) {
  let remaining = hours * HOUR;
  let day = dayStartWall(startMs);
  let cursor = startMs + OFFSET_MS;
  const periods = spansOf(schedule);
  for (let guard = 0; guard < 3660; guard++, day += DAY, cursor = day) {
    if (!isBusinessDayWall(day, schedule)) continue;
    for (const [a, b] of periods) {
      const s = Math.max(cursor, day + a);
      const e = day + b;
      if (s >= e) continue;
      if (remaining <= e - s) return fromWall(s + remaining);
      remaining -= e - s;
    }
  }
  throw new Error('Intervalo de horas úteis grande demais.');
}

/** Horas úteis entre dois instantes (0 se `endMs` vier antes). */
export function businessHoursBetween(startMs, endMs, schedule) {
  let total = 0;
  for (const spans of workWindows(startMs, endMs, schedule)) for (const [s, e] of spans) total += e - s;
  return total / HOUR;
}

/** Instante de entrega de um prazo AAAA-MM-DD (fim do expediente, Brasília). */
export const dueInstant = (yyyyMmDd, schedule) => fromWall(Date.parse(`${yyyyMmDd}T00:00:00Z`) + toMinutes(dueTime(schedule)) * 60e3);

/** Primeira data de entrega (AAAA-MM-DD) que cumpre o prazo mínimo em horas úteis. */
export function earliestDueDate(nowMs, minHours, schedule) {
  return iso(wall(addBusinessHours(nowMs, minHours, schedule)));
}

const nextBusinessDate = (yyyyMmDd, schedule) => {
  let d = Date.parse(`${yyyyMmDd}T00:00:00Z`) + DAY;
  while (!isBusinessDayWall(d, schedule)) d += DAY;
  return iso(new Date(d));
};

/* ------------------------------------------------- agenda do design */

/** Intervalos livres entre dois instantes, descontando os ocupados (reuniões, outras produções). */
export function freeFromBusy(startMs, endMs, busy) {
  const sorted = busy
    .map((b) => [Math.max(startMs, b.start), Math.min(endMs, b.end)])
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);
  const free = [];
  let cursor = startMs;
  for (const [s, e] of sorted) {
    if (s > cursor) free.push({ start: cursor, end: s });
    cursor = Math.max(cursor, e);
  }
  if (cursor < endMs) free.push({ start: cursor, end: endMs });
  return free;
}

const HALF = HOUR / 2;

/** Expediente livre por dia útil: cruza o horário de trabalho com os intervalos livres (sem `free`, todo o expediente). */
function freeByDay(startMs, endMs, free, schedule) {
  return workWindows(startMs, endMs, schedule)
    .map((spans) => (free ? spans.flatMap(([s, e]) => free.map((f) => [Math.max(s, f.start), Math.min(e, f.end)]).filter(([a, b]) => b - a >= HALF)) : spans))
    .filter((spans) => spans.length);
}

const roundUpHalf = (ms) => Math.ceil(ms / HALF - 1e-9) * HALF;

/**
 * Distribui as horas de produção por igual entre os dias úteis livres até o
 * prazo, sem cruzar reuniões nem outras produções (`free` = intervalos livres
 * da agenda do design; sem ele, só o horário de trabalho). Blocos de no mínimo
 * 30 min. Devolve os blocos e quanto faltou encaixar.
 */
export function planWork({ nowMs, dueMs, hours, free = null, schedule }) {
  const start = Math.ceil(nowMs / HALF) * HALF; // blocos começam em hora cheia ou meia hora
  const days = freeByDay(start, dueMs, free, schedule).map((spans) => spans.map(([s, e]) => [s, e]));
  let remaining = hours * HOUR;
  const blocks = [];
  const take = (spans, quota) => {
    let got = 0;
    for (const span of spans) {
      if (quota - got < HALF) break;
      const len = Math.min(span[1] - span[0], quota - got);
      if (len < HALF) continue;
      blocks.push({ start: span[0], end: span[0] + len });
      span[0] += len;
      got += len;
    }
    return got;
  };
  // 1ª passada: cota igual por dia (cada dia leva o que falta dividido pelos dias restantes)
  days.forEach((spans, i) => {
    if (remaining <= 0) return;
    remaining -= take(spans, Math.min(remaining, roundUpHalf(remaining / (days.length - i))));
  });
  // 2ª passada: o que não coube volta a ocupar o espaço livre que sobrou
  for (const spans of days) if (remaining > 0) remaining -= take(spans, remaining);

  blocks.sort((a, b) => a.start - b.start);
  const merged = [];
  for (const b of blocks) {
    const last = merged[merged.length - 1];
    if (last && last.end === b.start) last.end = b.end;
    else merged.push({ ...b });
  }
  return { blocks: merged, missingHours: Math.max(0, remaining) / HOUR };
}

/**
 * Primeira data de entrega que cumpre o prazo mínimo E tem espaço livre na
 * agenda do design para a produção (procura até `maxDays` dias úteis adiante).
 */
export function earliestFeasibleDate({ nowMs, typeId, priority, free = null, maxDays = 60, schedule }) {
  let d = earliestDueDate(nowMs, leadHours(typeId, priority), schedule);
  const need = effortHours(typeId);
  for (let i = 0; i < maxDays; i++, d = nextBusinessDate(d, schedule)) {
    if (planWork({ nowMs, dueMs: dueInstant(d, schedule), hours: need, free, schedule }).missingHours === 0) return d;
  }
  return null;
}

/** "4T26" — trimestre no formato da planilha RAR. */
export function quarterLabel(ms) {
  const w = wall(ms);
  return `${Math.floor(w.getUTCMonth() / 3) + 1}T${String(w.getUTCFullYear()).slice(2)}`;
}

const p2 = (n) => String(n).padStart(2, '0');
/** "19/10/2026" (Brasília). */
export function brDate(ms) {
  const w = wall(ms);
  return `${p2(w.getUTCDate())}/${p2(w.getUTCMonth() + 1)}/${w.getUTCFullYear()}`;
}
export const brDateFromIso = (yyyyMmDd) => yyyyMmDd.split('-').reverse().join('/');
/** "2026-10-21T13:00:00" — hora local de Brasília, sem fuso (formato da Google Agenda). */
export const localIso = (ms) => wall(ms).toISOString().slice(0, 19);
/** "qua 21/10 13h–15h". */
export function blockLabel(b) {
  const w = wall(b.start);
  const h = (ms) => {
    const x = wall(ms);
    return `${x.getUTCHours()}h${x.getUTCMinutes() ? p2(x.getUTCMinutes()) : ''}`;
  };
  return `${['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][w.getUTCDay()]} ${p2(w.getUTCDate())}/${p2(w.getUTCMonth() + 1)} ${h(b.start)}–${h(b.end)}`;
}

/** Nome a partir do e-mail ("larissa.andrade@…" → "Larissa Andrade"). */
export function nameFromEmail(email) {
  return String(email ?? '')
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

/* ----------------------------------------------------------- validação */

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export function newTicketId(rand = Math.random) {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return `DS-${s}`;
}

export const DESCRIPTION_MIN = 50;

const clean = (v, max) =>
  String(v ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, max);

function cleanUrl(raw) {
  const s = clean(raw, 500);
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Normaliza e valida uma solicitação. Devolve `{ ok, errors, ticket }`;
 * `errors` é um mapa campo → mensagem para mostrar junto do campo.
 * Obrigatórios: frente, título, descrição (50+ caracteres), tipo de peça,
 * formato, prioridade, entrega (dentro do prazo mínimo) e solicitante.
 */
export function validateTicket(input, { now = Date.now(), domain = 'gove.digital', id, schedule } = {}) {
  const s = sched(schedule);
  const errors = {};
  const type = typeById(input?.type);
  if (!type) errors.type = 'Escolha a frente da demanda.';
  const title = clean(input?.title, 120);
  if (title.length < 4) errors.title = 'Dê um título à demanda.';
  const description = clean(input?.description, 2000);
  if (description.length < DESCRIPTION_MIN) errors.description = `Descreva com pelo menos ${DESCRIPTION_MIN} caracteres (faltam ${DESCRIPTION_MIN - description.length}): objetivo, público e onde será usado.`;
  const pieceType = clean(input?.pieceType, 80);
  if (pieceType.length < 2) errors.pieceType = 'Informe o tipo de peça.';
  const format = clean(input?.format, 80);
  if (format.length < 2) errors.format = 'Informe o formato (ex.: A4, 16:9, story, post).';
  const requesterEmail = clean(input?.requesterEmail, 120).toLowerCase();
  if (!new RegExp(`^[^\\s@]+@${domain.replace(/\./g, '\\.')}$`).test(requesterEmail)) errors.requesterEmail = `Entre com seu e-mail @${domain}.`;
  const requesterName = clean(input?.requesterName, 80) || nameFromEmail(requesterEmail);

  const rawLinks = Array.isArray(input?.links) ? input.links : String(input?.links ?? '').split(/[\s,]+/);
  const links = [];
  let badLink = false;
  for (const l of rawLinks.slice(0, 10)) {
    if (!String(l ?? '').trim()) continue;
    const u = cleanUrl(l);
    if (u) links.push(u);
    else badLink = true;
  }
  if (badLink) errors.links = 'Confira os links (um por linha, começando com https://).';
  else if (type?.linkRequired && !links.length) errors.links = 'Envie o link dos itens para consulta das especificações.';

  const details = {};
  for (const f of type?.fields ?? []) {
    const v = clean(input?.details?.[f.id], 200);
    if (v) details[f.id] = v;
  }

  const priority = TICKET_PRIORITIES.some((p) => p.id === input?.priority) ? input.priority : null;
  if (!priority) errors.priority = 'Escolha a prioridade.';
  const lead = leadHours(type?.id, priority ?? 'normal');
  const dueDate = clean(input?.dueDate, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(Date.parse(dueDate))) errors.dueDate = 'Escolha a data de entrega.';
  else if (!isBusinessDate(dueDate, s)) errors.dueDate = 'Escolha um dia de expediente (fora de fins de semana e feriados).';
  else if (type && priority && businessHoursBetween(now, dueInstant(dueDate, s), s) < lead) {
    errors.dueDate = `Prazo mínimo: ${lead} h úteis. Primeira data possível: ${brDateFromIso(earliestDueDate(now, lead, s))}.`;
  }

  const ok = Object.keys(errors).length === 0;
  const ticket = ok
    ? {
        id: id ?? newTicketId(),
        type: type.id,
        typeLabel: type.label,
        title,
        description,
        pieceType,
        format,
        links,
        details,
        priority,
        dueDate,
        dueTime: dueTime(s),
        schedule: { days: [...s.days], periods: s.periods.map((p) => [...p]) },
        leadHours: lead,
        effortHours: effortHours(type.id),
        businessHours: Math.floor(businessHoursBetween(now, dueInstant(dueDate, s), s)),
        requesterName,
        requesterEmail,
        createdAt: new Date(now).toISOString(),
      }
    : null;
  return { ok, errors, ticket };
}

/* --------------------------------------------------------------- saídas */

/** Hora de entrega do pedido ("17:00"); pedidos anteriores ao expediente configurável entregavam às 18:00. */
const ticketDueTime = (t) => (/^\d{2}:\d{2}$/.test(t?.dueTime ?? '') ? t.dueTime : '18:00');
const hourLabel = (hm) => (hm.endsWith(':00') ? `${Number(hm.slice(0, 2))}h` : hm.replace(':', 'h'));
const detailLines = (t) => (typeById(t.type)?.fields ?? []).filter((f) => t.details?.[f.id]).map((f) => `${f.label}: ${t.details[f.id]}`);
const priorityLabel = (t) => TICKET_PRIORITIES.find((p) => p.id === t.priority)?.label ?? t.priority;

/** Linha da aba "Novo RAR", por nome de coluna (a planilha é lida pelo cabeçalho). */
export function rarRow(t, blocks = []) {
  const created = Date.parse(t.createdAt);
  return {
    Trimestre: quarterLabel(created),
    Data: brDate(created),
    Meta: '',
    Frente: t.typeLabel,
    'Atividades previstas': `[${t.id}] ${t.title} — ${t.pieceType} (${t.format})`,
    Prioridade: t.priority === 'alta',
    Status: 'Não iniciado',
    'Resultado / Comentários': [
      `Entrega: ${brDateFromIso(t.dueDate)} · ${priorityLabel(t)} (mín. ${t.leadHours} h úteis)`,
      `Produção: ${t.effortHours} h${blocks.length ? ` — ${blocks.map(blockLabel).join('; ')}` : ''}`,
      t.description,
      ...detailLines(t),
      ...t.links,
    ].join('\n'),
    'Destaque positivo': false,
    'Destaque negativo': false,
    'Atividades no radar': '',
    'Algo que precisa de ajuda?': '',
    'Comentários gerais': `Solicitado por ${t.requesterName} (${t.requesterEmail}) pelo Gove Design System`,
  };
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const b64 = (s) => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, 'utf8').toString('base64'));

/** Marcador lido pelo Apps Script para lançar o RAR e a produção a partir do e-mail. */
export const TICKET_MARKER = 'gove-ticket:';

/** Evento de produção na agenda do design (hora local de Brasília). */
export const workEvent = (t, b, i, n) => ({
  summary: `Produção ${i + 1}/${n}: ${t.title} [${t.id}]`,
  description: `${t.typeLabel} · ${t.pieceType} (${t.format})\nSolicitante: ${t.requesterName} (${t.requesterEmail})\nEntrega: ${brDateFromIso(t.dueDate)}, ${hourLabel(ticketDueTime(t))}`,
  startTime: localIso(b.start),
  endTime: localIso(b.end),
  timeZone: TIME_ZONE,
});

/**
 * E-mail de aviso para a área de design, com quem pediu (texto e HTML). Leva
 * um marcador com o pedido, a linha do RAR e os blocos de produção para o Apps
 * Script; `calendar` diz se o evento de entrega já foi criado por quem enviou.
 */
export function ticketEmail(t, { calendar = true, blocks = [] } = {}) {
  const payload = { ticket: t, row: rarRow(t, blocks), calendar, work: blocks.map((b, i) => workEvent(t, b, i, blocks.length)) };
  const marker = `${TICKET_MARKER}${b64(JSON.stringify(payload))}.`; // o ponto fecha o marcador
  const due = brDateFromIso(t.dueDate);
  const subject = `[Design] ${t.typeLabel} · ${t.title} · entrega ${due} (${t.id})`;
  const rows = [
    ['Solicitante', `${t.requesterName} · ${t.requesterEmail}`],
    ['Frente', t.typeLabel],
    ['Tipo de peça', t.pieceType],
    ['Formato', t.format],
    ['Prioridade', `${priorityLabel(t)} (mín. ${t.leadHours} h úteis)`],
    ['Entrega', `${due}, até ${hourLabel(ticketDueTime(t))}`],
    ['Produção', `${t.effortHours} h${blocks.length ? `: ${blocks.map(blockLabel).join('; ')}` : ''}`],
    ...detailLines(t).map((l) => l.split(': ')),
  ];
  const text = [`Nova solicitação para a área de design — ${t.id}`, '', t.title, '', ...rows.map(([k, v]) => `${k}: ${v}`), '', t.description, '', ...(t.links.length ? ['Links:', ...t.links, ''] : []), marker].join('\n');
  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#20133D;max-width:560px">
<p style="margin:0 0 4px;font-size:13px;color:#5B6770">Nova solicitação · ${esc(t.id)}</p>
<h2 style="margin:0 0 16px;font-family:Montserrat,Arial,sans-serif;font-size:22px;color:#3D0099">${esc(t.title)}</h2>
<table style="border-collapse:collapse;font-size:14px">${rows.map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#5B6770;vertical-align:top">${esc(k)}</td><td style="padding:4px 0">${esc(v)}</td></tr>`).join('')}</table>
<p style="font-size:15px;line-height:1.5;white-space:pre-wrap">${esc(t.description)}</p>
${t.links.length ? `<p style="font-size:14px">${t.links.map((l) => `<a href="${esc(l)}" style="color:#3D0099">${esc(l)}</a>`).join('<br>')}</p>` : ''}
<p style="font-size:1px;line-height:1px;color:#FFFFFF">${marker}</p></div>`;
  return { subject, text, html };
}

/** Evento de entrega no dia do prazo (última hora do expediente, Brasília), com lembretes. */
export function ticketEvent(t) {
  const end = toMinutes(ticketDueTime(t));
  const lines = [`${t.typeLabel} · ${t.pieceType} (${t.format}) · ${t.id}`, `Solicitante: ${t.requesterName} (${t.requesterEmail})`, `Prioridade: ${priorityLabel(t)}`, '', t.description, ...detailLines(t), ...t.links];
  return {
    summary: `Entrega design: ${t.title} (${t.id})`,
    description: lines.join('\n'),
    startTime: `${t.dueDate}T${hhmm(end - 60)}:00`,
    endTime: `${t.dueDate}T${hhmm(end)}:00`,
    timeZone: TIME_ZONE,
    reminders: [
      { method: 'popup', minutes: 24 * 60 },
      { method: 'email', minutes: 24 * 60 },
      { method: 'popup', minutes: 60 },
    ],
  };
}

/** Arquivo .ics do evento de entrega (para quem não tem a agenda conectada). */
export function ticketIcs(t) {
  const ev = ticketEvent(t);
  const start = fromWall(Date.parse(`${t.dueDate}T00:00:00Z`) + toMinutes(ticketDueTime(t)) * 60e3) - HOUR;
  const fmt = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const icsText = (s) => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gove Digital//Design System//PT-BR',
    'BEGIN:VEVENT',
    `UID:${t.id}@gove.digital`,
    `DTSTAMP:${fmt(Date.parse(t.createdAt))}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(start + HOUR)}`,
    `SUMMARY:${icsText(ev.summary)}`,
    `DESCRIPTION:${icsText(ev.description)}`,
    `ORGANIZER:mailto:${DESIGN_INBOX}`,
    `ATTENDEE;CN=${icsText(t.requesterName)}:mailto:${t.requesterEmail}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsText(ev.summary)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
