export type HandoffFile = { name: string; bytes: Uint8Array };
export type Handoff = { from?: string; files: HandoffFile[]; at: number };
export function putHandoff(to: string, payload: { from?: string; files: HandoffFile[] }): Promise<unknown>;
export function takeHandoff(to?: string): Promise<Handoff | null>;
