import { supabase } from "@/integrations/supabase/client";
import { getShortDomain, REDIRECT_PATH_PREFIX } from "@/lib/short-domain";

export const SLUG_MAX_LENGTH = 60;

/** Sanitiza slug: lowercase, sem espaços/acentos, apenas [a-z0-9-]. */
export function sanitizeSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH);
}

const ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

export function generateSlug(length = 7): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return out;
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function isSlugTaken(slug: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("short_links")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function generateAvailableSlug(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = generateSlug(attempt < 4 ? 7 : 9);
    if (!(await isSlugTaken(candidate))) return candidate;
  }
  throw new Error("Não foi possível gerar um slug único. Tente novamente.");
}

/**
 * Rejeita URLs de destino que apontam para o próprio encurtador
 * (mesmo host do domínio curto + caminho com o prefixo de redirecionamento),
 * evitando links circulares. Comparação ignora maiúsculas/minúsculas e barra final.
 */
export function isCircularShortUrl(originalUrl: string): boolean {
  const shortDomain = getShortDomain();
  if (!shortDomain) return false;
  try {
    const target = new URL(originalUrl.trim());
    const short = new URL(
      /^https?:\/\//i.test(shortDomain) ? shortDomain : `https://${shortDomain}`,
    );
    if (target.hostname.toLowerCase() !== short.hostname.toLowerCase()) return false;
    const stripTrailing = (p: string) => p.replace(/\/+$/, "");
    const targetPath = stripTrailing(target.pathname).toLowerCase();
    const prefix = REDIRECT_PATH_PREFIX.toLowerCase().replace(/^\/+|\/+$/g, "");
    if (!prefix) return targetPath === "";
    return targetPath === `/${prefix}` || targetPath.startsWith(`/${prefix}/`);
  } catch {
    return false;
  }
}

/** Hoje a URL final é igual à original; a estrutura permite divergir no futuro (UTMs). */
export function buildFinalUrl(originalUrl: string): string {
  return originalUrl;
}

export class SlugTakenError extends Error {
  constructor() {
    super("Este slug já está em uso. Escolha outro.");
    this.name = "SlugTakenError";
  }
}

export type CreateLinkInput = {
  originalUrl: string;
  slug?: string;
  internalName?: string;
};

export type CreatedLink = {
  id: string;
  slug: string;
  original_url: string;
  final_url: string;
  internal_name: string | null;
};

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

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const { data, error } = await supabase
    .from("short_links")
    .insert({
      slug,
      original_url: originalUrl,
      final_url: buildFinalUrl(originalUrl),
      internal_name: input.internalName?.trim() ? input.internalName.trim() : null,
      created_by: userData.user.id,
    })
    .select("id, slug, original_url, final_url, internal_name")
    .single();

  if (error) {
    if (error.code === "23505" || error.code === "23514" || /duplicate key/i.test(error.message)) {
      throw new SlugTakenError();
    }
    throw new Error(error.message);
  }

  return data as CreatedLink;
}
