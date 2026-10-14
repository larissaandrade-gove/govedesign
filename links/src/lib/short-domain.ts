/**
 * Configuração centralizada do domínio curto.
 *
 * Por padrão usamos o próprio endereço do app (assim os links SEMPRE abrem).
 * Quando um domínio próprio (ex.: link.gove.digital) estiver conectado ao
 * projeto, basta definir VITE_SHORT_DOMAIN com ele — nada mais muda.
 */
const CONFIGURED_SHORT_DOMAIN = import.meta.env["VITE_SHORT_DOMAIN"];

export function getShortDomain(): string {
  if (CONFIGURED_SHORT_DOMAIN) return String(CONFIGURED_SHORT_DOMAIN).replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin.replace(/\/+$/, "");
  return "";
}


/**
 * Prefixo da rota pública de redirecionamento. Quando o domínio próprio
 * (go.gove.digital) apontar direto para a raiz, basta trocar por "".
 */
export const REDIRECT_PATH_PREFIX = "";

function withPrefix(slug: string): string {
  return REDIRECT_PATH_PREFIX ? `${REDIRECT_PATH_PREFIX}/${slug}` : slug;
}

/** Rótulo curto exibido antes do slug no formulário (ex.: "gove.link/r/"). */
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
