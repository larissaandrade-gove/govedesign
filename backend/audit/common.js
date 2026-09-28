// Estruturas compartilhadas pelos dois modos de auditoria.

export const CATEGORY_LABELS = {
  geral: 'Geral',
  tipografia: 'Tipografia',
  cor: 'Paleta de cores',
  gradiente: 'Gradientes',
  contraste: 'Contraste (WCAG)',
  margens: 'Margens',
  espacamento: 'Espaçamento',
  logomarca: 'Logomarca',
  icones: 'Ícones',
  qrcode: 'QR code',
};

export const STATUS = {
  pass: { icon: '✅', label: 'Conforme' },
  warn: { icon: '⚠️', label: 'Atenção' },
  fail: { icon: '❌', label: 'Não conforme' },
  manual: { icon: '⚠️', label: 'Não verificável — revisão manual' },
  skip: { icon: '➖', label: 'Não se aplica' },
};

/**
 * Cria um item de checagem. O `id` é atribuído ao montar o relatório.
 * status: pass | warn | fail | manual | skip
 */
export function check({ category, title, status, found = null, expected = null, suggestion = null, objects = [], details = null, bbox = null }) {
  return {
    category,
    title,
    status,
    icon: STATUS[status].icon,
    found,
    expected,
    suggestion,
    objects,
    details,
    bbox,
  };
}

/** Margem mínima em px para o tipo de peça. */
export function resolveMargin(tokens, pieceType, artboard) {
  const cfg = tokens.margins[pieceType] ?? null;
  if (!cfg) return null;
  const minSide = Math.min(artboard.width, artboard.height);
  return {
    ...cfg,
    minMargin: Math.max(cfg.minMarginRatio * minSide, cfg.minMarginPx ?? 0),
  };
}

export const r1 = (n) => Math.round(n * 10) / 10;

/**
 * Checagem de margens para elementos-chave com bbox conhecido
 * (coordenadas relativas ao artboard).
 */
export function marginChecks(nodes, artboard, margin, { modeNote = null } = {}) {
  const out = [];
  if (!margin) {
    out.push(
      check({
        category: 'margens',
        title: 'Margens mínimas',
        status: 'manual',
        found: 'Tipo de peça não informado ou sem margem cadastrada',
        expected: 'Tipo de peça com margem mínima em brand_tokens (flyer, post, story, slide, banner…)',
        suggestion: 'Informe o tipo de peça na auditoria ou cadastre a margem desse tipo.',
      }),
    );
    return out;
  }
  const failing = [];
  for (const n of nodes) {
    const b = n.bbox;
    const d = {
      esquerda: b.left,
      topo: b.top,
      direita: artboard.width - (b.left + b.width),
      base: artboard.height - (b.top + b.height),
    };
    const [side, min] = Object.entries(d).sort((a, c) => a[1] - c[1])[0];
    if (min < margin.minMargin - 0.5) {
      failing.push(n);
      const bleeding = min < 0;
      out.push(
        check({
          category: 'margens',
          title: `Margem insuficiente — ${n.label}`,
          status: 'fail',
          found: `${r1(min)} px até a borda (${side})${bleeding ? ' — elemento ultrapassa o artboard' : ''}`,
          expected: `≥ ${r1(margin.minMargin)} px`,
          suggestion: `Afaste o elemento ${r1(margin.minMargin - min)} px da borda ${side}${bleeding ? ' e traga-o para dentro da área útil' : ''}.`,
          objects: [n.label],
          details: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, r1(v)])),
          bbox: b,
        }),
      );
    }
  }
  if (!failing.length && nodes.length) {
    out.push(
      check({
        category: 'margens',
        title: `Margens mínimas respeitadas (${nodes.length} elemento(s)-chave)`,
        status: 'pass',
        found: `Menor margem: ${r1(Math.min(...nodes.map((n) => Math.min(n.bbox.left, n.bbox.top, artboard.width - n.bbox.left - n.bbox.width, artboard.height - n.bbox.top - n.bbox.height))))} px`,
        expected: `≥ ${r1(margin.minMargin)} px`,
        details: modeNote,
      }),
    );
  }
  return out;
}

function gapBetween(a, b) {
  const dx = Math.max(0, b.left - (a.left + a.width), a.left - (b.left + b.width));
  const dy = Math.max(0, b.top - (a.top + a.height), a.top - (b.top + b.height));
  const overlap = dx === 0 && dy === 0;
  return { gap: Math.max(dx, dy), overlap };
}

/**
 * Espaçamento entre elementos-chave. Pares com logomarca ou QR code usam a
 * regra estrita (❌); pares texto↔texto e texto↔ícone apenas alertam (⚠️),
 * pois blocos de texto relacionados costumam ficar mais próximos.
 */
export function spacingChecks(nodes, margin) {
  const out = [];
  if (!margin) return out;
  const min = margin.minSpacingPx ?? 0;
  let problems = 0;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const strict = [a.kind, b.kind].some((k) => k === 'logo' || k === 'qrcode');
      const { gap, overlap } = gapBetween(a.bbox, b.bbox);
      if (!overlap && gap >= min) continue;
      problems++;
      out.push(
        check({
          category: 'espacamento',
          title: overlap ? `Sobreposição — ${a.label} × ${b.label}` : `Espaçamento abaixo do mínimo — ${a.label} × ${b.label}`,
          status: overlap || strict ? 'fail' : 'warn',
          found: overlap ? 'Os elementos se sobrepõem' : `${r1(gap)} px`,
          expected: `≥ ${min} px${strict ? ' (área de proteção da logomarca/QR code)' : ''}`,
          suggestion: overlap
            ? 'Separe os elementos para que nenhum invada a área do outro.'
            : `Aumente a distância entre os elementos em ${r1(min - gap)} px.`,
          objects: [a.label, b.label],
          bbox: union(a.bbox, b.bbox),
        }),
      );
    }
  }
  if (!problems && nodes.length > 1) {
    out.push(
      check({
        category: 'espacamento',
        title: `Espaçamento entre elementos-chave respeitado (${nodes.length} elementos)`,
        status: 'pass',
        expected: `≥ ${min} px`,
      }),
    );
  }
  return out;
}

export function union(a, b) {
  const left = Math.min(a.left, b.left);
  const top = Math.min(a.top, b.top);
  return {
    left,
    top,
    width: Math.max(a.left + a.width, b.left + b.width) - left,
    height: Math.max(a.top + a.height, b.top + b.height) - top,
  };
}
