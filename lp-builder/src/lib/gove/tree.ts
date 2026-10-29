import { makeColumn, uid } from "./factories";
import { fitsInContainer, flatLeaves, isContainer, mapLists, parentContainer } from "./leaves";
import type { AnyNode, Column, ContainerBlock, Leaf, PageContent, RowBlock, SectionBlock } from "./types";

/** Aplica `fn` a cada coluna da página. */
function mapColumns(page: PageContent, fn: (col: Column) => Column): PageContent {
  return {
    ...page,
    sections: page.sections.map((section) => ({
      ...section,
      children: section.children.map((row) => ({ ...row, columns: row.columns.map(fn) })),
    })),
  };
}

/** Onde está um bloco: seção, linha, coluna e (se estiver numa caixa) a caixa. */
export interface LeafPlace {
  section: SectionBlock;
  row: RowBlock;
  col: Column;
  container: ContainerBlock | null;
  leaf: Leaf;
}

export function locateLeaf(page: PageContent, id: string): LeafPlace | null {
  for (const section of page.sections)
    for (const row of section.children)
      for (const col of row.columns)
        for (const leaf of flatLeaves(col.children))
          if (leaf.id === id) return { section, row, col, container: parentContainer(col.children, id), leaf };
  return null;
}

/**
 * Move um bloco (leaf) para antes/depois de outro bloco, mesmo entre colunas,
 * ou para dentro de uma caixa ("inside", no fim). Cabeçalho, rodapé e outra
 * caixa não entram numa caixa.
 */
export function moveLeaf(
  page: PageContent,
  dragId: string,
  targetId: string,
  position: "before" | "after" | "inside" = "before",
): PageContent {
  if (dragId === targetId) return page;
  const from = locateLeaf(page, dragId);
  if (!from) return page;
  const moving = from.leaf;
  // O menu fica no cabeçalho; nada entra no cabeçalho arrastando.
  if (moving.type === "navbar" || isInHeader(page, targetId)) return page;
  // Uma caixa não entra nela mesma.
  if (isContainer(moving) && moving.children.some((c) => c.id === targetId)) return page;
  const target = locateLeaf(page, targetId);
  const isColumn = !target && !!findColumn(page, targetId);
  if (!target && !isColumn) return page;
  const into = target && position === "inside" && isContainer(target.leaf);
  const nested = !!target && (into || !!target.container);
  if (nested && !fitsInContainer(moving)) return page;
  const where = position === "inside" ? "after" : position;

  const insert = (list: Leaf[]): Leaf[] => {
    const index = list.findIndex((leaf) => leaf.id === targetId);
    if (index === -1) return list;
    const next = [...list];
    const hit = next[index]!;
    if (into && isContainer(hit)) next[index] = { ...hit, children: [...hit.children, moving] };
    else next.splice(where === "before" ? index : index + 1, 0, moving);
    return next;
  };
  return mapColumns(page, (col) => {
    const without = mapLists(col.children, (list) => list.filter((leaf) => leaf.id !== dragId));
    if (col.id === targetId) return { ...col, children: [...without, moving] };
    return { ...col, children: mapLists(without, insert) };
  });
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
    (row) =>
      row.id === id ||
      row.columns.some((col) => col.id === id || flatLeaves(col.children).some((leaf) => leaf.id === id)),
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
        for (const box of col.children) {
          const inner = isContainer(box) ? at(box.children) : null;
          if (inner) return inner;
        }
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
        columns: row.columns.map((col) => ({ ...col, children: mapLists(col.children, swap) })),
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
        for (const leaf of flatLeaves(col.children)) if (leaf.id === id) return leaf;
    }
  }
  return null;
}

/** Coluna pelo id, com a linha, a seção e a posição. */
export function findColumn(
  page: PageContent,
  id: string,
): { section: SectionBlock; row: RowBlock; col: Column; index: number } | null {
  for (const section of page.sections)
    for (const row of section.children) {
      const index = row.columns.findIndex((col) => col.id === id);
      if (index !== -1) return { section, row, col: row.columns[index]!, index };
    }
  return null;
}

/** Atualiza uma coluna (ex.: `{ style }`; `undefined` remove a chave). */
export function updateColumn(page: PageContent, id: string, patch: { [K in keyof Column]?: Column[K] | undefined }): PageContent {
  return mapColumns(page, (col) => {
    if (col.id !== id) return col;
    const next = { ...col, ...patch } as Record<string, unknown>;
    for (const key of Object.keys(next)) if (next[key] === undefined) delete next[key];
    return next as unknown as Column;
  });
}

const opaque = (color: string | undefined, opacity: number | undefined) =>
  !!color && color !== "transparent" && (opacity ?? 100) >= 100;

/** Fundo sólido da coluna (aparência própria, opaca e sem degradê) ou null. */
function columnOwnBg(col: Column): string | null {
  const s = col.style;
  if (!s) return null;
  if (s.fill === "gradient") return s.gradientFrom ?? null;
  return opaque(s.bgColor, s.fillOpacity) ? s.bgColor! : null;
}

/** Retorna a cor de fundo efetiva por trás de um elemento (para checar contraste). */
export function backgroundBehind(page: PageContent, id: string): string {
  for (const section of page.sections) {
    for (const row of section.children) {
      for (const col of row.columns) {
        for (const leaf of flatLeaves(col.children)) {
          if (leaf.id !== id) continue;
          if (leaf.type === "card") return leaf.bgColor;
          // Fundo próprio opaco da aparência do bloco.
          const own = leaf.blockStyle;
          if (opaque(own?.bgColor, own?.fillOpacity)) return own!.bgColor!;
          // Dentro de uma caixa: o fundo dela.
          const box = parentContainer(col.children, id)?.blockStyle;
          if (opaque(box?.bgColor, box?.fillOpacity)) return box!.bgColor!;
          const colBg = columnOwnBg(col);
          if (colBg) return colBg;
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
 * novo): a coluna, se tiver fundo; a linha, se tiver; senão a seção.
 * Degradê = cor do meio; foto = a sobreposição (ou preto, o pior caso para
 * texto escuro). `id` também aceita uma caixa (o fundo dela, se tiver).
 */
export function columnBackground(page: PageContent, columnId: string): string {
  const place = locateLeaf(page, columnId);
  if (place && isContainer(place.leaf) && opaque(place.leaf.blockStyle?.bgColor, place.leaf.blockStyle?.fillOpacity))
    return place.leaf.blockStyle!.bgColor!;
  const colId = place ? place.col.id : columnId;
  for (const section of page.sections)
    for (const row of section.children) {
      const col = row.columns.find((c) => c.id === colId);
      if (col) {
        const colBg = columnOwnBg(col);
        if (colBg) return colBg;
        const own = row.box.fill === "gradient" || row.box.fill === "image" || (row.box.bgColor && row.box.bgColor !== "transparent");
        const box = own ? row.box : section.box;
        if (box.fill === "gradient") return box.gradientVia || box.gradientFrom;
        if (box.fill === "image" && box.bgImage) return box.overlay > 0 ? box.overlayColor : "#000000";
        return box.bgColor && box.bgColor !== "transparent" ? box.bgColor : "#FFFFFF";
      }
    }
  return "#FFFFFF";
}

export function updateNode(page: PageContent, id: string, patch: Record<string, unknown>): PageContent {
  const patchList = (list: Leaf[]) => list.map((leaf) => (leaf.id === id ? ({ ...leaf, ...patch } as Leaf) : leaf));
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
            columns: row.columns.map((col) => ({ ...col, children: mapLists(col.children, patchList) })),
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
              children: mapLists(col.children, (list) => list.filter((leaf) => leaf.id !== id)),
            })),
          })),
      })),
  };
}

/** Cópia do bloco com ids novos (a caixa copia os blocos de dentro). */
export function cloneLeaf(leaf: Leaf): Leaf {
  const copy = structuredClone(leaf);
  copy.id = uid();
  if (isContainer(copy)) copy.children = copy.children.map(cloneLeaf);
  return copy;
}

function cloneRow(row: RowBlock): RowBlock {
  return {
    ...structuredClone(row),
    id: uid(),
    columns: row.columns.map((col) => ({ ...structuredClone(col), id: uid(), children: col.children.map(cloneLeaf) })),
  };
}

/**
 * Duplica um bloco, uma linha ou uma seção logo depois do original (ids
 * novos). O cabeçalho e o menu não se duplicam. Devolve a página e o id da cópia.
 */
export function duplicateNode(page: PageContent, id: string): { page: PageContent; id: string | null } {
  let copyId: string | null = null;
  const node = findNode(page, id);
  if (!node || isInHeader(page, id)) return { page, id: null };
  if (node.type === "section") {
    const copy: SectionBlock = { ...structuredClone(node), id: uid(), children: node.children.map(cloneRow) };
    copyId = copy.id;
    const index = page.sections.findIndex((s) => s.id === id);
    const sections = [...page.sections];
    sections.splice(index + 1, 0, copy);
    return { page: { ...page, sections }, id: copyId };
  }
  if (node.type === "row") {
    const copy = cloneRow(node);
    copyId = copy.id;
    return {
      page: {
        ...page,
        sections: page.sections.map((section) => {
          const index = section.children.findIndex((r) => r.id === id);
          if (index === -1) return section;
          const children = [...section.children];
          children.splice(index + 1, 0, copy);
          return { ...section, children };
        }),
      },
      id: copyId,
    };
  }
  if (node.type === "footer") return { page, id: null };
  const copy = cloneLeaf(node);
  copyId = copy.id;
  const after = (list: Leaf[]) => {
    const index = list.findIndex((leaf) => leaf.id === id);
    if (index === -1) return list;
    const next = [...list];
    next.splice(index + 1, 0, copy);
    return next;
  };
  return { page: mapColumns(page, (col) => ({ ...col, children: mapLists(col.children, after) })), id: copyId };
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

/** Adiciona o bloco no fim de uma coluna ou de uma caixa (`targetId`). */
export function addLeaf(page: PageContent, targetId: string, leaf: Leaf): PageContent {
  const intoBox = (list: Leaf[]) =>
    list.map((item) =>
      item.id === targetId && isContainer(item) && fitsInContainer(leaf) ? { ...item, children: [...item.children, leaf] } : item,
    );
  return mapColumns(page, (col) =>
    col.id === targetId ? { ...col, children: [...col.children, leaf] } : { ...col, children: intoBox(col.children) },
  );
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
          if (flatLeaves(col.children).some((leaf) => leaf.id === preferId)) return col.id;
        }
  }
  const lastSection = [...page.sections].reverse().find((s) => !isHeaderSection(s));
  const lastRow = lastSection?.children[lastSection.children.length - 1];
  return lastRow?.columns[0]?.id ?? null;
}

/**
 * Onde entra um bloco novo da biblioteca: na caixa selecionada (ou na caixa do
 * bloco selecionado), se o bloco couber nela; senão na coluna.
 */
export function insertTargetId(page: PageContent, selectedId: string | null | undefined, leaf: Pick<Leaf, "type">): string | null {
  if (selectedId && !isInHeader(page, selectedId) && fitsInContainer(leaf)) {
    const place = locateLeaf(page, selectedId);
    if (place && isContainer(place.leaf)) return place.leaf.id;
    if (place?.container) return place.container.id;
  }
  return firstColumnId(page, selectedId);
}
