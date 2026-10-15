/**
 * `@/lib/short-links` no build do artefato: mesmas exportações do módulo
 * original, com persistência na coleção `short_links` do artifact-runtime.
 * As regras puras (slug, URL, link circular) vêm do módulo original.
 */
import {
  SLUG_MAX_LENGTH,
  SlugTakenError,
  buildFinalUrl,
  generateSlug,
  isCircularShortUrl as isCircularShortUrlOriginal,
  isValidHttpUrl,
  sanitizeSlug,
  type CreateLinkInput,
  type CreatedLink,
} from "../../src/lib/short-links";
import { getShortDomain, REDIRECT_PATH_PREFIX } from "./short-domain";
import { linksCol, newId, ready, type ShortLinkDoc } from "./store";

export {
  SLUG_MAX_LENGTH,
  SlugTakenError,
  buildFinalUrl,
  generateSlug,
  isValidHttpUrl,
  sanitizeSlug,
};
export type { CreateLinkInput, CreatedLink };

/**
 * Mesma regra do original, corrigindo o caso de prefixo vazio: com a rota
 * pública na raiz, qualquer caminho do domínio curto pode ser um link curto
 * (o original só barrava a raiz do domínio).
 */
export function isCircularShortUrl(originalUrl: string): boolean {
  if (isCircularShortUrlOriginal(originalUrl)) return true;
  if (REDIRECT_PATH_PREFIX.replace(/^\/+|\/+$/g, "")) return false;
  try {
    const target = new URL(originalUrl.trim());
    const domain = getShortDomain();
    const short = new URL(/^https?:\/\//i.test(domain) ? domain : `https://${domain}`);
    return target.hostname.toLowerCase() === short.hostname.toLowerCase();
  } catch {
    return false;
  }
}

export async function isSlugTaken(slug: string): Promise<boolean> {
  await ready();
  const wanted = slug.toLowerCase();
  return linksCol.all().some((l) => l.slug.toLowerCase() === wanted);
}

async function generateAvailableSlug(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = generateSlug(attempt < 4 ? 7 : 9);
    if (!(await isSlugTaken(candidate))) return candidate;
  }
  throw new Error("Não foi possível gerar um slug único. Tente novamente.");
}

export async function createShortLink(input: CreateLinkInput): Promise<CreatedLink> {
  const originalUrl = input.originalUrl.trim();
  if (!isValidHttpUrl(originalUrl)) {
    throw new Error("Informe uma URL válida iniciando com http:// ou https://");
  }

  if (isCircularShortUrl(originalUrl)) {
    throw new Error("Não é possível encurtar um link que já é um link curto do Gove Links.");
  }

  const requestedSlug = (input.slug ?? "").trim();
  let slug: string;

  if (requestedSlug) {
    slug = sanitizeSlug(requestedSlug);
    if (!slug) {
      throw new Error("O slug informado é inválido. Use letras, números e hífen.");
    }
    if (await isSlugTaken(slug)) throw new SlugTakenError();
  } else {
    slug = await generateAvailableSlug();
  }

  const now = new Date().toISOString();
  const doc: ShortLinkDoc = {
    id: newId(),
    slug,
    original_url: originalUrl,
    final_url: buildFinalUrl(originalUrl),
    internal_name: input.internalName?.trim() ? input.internalName.trim() : null,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  try {
    await linksCol.set(doc);
  } catch {
    throw new Error("Não foi possível salvar o link. Tente novamente.");
  }

  return {
    id: doc.id,
    slug: doc.slug,
    original_url: doc.original_url,
    final_url: doc.final_url,
    internal_name: doc.internal_name,
  };
}
