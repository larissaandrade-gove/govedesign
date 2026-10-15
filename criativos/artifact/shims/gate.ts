/**
 * Substitui `src/lib/gate.functions.ts` no build do artefato: o Design System
 * já controla quem abre a página, então não há login dentro do app.
 */
export const getGateStatus = async () => ({ unlocked: true as const });
export const signIn = async (_?: unknown) => ({ ok: true as const });
export const signOut = async () => ({ ok: true as const });
