/**
 * Domínio curto no build do artefato.
 *
 * Dentro do artefato não existe servidor de redirecionamento: o link curto só
 * funciona publicamente no servidor publicado do Gove Links. O domínio exibido
 * vem de GOVE_LINKS_SHORT_DOMAIN no momento do build (padrão go.gove.digital).
 */
declare const __GOVE_SHORT_DOMAIN__: string;

const CONFIGURED_SHORT_DOMAIN: string =
  typeof __GOVE_SHORT_DOMAIN__ === "string" ? __GOVE_SHORT_DOMAIN__ : "go.gove.digital";

export function getShortDomain(): string {
  return CONFIGURED_SHORT_DOMAIN.replace(/\/+$/, "");
}

/** Mesmo valor do app publicado (rota pública na raiz). */
export const REDIRECT_PATH_PREFIX = "";

function withPrefix(slug: string): string {
  return REDIRECT_PATH_PREFIX ? `${REDIRECT_PATH_PREFIX}/${slug}` : slug;
}

export function getShortDomainLabel(): string {
  const domain = getShortDomain().replace(/^https?:\/\//, "");
  return REDIRECT_PATH_PREFIX ? `${domain}/${REDIRECT_PATH_PREFIX}` : domain;
}

export function buildShortUrl(slug: string): string {
  const domain = getShortDomain();
  if (!domain) return `/${withPrefix(slug)}`;
  const withProtocol = /^https?:\/\//.test(domain) ? domain : `https://${domain}`;
  return `${withProtocol}/${withPrefix(slug)}`;
}
