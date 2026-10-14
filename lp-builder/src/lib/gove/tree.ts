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
          if (row.box.bgColor && row.box.bgColor !== "transparent") return row.box.bgColor;
          return section.box.bgColor;
        }
      }
      if (row.id === id) return section.box.bgColor;
    }
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

export function addSection(page: PageContent, section: SectionBlock): PageContent {
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
        return { ...row, columns };
      }),
    })),
  };
}

/** Encontra o primeiro column id disponível para inserir um bloco. */
export function firstColumnId(page: PageContent, preferId?: string | null): string | null {
  if (preferId) {
    for (const section of page.sections)
      for (const row of section.children)
        for (const col of row.columns) {
          if (col.id === preferId) return col.id;
          if (row.id === preferId) return row.columns[0]?.id ?? null;
          if (col.children.some((leaf) => leaf.id === preferId)) return col.id;
        }
  }
  const lastSection = page.sections[page.sections.length - 1];
  const lastRow = lastSection?.children[lastSection.children.length - 1];
  return lastRow?.columns[0]?.id ?? null;
}