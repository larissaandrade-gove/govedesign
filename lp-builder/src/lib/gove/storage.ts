/**
 * Armazenamento 100% local (navegador do usuário).
 * Nenhum dado sai do dispositivo: nada de backend, cloud ou apps de terceiros.
 * Persistência: localStorage do próprio navegador (landing pages e modelos).
 */
import type { PageContent } from "@/lib/gove/types";
import {
  cloneDoc,
  seedTemplates,
  type StoredTemplate,
  type TemplatePatch,
} from "@/lib/gove/templates";

export type { StoredTemplate, TemplatePatch } from "@/lib/gove/templates";

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

/* ------------------------------------------------------------- modelos */


const TEMPLATES_KEY = "gove-lp-builder:templates:v1";
/** Marca de que os modelos iniciais já foram criados (não recria se o time excluir todos). */
const TEMPLATES_SEEDED_KEY = "gove-lp-builder:templates-seeded";

const templateListeners = new Set<() => void>();

function readTemplates(): StoredTemplate[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(TEMPLATES_KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredTemplate[]) : [];
    return Array.isArray(parsed) ? parsed.filter((t) => t && t.id && t.doc) : [];
  } catch {
    return [];
  }
}

function writeTemplates(list: StoredTemplate[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list));
  templateListeners.forEach((fn) => fn());
}

function updateTemplate(id: string, fn: (t: StoredTemplate) => StoredTemplate | null): StoredTemplate | null {
  const list = readTemplates();
  const index = list.findIndex((t) => t.id === id);
  const current = list[index];
  if (!current) return null;
  const next = fn(current);
  if (!next) return null;
  list[index] = next;
  writeTemplates(list);
  return next;
}

/** Sem espera no build do servidor (localStorage é síncrono). */
export const templatesReady: Promise<void> = Promise.resolve();

export function subscribeTemplates(fn: () => void): () => void {
  templateListeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === TEMPLATES_KEY) fn();
  };
  if (isBrowser()) window.addEventListener("storage", onStorage);
  return () => {
    templateListeners.delete(fn);
    if (isBrowser()) window.removeEventListener("storage", onStorage);
  };
}

/** Primeira execução: os layouts antigos viram modelos publicados. */
export function ensureSeedTemplates(): void {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(TEMPLATES_SEEDED_KEY)) return;
  window.localStorage.setItem(TEMPLATES_SEEDED_KEY, new Date().toISOString());
  if (readTemplates().length) return;
  writeTemplates(seedTemplates());
}

export function listTemplates(): StoredTemplate[] {
  return readTemplates().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getTemplate(id: string): StoredTemplate | null {
  return readTemplates().find((t) => t.id === id) ?? null;
}

export function createTemplate(input: { name: string; description?: string; doc: PageContent }): StoredTemplate {
  const now = new Date().toISOString();
  const template: StoredTemplate = {
    id: newId(),
    name: input.name,
    status: "rascunho",
    doc: cloneDoc(input.doc),
    createdAt: now,
    updatedAt: now,
  };
  if (input.description) template.description = input.description;
  writeTemplates([template, ...readTemplates()]);
  return template;
}

export function saveTemplate(id: string, patch: TemplatePatch): void {
  updateTemplate(id, (t) => ({ ...t, ...patch, updatedAt: new Date().toISOString() }));
}

/** Publica o rascunho atual: as próximas landing pages copiam este snapshot. */
export function publishTemplate(id: string): boolean {
  const now = new Date().toISOString();
  return !!updateTemplate(id, (t) => ({
    ...t,
    status: "publicado",
    publishedAt: now,
    publishedDoc: cloneDoc(t.doc),
  }));
}

export function unpublishTemplate(id: string): void {
  updateTemplate(id, (t) => {
    const next: StoredTemplate = { ...t, status: "rascunho" };
    delete next.publishedDoc;
    delete next.publishedAt;
    return next;
  });
}

export function deleteTemplate(id: string): void {
  writeTemplates(readTemplates().filter((t) => t.id !== id));
}
