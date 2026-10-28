/**
 * Substitui src/lib/gove/storage.ts no build do artefato, mantendo a mesma
 * API síncrona. As páginas ficam na coleção `lp/pages` do runtime
 * compartilhado: dentro do artefato usam o db (compartilhado entre quem abre
 * o Design System); fora dele, o localStorage.
 *
 * Páginas acima de ~200 KB não cabem num documento do db: ficam só neste
 * navegador (com aviso).
 *
 * Modelos: rascunhos na coleção `lp/templates` e snapshots publicados em
 * `lp/template-releases` (um documento cada, para caber no limite do db).
 * Todo o time vê e edita os mesmos modelos; as landing pages novas copiam o
 * snapshot publicado.
 */
import { toast } from "sonner";
import { collection, newId as runtimeId, type Doc } from "@gove/runtime";
import type { PageContent } from "@/lib/gove/types";
import { cloneDoc, seedTemplates, type StoredTemplate, type TemplatePatch } from "@/lib/gove/templates";

export type { StoredTemplate, TemplatePatch } from "@/lib/gove/templates";

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

/* ------------------------------------------------------------- modelos */

type DraftDoc = Omit<StoredTemplate, "publishedDoc"> & Doc;
type ReleaseDoc = { id: string; doc: PageContent; publishedAt: string } & Doc;

const drafts = collection<DraftDoc>("lp", "templates");
const releases = collection<ReleaseDoc>("lp", "template-releases");
const meta = collection<{ id: string; at: string } & Doc>("lp", "meta");
const SEEDED_ID = "templates-seeded";

/* Rascunhos grandes demais para o db: só neste navegador (como as páginas). */
const LOCAL_TEMPLATES_KEY = "gove-lp-builder:artifact-local-templates";
function readLocalTemplates(): Map<string, DraftDoc> {
  try {
    const raw = window.localStorage.getItem(LOCAL_TEMPLATES_KEY);
    const list = raw ? (JSON.parse(raw) as DraftDoc[]) : [];
    return new Map(Array.isArray(list) ? list.map((t) => [t.id, t]) : []);
  } catch {
    return new Map();
  }
}
let localTemplates = readLocalTemplates();
const templateListeners = new Set<() => void>();
function writeLocalTemplates() {
  try {
    window.localStorage.setItem(LOCAL_TEMPLATES_KEY, JSON.stringify([...localTemplates.values()]));
  } catch {
    toast.error("Não foi possível salvar: o armazenamento deste navegador está cheio.");
  }
  templateListeners.forEach((fn) => fn());
}

function putDraft(draft: DraftDoc) {
  if (byteSize(draft) > MAX_DOC_BYTES) {
    localTemplates.set(draft.id, draft);
    writeLocalTemplates();
    if (!warned.has(draft.id)) {
      warned.add(draft.id);
      toast.warning(
        "Este modelo passou de 200 KB e ficou salvo só neste navegador — reduza as imagens enviadas para o time poder usá-lo.",
        { duration: 8000 },
      );
    }
    return;
  }
  if (localTemplates.delete(draft.id)) {
    warned.delete(draft.id);
    writeLocalTemplates();
  }
  drafts.set(draft).catch(() => {
    toast.error("Não foi possível sincronizar o modelo. Tente salvar de novo.");
  });
}

function draftOf(t: StoredTemplate): DraftDoc {
  const { publishedDoc: _published, ...rest } = t;
  return rest as DraftDoc;
}

function mergedTemplates(): StoredTemplate[] {
  const map = new Map<string, DraftDoc>();
  for (const doc of drafts.all()) map.set(doc.id, doc);
  for (const t of localTemplates.values()) {
    const other = map.get(t.id);
    if (!other || other.updatedAt <= t.updatedAt) map.set(t.id, t);
  }
  const out: StoredTemplate[] = [];
  for (const draft of map.values()) {
    if (!draft || !draft.doc || typeof draft.updatedAt !== "string") continue;
    const t = { ...draft } as StoredTemplate;
    const release = releases.get(draft.id);
    if (draft.status === "publicado" && release?.doc) {
      t.publishedDoc = release.doc;
      t.publishedAt = release.publishedAt;
    }
    out.push(t);
  }
  return out;
}

export const templatesReady: Promise<void> = Promise.all([drafts.ready, releases.ready, meta.ready]).then(
  () => ensureSeedTemplates(),
);

export function subscribeTemplates(fn: () => void): () => void {
  const offs = [drafts.subscribe(() => fn()), releases.subscribe(() => fn())];
  templateListeners.add(fn);
  return () => {
    offs.forEach((off) => off());
    templateListeners.delete(fn);
  };
}

/** Primeira execução do time: os layouts antigos viram modelos publicados. */
export function ensureSeedTemplates(): void {
  // Sem a leitura definitiva do db não dá para saber se o time já tem modelos.
  if ([drafts, releases, meta].some((c) => c.mode() === "pending")) return;
  if (meta.get(SEEDED_ID)) return;
  void meta.set({ id: SEEDED_ID, at: new Date().toISOString() }).catch(() => undefined);
  if (drafts.all().length || localTemplates.size) return;
  // Ids novos (não os fixos): se o db demorar a responder, a semente nunca
  // sobrescreve um modelo que o time já editou — no pior caso, duplica.
  for (const seed of seedTemplates()) {
    const t = { ...seed, id: newId() };
    void releases.set({ id: t.id, doc: t.publishedDoc!, publishedAt: t.publishedAt! }).catch(() => undefined);
    void drafts.set(draftOf(t)).catch(() => undefined);
  }
}

export function listTemplates(): StoredTemplate[] {
  return mergedTemplates().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getTemplate(id: string): StoredTemplate | null {
  return mergedTemplates().find((t) => t.id === id) ?? null;
}

export function createTemplate(input: { name: string; description?: string; doc: PageContent }): StoredTemplate {
  const now = new Date().toISOString();
  const t: StoredTemplate = {
    id: newId(),
    name: input.name,
    status: "rascunho",
    doc: cloneDoc(input.doc),
    createdAt: now,
    updatedAt: now,
  };
  if (input.description) t.description = input.description;
  putDraft(draftOf(t));
  return t;
}

export function saveTemplate(id: string, patch: TemplatePatch): void {
  const current = getTemplate(id);
  if (!current) return;
  putDraft(draftOf({ ...current, ...patch, updatedAt: new Date().toISOString() }));
}

/** Publica o rascunho atual (snapshot separado, compartilhado com o time). */
export function publishTemplate(id: string): boolean {
  const current = getTemplate(id);
  if (!current) return false;
  if (byteSize(current.doc) > MAX_DOC_BYTES) {
    toast.error("Modelo acima de 200 KB não pode ser publicado. Reduza as imagens enviadas do dispositivo.");
    return false;
  }
  const now = new Date().toISOString();
  releases.set({ id, doc: cloneDoc(current.doc), publishedAt: now }).catch(() => {
    toast.error("Não foi possível publicar o modelo. Tente de novo.");
  });
  putDraft(draftOf({ ...current, status: "publicado", publishedAt: now }));
  return true;
}

export function unpublishTemplate(id: string): void {
  const current = getTemplate(id);
  if (!current) return;
  const next = draftOf({ ...current, status: "rascunho" });
  delete next.publishedAt;
  putDraft(next);
  if (releases.get(id)) releases.remove(id).catch(() => undefined);
}

export function deleteTemplate(id: string): void {
  if (localTemplates.delete(id)) writeLocalTemplates();
  if (drafts.get(id)) drafts.remove(id).catch(() => toast.error("Não foi possível excluir o modelo."));
  if (releases.get(id)) releases.remove(id).catch(() => undefined);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === LOCAL_TEMPLATES_KEY) {
      localTemplates = readLocalTemplates();
      templateListeners.forEach((fn) => fn());
    }
  });
}
