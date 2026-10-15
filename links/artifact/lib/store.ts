/**
 * Tabelas `short_links` e `link_clicks` do Gove Links como coleções do
 * artifact-runtime. Dentro do artefato (capacidade `db`) os dados são
 * compartilhados entre quem abre o artefato; fora dele ficam no localStorage.
 */
import { collection, newId, type Doc } from "@gove/runtime";

import { parseUserAgent } from "../../src/lib/click-tracking.server";

export const APP = "links";

export type ShortLinkDoc = Doc & {
  slug: string;
  original_url: string;
  final_url: string;
  internal_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LinkClickDoc = Doc & {
  short_link_id: string;
  clicked_at: string;
  referer: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  operating_system: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  /** Origem do registro: no artefato, sempre um teste manual. */
  source: "teste-artefato";
};

export const linksCol = collection<ShortLinkDoc>(APP, "short_links");
export const clicksCol = collection<LinkClickDoc>(APP, "link_clicks");

/** Espera a primeira leitura definitiva das duas coleções. */
export function ready(): Promise<void> {
  return Promise.all([linksCol.ready, clicksCol.ready]).then(() => undefined);
}

export function storageMode(): "db" | "local" | "pending" {
  const a = linksCol.mode();
  const b = clicksCol.mode();
  if (a === "pending" || b === "pending") return "pending";
  return a === "db" && b === "db" ? "db" : "local";
}

export { newId };

/** Resumo do navegador para o registro de clique (sem IP nem dados pessoais). */
export function userAgentSummary() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : null;
  const parsed = parseUserAgent(ua);
  const summary = [parsed.browser, parsed.operating_system, parsed.device_type]
    .filter(Boolean)
    .join(" · ");
  return { ...parsed, user_agent: summary || null };
}
