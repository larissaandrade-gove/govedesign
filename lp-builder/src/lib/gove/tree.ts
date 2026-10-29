import { makeColumn } from "./factories";
import type { AnyNode, Leaf, PageContent, RowBlock, SectionBlock } from "./types";

/** Move um bloco (leaf) para antes/depois de outro bloco, mesmo entre colunas. */
export function moveLeaf(
  page: PageContent,
  dragId: string,
  targetId: string,
  position: "before" | "after" = "before",
): PageContent {
  if (dragId === targetId) return page;
  let dragged: Leaf | null = null;
  for (const section of page.sections)
    for (const row of section.children)
      for (const col of row.columns) {
        const found = col.children.find((leaf) => leaf.id === dragId);
        if (found) dragged = found;
      }
  if (!dragged) return page;
  const moving = dragged;
  // O menu fica no cabeçalho; nada entra no cabeçalho arrastando.
  if (moving.type === "navbar" || isInHeader(page, targetId)) return page;

  return {
    ...page,
    sections: page.sections.map((section) => ({
      ...section,
      children: section.children.map((row) => ({
        ...row,
        columns: row.columns.map((col) => {
          const without = col.children.filter((leaf) => leaf.id !== dragId);
          const isTargetColumn = col.id === targetId;
          const index = without.findIndex((leaf) => leaf.id === targetId);
          if (index === -1 && !isTargetColumn) return { ...col, children: without };
          const at = isTargetColumn
            ? without.length
            : position === "before"
              ? index
              : index + 1;
          const children = [...without];
          children.splice(at, 0, moving);
          return { ...col, children };
        }),
      })),
    })),
  };
}

/** Move uma linha para antes/depois de outra linha, mesmo entre seções. */
export function moveRow(
  page: PageContent,
  dragId: string,
  targetId: string,
  position: "before" | "after" = "before",
): PageContent {
  if (dragId === targetId) return page;
  let dragged: RowBlock | null = null;
  for (const section of page.sections) {
    const found = section.children.find((row) => row.id === dragId);
    if (found) dragged = found;
  }
  if (!dragged) return page;
  const moving = dragged;
  if (isInHeader(page, dragId) || isInHeader(page, targetId)) return page;

  return {
    ...page,
    sections: page.sections.map((section) => {
      const without = section.children.filter((row) => row.id !== dragId);
      const isTargetSection = section.id === targetId;
      const index = without.findIndex((row) => row.id === targetId);
      if (index === -1 && !isTargetSection) return { ...section, children: without };
      const at = isTargetSection ? without.length : position === "before" ? index : index + 1;
      const children = [...without];
      children.splice(at, 0, moving);
      return { ...section, children };
    }),
  };
}

/** Seção do cabeçalho com menu (só uma, sempre a primeira). */
export const isHeaderSection = (section: Pick<SectionBlock, "role">) => section.role === "header";

/** O id é o cabeçalho ou algo dentro dele? */
export function isInHeader(page: PageContent, id: string): boolean {
  const section = page.sections.find(isHeaderSection);
  if (!section) return false;
  if (section.id === id) return true;
  return section.children.some(
    (row) => row.id === id || row.columns.some((col) => col.id === id || col.children.some((leaf) => leaf.id === id)),
  );
}

/** Posição de uma seção, linha ou bloco entre os irmãos (para mover sem arrastar). */
export function siblingInfo(page: PageContent, id: string): { index: number; count: number } | null {
  const at = <T extends { id: string }>(list: T[]) => {
    const index = list.findIndex((item) => item.id === id);
    return index === -1 ? null : { index, count: list.length };
  };
  // O cabeçalho não se move e nenhuma seção passa à frente dele.
  const header = page.sections.find(isHeaderSection);
  if (header?.id === id) return { index: 0, count: 1 };
  const top = at(page.sections.filter((s) => !isHeaderSection(s)));
  if (top) return top;
  for (const section of page.sections) {
    const row = at(section.children);
    if (row) return row;
    for (const r of section.children)
      for (const col of r.columns) {
        const leaf = at(col.children);
        if (leaf) return leaf;
      }
  }
  return null;
}

/** Sobe (-1) ou desce (+1) uma seção, linha ou bloco dentro do mesmo pai. */
export function moveSibling(page: PageContent, id: string, dir: -1 | 1): PageContent {
  const header = (item: unknown) => {
    const node = item as { type?: string; role?: string };
    return node.type === "section" && node.role === "header";
  };
  const swap = <T extends { id: string }>(list: T[]): T[] => {
    const i = list.findIndex((item) => item.id === id);
    const j = i + dir;
    if (i === -1 || j < 0 || j >= list.length) return list;
    if (header(list[i]) || header(list[j])) return list;
    const next = [...list];
    [next[i], next[j]] = [next[j]!, next[i]!];
    return next;
  };
  return {
    ...page,
    sections: swap(page.sections).map((section) => ({
      ...section,
      children: swap(section.children).map((row) => ({
        ...row,
        columns: row.columns.map((col) => ({ ...col, children: swap(col.children) })),
      })),
    })),
  };
}

export function findNode(page: PageContent, id: string): AnyNode | null {
  for (const section of page.sections) {
    if (section.id === id) return section;
    for (const row of section.children) {
      if (row.id === id) return row;
      for (const col of row.columns)
        for (const leaf of col.children) if (leaf.id === id) return leaf;
    }
  }
  return null;
}

/** Retorna a cor de fundo efetiva por trás de um elemento (para checar contraste). */
export function backgroundBehind(page: PageContent, id: string): string {
  for (const section of page.sections) {
    for (const row of section.children) {
      for (const col of row.columns) {
        for (const leaf of col.children) {
          if (leaf.id !== id) continue;
          if (leaf.type === "card") return leaf.bgColor;
          // Fundo próprio opaco da aparência do bloco.
          const own = leaf.blockStyle;
          if (own?.bgColor && own.bgColor !== "transparent" && (own.fillOpacity ?? 100) >= 100) return own.bgColor;
          if (row.box.bgColor && row.box.bgColor !== "transparent") return row.box.bgColor;
          return section.box.bgColor;
        }
      }
      if (row.id === id) return section.box.bgColor;
    }
  }
  return "#FFFFFF";
}

/**
 * Cor dominante do fundo de uma coluna (para as cores-padrão de um bloco
 * novo): a linha, se tiver fundo; senão a seção. Degradê = cor do meio;
 * foto = a sobreposição (ou preto, o pior caso para texto escuro).
 */
export function columnBackground(page: PageContent, columnId: string): string {
  for (const section of page.sections)
    for (const row of section.children)
      if (row.columns.some((col) => col.id === columnId)) {
        const own = row.box.fill === "gradient" || row.box.fill === "image" || (row.box.bgColor && row.box.bgColor !== "transparent");
        const box = own ? row.box : section.box;
        if (box.fill === "gradient") return box.gradientVia || box.gradientFrom;
        if (box.fill === "image" && box.bgImage) return box.overlay > 0 ? box.overlayColor : "#000000";
        return box.bgColor && box.bgColor !== "transparent" ? box.bgColor : "#FFFFFF";
      }
  return "#FFFFFF";
}

export function updateNode(page: PageContent, id: string, patch: Record<string, unknown>): PageContent {
  return {
    ...page,
    sections: page.sections.map((section) => {
      if (section.id === id) return { ...section, ...patch } as SectionBlock;
      return {
        ...section,
        children: section.children.map((row) => {
          if (row.id === id) return { ...row, ...patch } as RowBlock;
          return {
            ...row,
            columns: row.columns.map((col) => ({
              ...col,
              children: col.children.map((leaf) =>
                leaf.id === id ? ({ ...leaf, ...patch } as Leaf) : leaf,
              ),
            })),
          };
        }),
      };
    }),
  };
}

export function removeNode(page: PageContent, id: string): PageContent {
  return {
    ...page,
    sections: page.sections
      .filter((section) => section.id !== id)
      .map((section) => ({
        ...section,
        children: section.children
          .filter((row) => row.id !== id)
          .map((row) => ({
            ...row,
            columns: row.columns.map((col) => ({
              ...col,
              children: col.children.filter((leaf) => leaf.id !== id),
            })),
          })),
      })),
  };
}

/** Adiciona a seção no fim; o cabeçalho entra no topo e só uma vez. */
export function addSection(page: PageContent, section: SectionBlock): PageContent {
  if (isHeaderSection(section)) {
    if (page.sections.some(isHeaderSection)) return page;
    return { ...page, sections: [section, ...page.sections] };
  }
  return { ...page, sections: [...page.sections, section] };
}

export function addRow(page: PageContent, sectionId: string, row: RowBlock): PageContent {
  return {
    ...page,
    sections: page.sections.map((section) =>
      section.id === sectionId ? { ...section, children: [...section.children, row] } : section,
    ),
  };
}

export function addLeaf(page: PageContent, columnId: string, leaf: Leaf): PageContent {
  return {
    ...page,
    sections: page.sections.map((section) => ({
      ...section,
      children: section.children.map((row) => ({
        ...row,
        columns: row.columns.map((col) =>
          col.id === columnId ? { ...col, children: [...col.children, leaf] } : col,
        ),
      })),
    })),
  };
}

export function setColumnCount(page: PageContent, rowId: string, count: number): PageContent {
  return {
    ...page,
    sections: page.sections.map((section) => ({
      ...section,
      children: section.children.map((row) => {
        if (row.id !== rowId) return row;
        const columns = [...row.columns];
        while (columns.length < count) columns.push(makeColumn());
        while (columns.length > count) {
          const removed = columns.pop();
          if (removed && removed.children.length && columns[columns.length - 1]) {
            const last = columns[columns.length - 1]!;
            columns[columns.length - 1] = {
              ...last,
              children: [...last.children, ...removed.children],
            };
          }
        }
        // Proporção personalizada vale para a quantidade antiga de colunas: volta a iguais.
        const { ratios: _ratios, ...rest } = row;
        return { ...(count === row.columns.length ? row : rest), columns };
      }),
    })),
  };
}

/** Encontra o primeiro column id disponível para inserir um bloco. */
export function firstColumnId(page: PageContent, preferId?: string | null): string | null {
  // Blocos novos não entram no cabeçalho.
  if (preferId && isInHeader(page, preferId)) preferId = null;
  if (preferId) {
    for (const section of page.sections)
      for (const row of section.children)
        for (const col of row.columns) {
          if (col.id === preferId) return col.id;
          if (row.id === preferId) return row.columns[0]?.id ?? null;
          if (col.children.some((leaf) => leaf.id === preferId)) return col.id;
        }
  }
  const lastSection = [...page.sections].reverse().find((s) => !isHeaderSection(s));
  const lastRow = lastSection?.children[lastSection.children.length - 1];
  return lastRow?.columns[0]?.id ?? null;
}