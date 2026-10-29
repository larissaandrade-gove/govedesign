/**
 * Blocos dentro de blocos: a "Caixa" (`container`) guarda outros blocos (um
 * nível só). Estes helpers percorrem a lista de uma coluna incluindo os blocos
 * de dentro das caixas. Módulo puro (só tipos), sem ciclo.
 */
import type { ContainerBlock, Leaf } from "./types";

export const isContainer = (leaf: Leaf): leaf is ContainerBlock => leaf.type === "container";

/** O bloco pode entrar numa caixa? (não: cabeçalho, rodapé e outra caixa) */
export const fitsInContainer = (leaf: Pick<Leaf, "type">) =>
  leaf.type !== "navbar" && leaf.type !== "footer" && leaf.type !== "container";

/** Todos os blocos da lista, com os de dentro das caixas logo depois da caixa. */
export function flatLeaves(list: Leaf[]): Leaf[] {
  const out: Leaf[] = [];
  for (const leaf of list) {
    out.push(leaf);
    if (isContainer(leaf)) out.push(...leaf.children);
  }
  return out;
}

/** Aplica `fn` à lista e, recursivamente, à lista de dentro de cada caixa. */
export function mapLists(list: Leaf[], fn: (list: Leaf[]) => Leaf[]): Leaf[] {
  return fn(list).map((leaf) => (isContainer(leaf) ? { ...leaf, children: mapLists(leaf.children, fn) } : leaf));
}

/** Caixa que contém o bloco (ou null). */
export function parentContainer(list: Leaf[], id: string): ContainerBlock | null {
  for (const leaf of list) if (isContainer(leaf) && leaf.children.some((c) => c.id === id)) return leaf;
  return null;
}
