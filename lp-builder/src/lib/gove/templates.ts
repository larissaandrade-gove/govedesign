/**
 * Modelos de landing page: o time cria, edita e publica modelos; toda landing
 * page nova nasce de uma CÓPIA do snapshot publicado (`publishedDoc`).
 * Editar o rascunho (`doc`) não muda nada para quem cria páginas até o modelo
 * ser publicado de novo, e páginas já criadas nunca mudam.
 *
 * Aqui ficam só tipos e regras puras; a persistência está em storage.ts
 * (localStorage no build do servidor, db compartilhado no build do artefato).
 */
import { HERO_PRESETS, pageFromPreset, type HeroPresetId } from "./presets";
import type { Identity, PageContent } from "./types";

export type TemplateStatus = "rascunho" | "publicado";

export type StoredTemplate = {
  id: string;
  name: string;
  description?: string;
  status: TemplateStatus;
  /** Rascunho em edição. */
  doc: PageContent;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  /** Snapshot publicado: é o que as novas landing pages copiam. */
  publishedDoc?: PageContent;
};

export type TemplatePatch = { name?: string; description?: string; doc?: PageContent };

/** Cópia profunda: a página criada não compartilha nada com o modelo. */
export const cloneDoc = (doc: PageContent): PageContent =>
  JSON.parse(JSON.stringify(doc)) as PageContent;

export const isPublished = (
  t: StoredTemplate,
): t is StoredTemplate & { publishedDoc: PageContent } =>
  t.status === "publicado" && !!t.publishedDoc;

/** O rascunho mudou depois da última publicação. */
export function hasUnpublishedChanges(t: StoredTemplate): boolean {
  if (!isPublished(t)) return false;
  return JSON.stringify(t.doc) !== JSON.stringify(t.publishedDoc);
}

export const templateIdentity = (t: StoredTemplate): Identity =>
  ((isPublished(t) ? t.publishedDoc : t.doc).identity ?? "gove") as Identity;

/** Conteúdo de uma nova landing page a partir do modelo publicado. */
export function pageFromTemplate(t: StoredTemplate): PageContent {
  return cloneDoc(isPublished(t) ? t.publishedDoc : t.doc);
}

/** Layouts antigos (presets de hero) que viram modelos iniciais. */
export const SEED_PRESETS = HERO_PRESETS.filter((p) => p.id !== "blank");

/**
 * Modelos iniciais (primeira execução): os layouts fixos de antes, nas duas
 * identidades, já publicados. Ids fixos: abrir o app em dois lugares ao mesmo
 * tempo não duplica os modelos.
 */
export function seedTemplates(now = new Date().toISOString()): StoredTemplate[] {
  const out: StoredTemplate[] = [];
  for (const identity of ["gove", "bb"] as Identity[]) {
    for (const preset of SEED_PRESETS) {
      const doc = pageFromPreset(preset.id as HeroPresetId, identity);
      out.push({
        id: `modelo-base-${preset.id}-${identity}`,
        name: identity === "bb" ? `${preset.nome} · BB` : preset.nome,
        description: preset.descricao,
        status: "publicado",
        doc,
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
        publishedDoc: cloneDoc(doc),
      });
    }
  }
  return out;
}

export const formatDate = (iso: string | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";
