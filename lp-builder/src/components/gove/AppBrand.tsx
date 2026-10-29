import { Layout } from "@phosphor-icons/react";

/**
 * Marca do app no cabeçalho. No build do artefato este módulo é trocado por
 * artifact/AppBrand.tsx, que usa a logomarca oficial (brand/logos/).
 */
export function AppBrand() {
  return (
    <div className="flex min-h-11 items-center gap-3">
      <span
        className="flex size-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: "var(--gove-primary)" }}
      >
        <Layout className="size-5" color="#FFFFFF" aria-hidden />
      </span>
      <span className="font-display text-lg font-bold">Landing Pages</span>
    </div>
  );
}
