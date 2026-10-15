/**
 * Ações exclusivas do build do artefato: edição/exclusão (que no app publicado
 * usam o Supabase diretamente), "Testar link" (substitui o redirecionamento
 * público /:slug) e exportações via saveFile().
 */
import { openExternal, saveFile, type SaveOutcome } from "@gove/runtime";

import { buildShortUrl } from "./short-domain";
import { buildFinalUrl } from "./short-links";
import { clicksCol, linksCol, newId, userAgentSummary, type LinkClickDoc } from "./store";
import type { ClickStat, ShortLinkRow } from "./links-queries";

export async function updateLink(
  id: string,
  patch: { original_url?: string; internal_name?: string | null; is_active?: boolean },
) {
  const current = linksCol.get(id);
  if (!current) throw new Error("Link não encontrado.");
  const next = { ...current, updated_at: new Date().toISOString() };
  if (patch.original_url !== undefined) {
    next.original_url = patch.original_url;
    next.final_url = buildFinalUrl(patch.original_url);
  }
  if (patch.internal_name !== undefined) next.internal_name = patch.internal_name;
  if (patch.is_active !== undefined) next.is_active = patch.is_active;
  await linksCol.set(next);
}

/** Exclui o link e o histórico de cliques (como o ON DELETE CASCADE do banco). */
export async function deleteLink(id: string) {
  const clicks = clicksCol.all().filter((c) => c.short_link_id === id);
  await linksCol.remove(id);
  await Promise.all(clicks.map((c) => clicksCol.remove(c.id)));
}

/**
 * Abre o destino uma única vez. `openExternal()` do runtime chama
 * `window.open(..., 'noopener')`, que sempre devolve null, e então também
 * clica num <a> — abrindo duas abas. Aqui abrimos sem 'noopener', cortamos
 * o `opener` à mão e só recorremos ao openExternal() se o popup for bloqueado.
 */
function openDestination(url: string) {
  try {
    const w = window.open(url, "_blank");
    if (w) {
      try {
        w.opener = null;
      } catch {
        /* outra origem */
      }
      return;
    }
  } catch {
    /* bloqueado: usa o runtime */
  }
  openExternal(url);
}

export type TestResult = "opened" | "inactive" | "missing";

/**
 * Simula o acesso ao link curto: registra um clique de teste (referer
 * "artefato") e abre o destino em nova aba. Link inativo não registra clique,
 * como no servidor (que responde 410).
 */
export async function testLink(id: string): Promise<TestResult> {
  const link = linksCol.get(id);
  if (!link) return "missing";
  if (link.is_active === false) return "inactive";
  const ua = userAgentSummary();
  const click: LinkClickDoc = {
    id: newId("c-"),
    short_link_id: id,
    clicked_at: new Date().toISOString(),
    referer: "artefato",
    user_agent: ua.user_agent,
    device_type: ua.device_type,
    browser: ua.browser,
    operating_system: ua.operating_system,
    country: null,
    region: null,
    city: null,
    source: "teste-artefato",
  };
  openDestination(link.final_url);
  await clicksCol.set(click);
  return "opened";
}

/* ----------------------------------------------------------------- export */

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV com separador ";" e BOM, para abrir direto no Excel em pt-BR. */
function toCsv(header: string[], rows: unknown[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n") + "\r\n";
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

export function exportLinksCsv(rows: ShortLinkRow[], stats: Map<string, ClickStat> | undefined) {
  const csv = toCsv(
    ["slug", "link_curto", "nome", "url_original", "url_final", "status", "cliques", "ultimo_clique", "criado_em"],
    rows.map((r) => [
      r.slug,
      buildShortUrl(r.slug),
      r.internal_name ?? "",
      r.original_url,
      r.final_url,
      r.is_active ? "ativo" : "inativo",
      stats?.get(r.id)?.count ?? 0,
      stats?.get(r.id)?.lastClickAt ?? "",
      r.created_at,
    ]),
  );
  return saveFile(`gove-links-${stamp()}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

export function exportClicksCsv(slug: string, clicks: LinkClickDoc[]) {
  const csv = toCsv(
    ["clicado_em", "origem", "referer", "navegador", "sistema", "dispositivo"],
    clicks.map((c) => [c.clicked_at, c.source, c.referer, c.browser, c.operating_system, c.device_type]),
  );
  return saveFile(`gove-links-${slug}-cliques-${stamp()}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

export function saveOutcomeMessage(outcome: SaveOutcome): string | null {
  if (outcome === "saved") return null;
  if (outcome === "declined") return "Download cancelado.";
  return "Não foi possível baixar o arquivo aqui (downloads indisponíveis neste artefato).";
}
