function toRgb(hex: string): [number, number, number] | null {
  const value = hex.trim().replace("#", "");
  if (![3, 6].includes(value.length) || /[^0-9a-f]/i.test(value)) return null;
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function luminance(rgb: [number, number, number]) {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

export function contrastRatio(foreground: string, background: string): number | null {
  const fg = toRgb(foreground);
  const bg = toRgb(background);
  if (!fg || !bg) return null;
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

/** WCAG AA: 4.5:1 texto normal, 3:1 texto grande (>=24px ou >=18.66px bold). */
export function checkContrast(
  foreground: string,
  background: string,
  fontSize: number,
  bold: boolean,
) {
  const ratio = contrastRatio(foreground, background);
  if (ratio === null) return { ratio: null, required: 4.5, pass: true };
  const large = fontSize >= 24 || (bold && fontSize >= 18.66);
  const required = large ? 3 : 4.5;
  return { ratio, required, pass: ratio >= required };
}