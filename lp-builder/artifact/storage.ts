/**
 * Substitui src/lib/gove/storage.ts no build do artefato, mantendo a mesma
 * API síncrona. As páginas ficam na coleção `lp/pages` do runtime
 * compartilhado: dentro do artefato usam o db (compartilhado entre quem abre
 * o Design System); fora dele, o localStorage.
 *
 * Páginas acima de ~200 KB não cabem num documento do db: ficam só neste
 * navegador (com aviso).
 */
import { toast } from "sonner";
import { collection, newId as runtimeId, type Doc } from "@gove/runtime";
import type { PageContent } from "@/lib/gove/types";

export type StoredPage = {
  id: string;
  nome: string;
  conteudo: PageContent;
  criado_em: string;
  atualizado_em: string;
};

type PageDoc = StoredPage & Doc;

const MAX_DOC_BYTES = 200 * 1024;
const LOCAL_KEY = "gove-lp-builder:artifact-local";

const shared = collection<PageDoc>("lp", "pages");

/* ----- páginas grandes demais para o db: só neste navegador ----- */
function readLocal(): Map<string, StoredPage> {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    const list = raw ? (JSON.parse(raw) as StoredPage[]) : [];
    return new Map(Array.isArray(list) ? list.map((p) => [p.id, p]) : []);
  } catch {
    return new Map();
  }
}
let local = readLocal();
const localListeners = new Set<() => void>();
function writeLocal() {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify([...local.values()]));
  } catch {
    toast.error("Não foi possível salvar: o armazenamento deste navegador está cheio.");
  }
  localListeners.forEach((fn) => fn());
}

const warned = new Set<string>();
const byteSize = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;

function put(page: StoredPage) {
  if (byteSize(page) > MAX_DOC_BYTES) {
    local.set(page.id, page);
    writeLocal();
    if (!warned.has(page.id)) {
      warned.add(page.id);
      toast.warning(
        "Esta landing page passou de 200 KB e ficou salva só neste navegador — ela não é compartilhada com o time.",
        { duration: 8000 },
      );
    }
    return;
  }
  if (local.delete(page.id)) {
    warned.delete(page.id);
    writeLocal();
  }
  shared.set(page as PageDoc).catch(() => {
    toast.error("Não foi possível sincronizar a landing page. A cópia deste navegador foi mantida.");
  });
}

/* ----- API pública (igual à original) ----- */
export const pagesReady: Promise<void> = shared.ready;
export const storageMode = () => shared.mode();

export function subscribePages(fn: () => void): () => void {
  const off = shared.subscribe(() => fn());
  localListeners.add(fn);
  return () => {
    off();
    localListeners.delete(fn);
  };
}

export function newId(): string {
  return runtimeId();
}

function merged(): StoredPage[] {
  const map = new Map<string, StoredPage>();
  for (const doc of shared.all()) {
    const { id, nome, conteudo, criado_em, atualizado_em } = doc;
    map.set(id, { id, nome, conteudo, criado_em, atualizado_em });
  }
  for (const page of local.values()) {
    const other = map.get(page.id);
    if (!other || other.atualizado_em <= page.atualizado_em) map.set(page.id, page);
  }
  return [...map.values()].filter((p) => p && p.conteudo && typeof p.atualizado_em === "string");
}

export function listPages(): StoredPage[] {
  return merged().sort((a, b) => b.atualizado_em.localeCompare(a.atualizado_em));
}

export function getPage(id: string): StoredPage | null {
  return merged().find((page) => page.id === id) ?? null;
}

export function createPage(nome: string, conteudo: PageContent): StoredPage {
  const now = new Date().toISOString();
  const page: StoredPage = { id: newId(), nome, conteudo, criado_em: now, atualizado_em: now };
  put(page);
  return page;
}

export function savePage(id: string, patch: { nome?: string; conteudo?: PageContent }): void {
  const current = getPage(id);
  if (!current) return;
  put({ ...current, ...patch, atualizado_em: new Date().toISOString() });
}

export function deletePage(id: string): void {
  if (local.delete(id)) writeLocal();
  if (shared.get(id)) {
    shared.remove(id).catch(() => toast.error("Não foi possível excluir a landing page."));
  }
}

// Outra aba/janela alterou as páginas grandes guardadas localmente.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === LOCAL_KEY) {
      local = readLocal();
      localListeners.forEach((fn) => fn());
    }
  });
}
