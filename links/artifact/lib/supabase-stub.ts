/**
 * Substitui `@/integrations/supabase/client` no build do artefato.
 * O artefato não tem backend: qualquer uso acidental falha de forma explícita
 * em vez de tentar acessar a rede.
 */
function unavailable(): never {
  throw new Error("Supabase não está disponível no artefato do Gove Links.");
}

export const supabase = new Proxy(
  {},
  {
    get() {
      return unavailable;
    },
  },
) as unknown as (typeof import("../../src/integrations/supabase/client"))["supabase"];
