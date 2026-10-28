/** Cor em HEX de 6 dígitos, minúsculo: "#3d0099". */
export type Hex = string;
/** Espaços em que a mistura e os gradientes interpolam. */
export type Space = 'rgb' | 'hsl' | 'oklch';
export type HarmonyKind = 'complementar' | 'analoga' | 'triade' | 'tetradica' | 'monocromatica';
export type Shade = { step: number; hex: Hex };
export type ThemeTokens = { primary: Hex; onPrimary: Hex; surface: Hex; text: Hex; muted: Hex; border: Hex };
export type Theme = { light: ThemeTokens; dark: ThemeTokens };
export type Deficiency = 'protanopia' | 'deuteranopia' | 'tritanopia' | 'acromatopsia';
export type GradientKind = 'linear' | 'radial' | 'conico' | 'mesh';
export type GradientStop = { hex: Hex; at: number };
export type GradientSpec = { kind: Exclude<GradientKind, 'mesh'>; angle: number; stops: GradientStop[]; space: Space };
/** Ponto do mesh: posição em % e raio em % da maior dimensão. */
export type MeshPoint = { hex: Hex; x: number; y: number; r: number };
