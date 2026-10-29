/**
 * "Adicionar à agenda": link de modelo de evento do Google Agenda, sem JS.
 *
 *   https://calendar.google.com/calendar/render?action=TEMPLATE&text=…
 *     &dates=AAAAMMDDTHHMMSS/AAAAMMDDTHHMMSS&ctz=America/Sao_Paulo&details=…&location=…
 *
 * As datas vão no horário local do fuso escolhido (sem "Z"); o Google Agenda
 * converte para o fuso de quem abre o link.
 */
import type { CalendarEvent } from "./types";

export const DEFAULT_TZ = "America/Sao_Paulo";

/** Fusos do Brasil (e UTC) para o seletor. */
export const CALENDAR_TIMEZONES: { value: string; label: string }[] = [
  { value: "America/Sao_Paulo", label: "Brasília (America/Sao_Paulo)" },
  { value: "America/Noronha", label: "Fernando de Noronha (America/Noronha)" },
  { value: "America/Manaus", label: "Amazonas (America/Manaus)" },
  { value: "America/Cuiaba", label: "Mato Grosso (America/Cuiaba)" },
  { value: "America/Porto_Velho", label: "Rondônia (America/Porto_Velho)" },
  { value: "America/Rio_Branco", label: "Acre (America/Rio_Branco)" },
  { value: "UTC", label: "UTC" },
];

export const CALENDAR_DURATIONS = [30, 45, 60, 90, 120, 180, 240, 480];

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const pad = (n: number) => String(n).padStart(2, "0");

/** Data + hora → minutos desde 1970 (aritmética "ingênua", sem fuso). */
function toMinutes(date: string, time: string): number | null {
  const d = DATE_RE.exec(date);
  const t = TIME_RE.exec(time);
  if (!d || !t) return null;
  const ms = Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2]));
  const check = new Date(ms);
  // 2026-02-31 etc.: data inexistente.
  if (check.getUTCDate() !== Number(d[3]) || check.getUTCMonth() !== Number(d[2]) - 1) return null;
  return ms / 60000;
}

/** Minutos → AAAAMMDDTHHMMSS. */
function stamp(minutes: number): string {
  const d = new Date(minutes * 60000);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`;
}

/** Início e fim (minutos) do evento, ou null se faltar algo. */
export function eventRange(ev: CalendarEvent): { start: number; end: number } | null {
  const start = toMinutes(ev.date, ev.start);
  if (start === null) return null;
  if (ev.duration !== undefined) return ev.duration > 0 ? { start, end: start + ev.duration } : null;
  const end = toMinutes(ev.date, ev.end ?? "");
  return end === null ? null : { start, end };
}

/** Problemas do evento (vazio = link válido). Textos do painel e da auditoria. */
export function calendarIssues(ev: CalendarEvent | undefined): string[] {
  if (!ev) return ["preencha os dados do evento."];
  const out: string[] = [];
  if (!ev.title.trim()) out.push("informe o título do evento.");
  if (!DATE_RE.test(ev.date) || toMinutes(ev.date, "00:00") === null) out.push("informe uma data válida.");
  if (!TIME_RE.test(ev.start)) out.push("informe o horário de início (HH:MM).");
  if (ev.duration !== undefined) {
    if (!(ev.duration > 0)) out.push("a duração precisa ser maior que zero.");
  } else if (!TIME_RE.test(ev.end ?? "")) out.push("informe o horário de término (HH:MM).");
  else if (TIME_RE.test(ev.start) && (ev.end ?? "") <= ev.start)
    out.push("o término precisa ser depois do início (para passar da meia-noite, use a duração).");
  return out;
}

/** Link "Adicionar ao Google Agenda" (parâmetros codificados; "#" se o evento estiver incompleto). */
export function googleCalendarUrl(ev: CalendarEvent | undefined): string {
  if (!ev || calendarIssues(ev).length) return "#";
  const range = eventRange(ev)!;
  const enc = encodeURIComponent;
  const params = [
    "action=TEMPLATE",
    `text=${enc(ev.title.trim())}`,
    `dates=${stamp(range.start)}/${stamp(range.end)}`,
    // A barra do fuso fica legível (o Google aceita as duas formas).
    `ctz=${enc(ev.tz || DEFAULT_TZ).replace(/%2F/g, "/")}`,
  ];
  if (ev.details.trim()) params.push(`details=${enc(ev.details.trim())}`);
  if (ev.location.trim()) params.push(`location=${enc(ev.location.trim())}`);
  return `https://calendar.google.com/calendar/render?${params.join("&")}`;
}

/** Evento-modelo: daqui a 30 dias, 19h, 1h30. */
export function defaultEvent(now = new Date()): CalendarEvent {
  const d = new Date(now.getTime() + 30 * 86400000);
  return {
    title: "Webinar GOVE",
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    start: "19:00",
    duration: 90,
    details: "Inscrição confirmada. Até lá!",
    location: "",
    tz: DEFAULT_TZ,
  };
}
