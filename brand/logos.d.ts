export declare const LOGO_MIN_CONTRAST: number;
export declare const LOGO_COLORS: { roxo: string; amarelo: string; branco: string };
export type LogoKind = 'simbolo' | 'logotipo';
export declare const LOGOS: Record<LogoKind, { aspect: number; variants: { id: string; file: string; colors: string[] }[] }>;
export declare function contrast(a: string, b: string): number;
export declare function pickLogo(background: string, kind?: LogoKind, opts?: { preferColor?: boolean }): { kind: LogoKind; variant: string; file: string; aspect: number; minContrast: number; ok: boolean };
export declare function kindForBox(w: number, h: number): LogoKind;
