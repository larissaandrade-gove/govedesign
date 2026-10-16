// Parser XML mínimo e puro (sem DOM), suficiente para os pacotes OOXML
// (DOCX/PPTX) e SVGs simples. Funciona igual no Node e no navegador.
//   parseXml(str) → { name:'#document', children:[…] }
//   elemento: { name:'w:p', attrs:{…}, children:[elemento | string] }

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export const decodeEntities = (s) =>
  s.indexOf('&') < 0
    ? s
    : s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
        if (e[0] === '#') {
          const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
          return Number.isFinite(n) ? String.fromCodePoint(n) : m;
        }
        return ENT[e] ?? m;
      });

const ATTR = /([^\s=/>]+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

export function parseXml(src) {
  const text = typeof src === 'string' ? src : new TextDecoder().decode(src);
  const root = { name: '#document', attrs: {}, children: [] };
  const stack = [root];
  let i = 0;
  const n = text.length;
  while (i < n) {
    const lt = text.indexOf('<', i);
    if (lt < 0) {
      pushText(stack.at(-1), text.slice(i));
      break;
    }
    if (lt > i) pushText(stack.at(-1), text.slice(i, lt));
    if (text.startsWith('<!--', lt)) {
      const e = text.indexOf('-->', lt + 4);
      i = e < 0 ? n : e + 3;
      continue;
    }
    if (text.startsWith('<![CDATA[', lt)) {
      const e = text.indexOf(']]>', lt + 9);
      stack.at(-1).children.push(text.slice(lt + 9, e < 0 ? n : e));
      i = e < 0 ? n : e + 3;
      continue;
    }
    if (text[lt + 1] === '?' || text[lt + 1] === '!') {
      const e = text.indexOf('>', lt);
      i = e < 0 ? n : e + 1;
      continue;
    }
    // procura o '>' do tag respeitando aspas
    let j = lt + 1;
    let q = null;
    for (; j < n; j++) {
      const c = text[j];
      if (q) {
        if (c === q) q = null;
      } else if (c === '"' || c === "'") q = c;
      else if (c === '>') break;
    }
    const body = text.slice(lt + 1, j);
    i = j + 1;
    if (body[0] === '/') {
      const name = body.slice(1).trim();
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k].name === name) {
          stack.length = k;
          break;
        }
      }
      continue;
    }
    const selfClose = body.endsWith('/');
    const inner = selfClose ? body.slice(0, -1) : body;
    const m = /^\s*([^\s/>]+)/.exec(inner);
    if (!m) continue;
    const el = { name: m[1], attrs: {}, children: [] };
    ATTR.lastIndex = m[0].length;
    let a;
    while ((a = ATTR.exec(inner))) el.attrs[a[1]] = decodeEntities(a[2] ?? a[3] ?? a[4] ?? '');
    stack.at(-1).children.push(el);
    if (!selfClose) stack.push(el);
  }
  return root;
}

function pushText(parent, s) {
  if (s) parent.children.push(decodeEntities(s));
}

/** Nome local (sem prefixo de namespace). */
export const local = (name) => name.slice(name.indexOf(':') + 1);
const match = (el, name) => typeof el === 'object' && (el.name === name || (name.startsWith('*:') && local(el.name) === name.slice(2)));

/** Primeiro filho direto com o nome (aceita '*:nome'). */
export const child = (el, name) => el?.children?.find((c) => match(c, name)) ?? null;
export const children = (el, name) => el?.children?.filter((c) => match(c, name)) ?? [];
/** Caminho de filhos diretos: path(el, 'p:txBody', 'a:bodyPr'). */
export const path = (el, ...names) => names.reduce((e, nm) => (e ? child(e, nm) : null), el);

/** Descendentes com o nome, em ordem de documento; `skip(el)` corta subárvores. */
export function findAll(el, name, { skip } = {}) {
  const out = [];
  const walk = (e) => {
    for (const c of e.children ?? []) {
      if (typeof c !== 'object') continue;
      if (skip?.(c)) continue;
      if (match(c, name)) out.push(c);
      walk(c);
    }
  };
  if (el) walk(el);
  return out;
}
export const find = (el, name, opts) => findAll(el, name, opts)[0] ?? null;

/** Texto concatenado da subárvore. */
export function textOf(el) {
  if (typeof el === 'string') return el;
  return (el?.children ?? []).map(textOf).join('');
}
