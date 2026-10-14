/**
 * Armazenamento 100% local (navegador do usuário).
 * Nenhum dado sai do dispositivo: nada de backend, cloud ou apps de terceiros.
 * Persistência: localStorage do próprio navegador.
 */
import type { PageContent } from "@/lib/gove/types";

const STORAGE_KEY = "gove-lp-builder:v1";

export type StoredPage = {
  id: string;
  nome: string;
  conteudo: PageContent;
  criado_em: string;
  atualizado_em: string;
};

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAll(): StoredPage[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredPage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(pages: StoredPage[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
}

export function newId(): string {
  if (isBrowser() && "randomUUID" in crypto) return crypto.randomUUID();
  return `lp-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export function listPages(): StoredPage[] {
  return readAll().sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em));
}

export function getPage(id: string): StoredPage | null {
  return readAll().find((page) => page.id === id) ?? null;
}

export function createPage(nome: string, conteudo: PageContent): StoredPage {
  const now = new Date().toISOString();
  const page: StoredPage = { id: newId(), nome, conteudo, criado_em: now, atualizado_em: now };
  writeAll([page, ...readAll()]);
  return page;
}

export function savePage(id: string, patch: { nome?: string; conteudo?: PageContent }): void {
  const pages = readAll();
  const index = pages.findIndex((page) => page.id === id);
  const current = pages[index];
  if (!current) return;
  pages[index] = { ...current, ...patch, atualizado_em: new Date().toISOString() };
  writeAll(pages);
}

export function deletePage(id: string): void {
  writeAll(readAll().filter((page) => page.id !== id));
}
