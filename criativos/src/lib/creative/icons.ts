/** Repositório de ícones (stroke, viewBox 24x24) usado tanto no canvas quanto na UI. */

export type IconDef = {
  key: string;
  label: string;
  theme: "urgência" | "gestão" | "dados" | "relacionamento" | "ação";
  paths: string[];
};

export const ICONS: IconDef[] = [
  {
    key: "clock",
    label: "Relógio",
    theme: "urgência",
    paths: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20", "M12 6v6l4 2"],
  },
  {
    key: "calendar",
    label: "Calendário",
    theme: "urgência",
    paths: [
      "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
      "M8 2v4M16 2v4M3 10h18",
    ],
  },
  {
    key: "alert",
    label: "Alerta",
    theme: "urgência",
    paths: ["M12 2 2 21h20L12 2z", "M12 9v5", "M12 17.5h.01"],
  },
  {
    key: "zap",
    label: "Raio",
    theme: "urgência",
    paths: ["M13 2 3 14h8l-1 8 10-12h-8l1-8z"],
  },
  {
    key: "building",
    label: "Prefeitura",
    theme: "gestão",
    paths: ["M4 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18", "M16 8h2a2 2 0 0 1 2 2v12", "M8 6h2M8 10h2M8 14h2M2 22h20"],
  },
  {
    key: "shield",
    label: "Escudo",
    theme: "gestão",
    paths: ["M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-4z"],
  },
  {
    key: "clipboard",
    label: "Processos",
    theme: "gestão",
    paths: [
      "M9 3h6v3H9z",
      "M15 4.5h2A2 2 0 0 1 19 6.5V20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2h2",
      "m9 14 2 2 4-4",
    ],
  },
  {
    key: "chart",
    label: "Indicadores",
    theme: "dados",
    paths: ["M4 20V10M10 20V4M16 20v-8", "M2 22h20"],
  },
  {
    key: "trending",
    label: "Crescimento",
    theme: "dados",
    paths: ["M3 17l6-6 4 4 8-8", "M21 7h-6M21 7v6"],
  },
  {
    key: "file",
    label: "Relatório",
    theme: "dados",
    paths: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M8 13h8M8 17h6"],
  },
  {
    key: "users",
    label: "Cidadãos",
    theme: "relacionamento",
    paths: [
      "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",
      "M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
      "M22 21v-2a4 4 0 0 0-3-3.87",
    ],
  },
  {
    key: "message",
    label: "Atendimento",
    theme: "relacionamento",
    paths: ["M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"],
  },
  {
    key: "pin",
    label: "Território",
    theme: "relacionamento",
    paths: ["M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z", "M12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4"],
  },
  {
    key: "check",
    label: "Confirmação",
    theme: "ação",
    paths: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20", "m8 12 3 3 6-6"],
  },
  {
    key: "arrow",
    label: "Seta",
    theme: "ação",
    paths: ["M5 12h14", "M13 6l6 6-6 6"],
  },
  {
    key: "download",
    label: "Download",
    theme: "ação",
    paths: ["M12 3v12", "M7 11l5 5 5-5", "M5 21h14"],
  },
];

export const ICON_MAP: Record<string, IconDef> = Object.fromEntries(
  ICONS.map((i) => [i.key, i]),
);

/** Desenha um ícone do repositório no canvas, centralizado em (cx, cy). */
export function drawIconPath(
  ctx: CanvasRenderingContext2D,
  key: string,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  const def = ICON_MAP[key];
  if (!def) return;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.fillStyle = "transparent";
  for (const d of def.paths) ctx.stroke(new Path2D(d));
  ctx.restore();
}
