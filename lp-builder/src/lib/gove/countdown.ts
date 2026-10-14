import type { CountdownBlock, CountdownMode } from "./types";

export const COUNTDOWN_MODES: { value: CountdownMode; label: string }[] = [
  { value: "d", label: "Dias" },
  { value: "dh", label: "Dias e horas" },
  { value: "dhm", label: "Dias, horas e minutos" },
  { value: "dhms", label: "Dias, horas, minutos e segundos" },
  { value: "m", label: "Minutos" },
];

export interface CountdownUnit {
  key: string;
  value: number;
  label: string;
}

export function countdownUnits(mode: CountdownMode, msLeft: number): CountdownUnit[] {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const unit = (key: string, value: number, one: string, many: string): CountdownUnit => ({
    key,
    value,
    label: value === 1 ? one : many,
  });

  switch (mode) {
    case "d":
      return [unit("d", days, "Dia", "Dias")];
    case "dh":
      return [unit("d", days, "Dia", "Dias"), unit("h", hours, "Hora", "Horas")];
    case "dhm":
      return [
        unit("d", days, "Dia", "Dias"),
        unit("h", hours, "Hora", "Horas"),
        unit("m", minutes, "Min", "Min"),
      ];
    case "m":
      return [unit("m", Math.floor(total / 60), "Minuto", "Minutos")];
    default:
      return [
        unit("d", days, "Dia", "Dias"),
        unit("h", hours, "Hora", "Horas"),
        unit("m", minutes, "Min", "Min"),
        unit("s", seconds, "Seg", "Seg"),
      ];
  }
}

export const pad = (n: number) => String(n).padStart(2, "0");

export function countdownMsLeft(leaf: CountdownBlock, now = Date.now()) {
  const target = new Date(leaf.target).getTime();
  return Number.isNaN(target) ? 0 : target - now;
}
