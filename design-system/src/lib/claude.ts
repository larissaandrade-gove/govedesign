export type ClaudeLike = { use: (name: string) => Promise<any> };

/**
 * Instâncias do runtime do claude.ai ao alcance, sem repetir: a da própria janela
 * e, quando o Design System roda dentro da moldura do app mobile (iframe da mesma
 * origem), a da janela pai e a de cima.
 */
export function claudeCandidates(): { claude: ClaudeLike; win: Window }[] {
  const out: { claude: ClaudeLike; win: Window }[] = [];
  const add = (w: Window | null) => {
    try {
      if (!w || out.some((c) => c.win === w)) return;
      const c = (w as unknown as { claude?: ClaudeLike }).claude;
      if (c && typeof c.use === 'function' && !out.some((o) => o.claude === c)) out.push({ claude: c, win: w });
    } catch {
      /* outra origem */
    }
  };
  add(window);
  add(window.parent);
  add(window.top);
  return out;
}

/** Runtime do claude.ai (o primeiro ao alcance). */
export function findClaude(): ClaudeLike | null {
  return claudeCandidates()[0]?.claude ?? null;
}
