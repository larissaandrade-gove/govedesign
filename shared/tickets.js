// Solicitações para a área de design (tickets). Fonte única usada pelo
// servidor, pelo Design System e pelo Apps Script da planilha RAR: frentes,
// prazo mínimo em horas úteis, linha da aba "Novo RAR", e-mail e evento de agenda.

/** Horário de trabalho (Brasília, sem horário de verão): 9h–12h e 13h–18h, 8 h por dia. */
export const WORK_PERIODS = [
  [9, 12],
  [13, 18],
];
export const TIME_ZONE = 'America/Sao_Paulo';
const OFFSET_MS = -3 * 3600e3; // UTC−3 o ano inteiro desde 2019
const HOUR = 3600e3;
const DAY = 24 * HOUR;
/** Hora de entrega no dia do prazo. */
export const DUE_HOUR = 18;

/** Caixa da área de design que recebe os pedidos (o servidor aceita TICKETS_INBOX). */
export const DESIGN_INBOX = 'mkt@gove.digital';
/** Planilha RAR (aba "Novo RAR") onde cada pedido vira uma linha. */
export const RAR_URL = 'https://docs.google.com/spreadsheets/d/1gtVN6m1Z0aPyNTVuLNJptKn8_TGrjN2yYymwy2c6QOY/edit';

export const TICKET_TYPES = [
  {
    id: 'redesign',
    label: 'Redesign',
    summary: 'Revisão de diagramação e cores de peças',
    minHours: 10,
    linkLabel: 'Link da peça atual',
    linkRequired: false,
    fields: [{ id: 'pecas', label: 'Peças e formatos', placeholder: 'Ex.: post 1:1, banner 16:9' }],
  },
  {
    id: 'video',
    label: 'Edição de vídeo',
    summary: 'Corte e edição de vídeos de eventos da empresa',
    minHours: 10,
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
    minHours: 10,
    linkLabel: 'Especificação da gráfica ou referência',
    linkRequired: false,
    fields: [
      { id: 'formato', label: 'Formato e acabamento', placeholder: 'Ex.: 21×21 cm, laminação fosca' },
      { id: 'tiragem', label: 'Tiragem', placeholder: 'Ex.: 500 unidades' },
    ],
  },
  {
    id: 'brindes',
    label: 'Brindes e outros materiais',
    summary: 'Garrafas, mochilas, itens tech e outros materiais além do papel',
    minHours: 10,
    linkLabel: 'Link dos itens (especificações)',
    linkRequired: true,
    fields: [
      { id: 'quantidade', label: 'Quantidade', placeholder: 'Ex.: 200' },
      { id: 'fornecedor', label: 'Fornecedor', placeholder: 'Opcional' },
    ],
  },
];

export const TICKET_PRIORITIES = [
  { id: 'normal', label: 'Normal' },
  { id: 'alta', label: 'Alta' },
];

export const typeById = (id) => TICKET_TYPES.find((t) => t.id === id);

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
function isBusinessDayWall(dayWall) {
  const d = new Date(dayWall);
  const wd = d.getUTCDay();
  return wd !== 0 && wd !== 6 && !holidays(d.getUTCFullYear()).has(iso(d));
}

export const isBusinessDate = (yyyyMmDd) => isBusinessDayWall(Date.parse(`${yyyyMmDd}T00:00:00Z`));

/** Instante (ms) em que se completam `hours` horas úteis a partir de `startMs`. */
export function addBusinessHours(startMs, hours) {
  let remaining = hours * HOUR;
  let day = dayStartWall(startMs);
  let cursor = startMs + OFFSET_MS;
  for (let guard = 0; guard < 3660; guard++, day += DAY, cursor = day) {
    if (!isBusinessDayWall(day)) continue;
    for (const [a, b] of WORK_PERIODS) {
      const s = Math.max(cursor, day + a * HOUR);
      const e = day + b * HOUR;
      if (s >= e) continue;
      if (remaining <= e - s) return fromWall(s + remaining);
      remaining -= e - s;
    }
  }
  throw new Error('Intervalo de horas úteis grande demais.');
}

/** Horas úteis entre dois instantes (0 se `endMs` vier antes). */
export function businessHoursBetween(startMs, endMs) {
  if (endMs <= startMs) return 0;
  let total = 0;
  const last = endMs + OFFSET_MS;
  for (let day = dayStartWall(startMs); day <= last; day += DAY) {
    if (!isBusinessDayWall(day)) continue;
    for (const [a, b] of WORK_PERIODS) {
      const s = Math.max(startMs + OFFSET_MS, day + a * HOUR);
      const e = Math.min(last, day + b * HOUR);
      if (e > s) total += e - s;
    }
  }
  return total / HOUR;
}

/** Instante de entrega de um prazo AAAA-MM-DD (18h de Brasília). */
export const dueInstant = (yyyyMmDd) => fromWall(Date.parse(`${yyyyMmDd}T00:00:00Z`) + DUE_HOUR * HOUR);

/** Primeira data de entrega possível (AAAA-MM-DD) para a frente, a partir de agora. */
export function earliestDueDate(nowMs, minHours = 10) {
  return iso(wall(addBusinessHours(nowMs, minHours)));
}

/** "4T26" — trimestre no formato da planilha RAR. */
export function quarterLabel(ms) {
  const w = wall(ms);
  return `${Math.floor(w.getUTCMonth() / 3) + 1}T${String(w.getUTCFullYear()).slice(2)}`;
}

/** "19/10/2026" (Brasília). */
export function brDate(ms) {
  const w = wall(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(w.getUTCDate())}/${p(w.getUTCMonth() + 1)}/${w.getUTCFullYear()}`;
}
export const brDateFromIso = (yyyyMmDd) => yyyyMmDd.split('-').reverse().join('/');

/* ----------------------------------------------------------- validação */

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export function newTicketId(rand = Math.random) {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return `DS-${s}`;
}

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
 */
export function validateTicket(input, { now = Date.now(), domain = 'gove.digital', id } = {}) {
  const errors = {};
  const type = typeById(input?.type);
  if (!type) errors.type = 'Escolha a frente da demanda.';
  const title = clean(input?.title, 120);
  if (title.length < 4) errors.title = 'Dê um título curto à demanda.';
  const description = clean(input?.description, 2000);
  if (description.length < 10) errors.description = 'Descreva o que precisa (objetivo, público, onde será usado).';
  const requesterName = clean(input?.requesterName, 80);
  if (!requesterName) errors.requesterName = 'Informe seu nome.';
  const requesterEmail = clean(input?.requesterEmail, 120).toLowerCase();
  if (!new RegExp(`^[^\\s@]+@${domain.replace(/\./g, '\\.')}$`).test(requesterEmail)) errors.requesterEmail = `Use seu e-mail @${domain}.`;

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

  const priority = TICKET_PRIORITIES.some((p) => p.id === input?.priority) ? input.priority : 'normal';
  const minHours = type?.minHours ?? 10;
  const dueDate = clean(input?.dueDate, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(Date.parse(dueDate))) errors.dueDate = 'Escolha a data de entrega.';
  else if (!isBusinessDate(dueDate)) errors.dueDate = 'Escolha um dia útil.';
  else if (businessHoursBetween(now, dueInstant(dueDate)) < minHours) {
    errors.dueDate = `Prazo mínimo: ${minHours} h úteis. Primeira data possível: ${brDateFromIso(earliestDueDate(now, minHours))}.`;
  }

  const ok = Object.keys(errors).length === 0;
  const ticket = ok
    ? {
        id: id ?? newTicketId(),
        type: type.id,
        typeLabel: type.label,
        title,
        description,
        links,
        details,
        priority,
        dueDate,
        minHours,
        businessHours: Math.floor(businessHoursBetween(now, dueInstant(dueDate))),
        requesterName,
        requesterEmail,
        createdAt: new Date(now).toISOString(),
      }
    : null;
  return { ok, errors, ticket };
}

/* --------------------------------------------------------------- saídas */

const detailLines = (t) => (typeById(t.type)?.fields ?? []).filter((f) => t.details?.[f.id]).map((f) => `${f.label}: ${t.details[f.id]}`);

/** Linha da aba "Novo RAR", por nome de coluna (a planilha é lida pelo cabeçalho). */
export function rarRow(t) {
  const created = Date.parse(t.createdAt);
  return {
    Trimestre: quarterLabel(created),
    Data: brDate(created),
    Meta: '',
    Frente: t.typeLabel,
    'Atividades previstas': `[${t.id}] ${t.title}`,
    Prioridade: t.priority === 'alta',
    Status: 'Não iniciado',
    'Resultado / Comentários': [`Prazo: ${brDateFromIso(t.dueDate)} (mín. ${t.minHours} h úteis)`, t.description, ...detailLines(t), ...t.links].join('\n'),
    'Destaque positivo': false,
    'Destaque negativo': false,
    'Atividades no radar': '',
    'Algo que precisa de ajuda?': '',
    'Comentários gerais': `Solicitado por ${t.requesterName} (${t.requesterEmail}) pelo Gove Design System`,
  };
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const b64 = (s) => (typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, 'utf8').toString('base64'));

/** Marcador lido pelo Apps Script para lançar a linha do RAR a partir do e-mail. */
export const TICKET_MARKER = 'gove-ticket:';

/**
 * E-mail de aviso para a área de design (texto e HTML). Leva um marcador com o
 * pedido e a linha do RAR para o Apps Script lançar na planilha; `calendar`
 * diz se o evento de agenda já foi criado por quem enviou.
 */
export function ticketEmail(t, { calendar = true } = {}) {
  const marker = `${TICKET_MARKER}${b64(JSON.stringify({ ticket: t, row: rarRow(t), calendar }))}.`; // o ponto fecha o marcador
  const due = brDateFromIso(t.dueDate);
  const subject = `[Design] ${t.typeLabel} · ${t.title} · entrega ${due} (${t.id})`;
  const rows = [
    ['Frente', t.typeLabel],
    ['Prazo', `${due}, até ${DUE_HOUR}h (${t.businessHours} h úteis; mínimo ${t.minHours} h)`],
    ['Prioridade', t.priority === 'alta' ? 'Alta' : 'Normal'],
    ['Solicitante', `${t.requesterName} · ${t.requesterEmail}`],
    ...detailLines(t).map((l) => l.split(': ')),
  ];
  const text = [
    `Nova solicitação para a área de design — ${t.id}`,
    '',
    t.title,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    t.description,
    '',
    ...(t.links.length ? ['Links:', ...t.links, ''] : []),
    marker,
  ].join('\n');
  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#20133D;max-width:560px">
<p style="margin:0 0 4px;font-size:13px;color:#5B6770">Nova solicitação · ${esc(t.id)}</p>
<h2 style="margin:0 0 16px;font-family:Montserrat,Arial,sans-serif;font-size:22px;color:#3D0099">${esc(t.title)}</h2>
<table style="border-collapse:collapse;font-size:14px">${rows.map(([k, v]) => `<tr><td style="padding:4px 16px 4px 0;color:#5B6770;vertical-align:top">${esc(k)}</td><td style="padding:4px 0">${esc(v)}</td></tr>`).join('')}</table>
<p style="font-size:15px;line-height:1.5;white-space:pre-wrap">${esc(t.description)}</p>
${t.links.length ? `<p style="font-size:14px">${t.links.map((l) => `<a href="${esc(l)}" style="color:#3D0099">${esc(l)}</a>`).join('<br>')}</p>` : ''}
<p style="font-size:1px;line-height:1px;color:#FFFFFF">${marker}</p></div>`;
  return { subject, text, html };
}

/** Evento de agenda no dia do prazo (17h–18h, Brasília), com lembretes. */
export function ticketEvent(t) {
  const lines = [`${t.typeLabel} · ${t.id}`, `Solicitante: ${t.requesterName} (${t.requesterEmail})`, '', t.description, ...detailLines(t), ...t.links];
  return {
    summary: `Entrega design: ${t.title} (${t.id})`,
    description: lines.join('\n'),
    startTime: `${t.dueDate}T${String(DUE_HOUR - 1).padStart(2, '0')}:00:00`,
    endTime: `${t.dueDate}T${String(DUE_HOUR).padStart(2, '0')}:00:00`,
    timeZone: TIME_ZONE,
    reminders: [
      { method: 'popup', minutes: 24 * 60 },
      { method: 'email', minutes: 24 * 60 },
      { method: 'popup', minutes: 60 },
    ],
  };
}

/** Arquivo .ics do evento (para quem não tem a agenda conectada). */
export function ticketIcs(t) {
  const ev = ticketEvent(t);
  const start = dueInstant(t.dueDate) - HOUR;
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
