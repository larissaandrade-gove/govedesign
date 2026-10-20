export type ClaudeLike = { use: (name: string) => Promise<any> };

/**
 * Runtime do claude.ai: na própria janela ou, quando o Design System roda
 * dentro da moldura do app mobile (iframe da mesma origem), na janela de cima.
 */
export function findClaude(): ClaudeLike | null {
  const pick = (w: Window | null): ClaudeLike | null => {
    try {
      const c = (w as unknown as { claude?: ClaudeLike } | null)?.claude;
      return c && typeof c.use === 'function' ? c : null;
    } catch {
      return null; // outra origem
    }
  };
  return pick(window) ?? (window.parent !== window ? pick(window.parent) : null) ?? (window.top !== window ? pick(window.top) : null);
}
