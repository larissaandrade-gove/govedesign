// node:path (POSIX) mínimo para os módulos do backend.
export const sep = '/';
function normalize(p) {
  const abs = p.startsWith('/');
  const out = [];
  for (const seg of p.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      if (out.length && out[out.length - 1] !== '..') out.pop();
      else if (!abs) out.push('..');
    } else out.push(seg);
  }
  return (abs ? '/' : '') + out.join('/') || (abs ? '/' : '.');
}
export const join = (...parts) => normalize(parts.filter((x) => x !== '').join('/'));
export const resolve = (...parts) => {
  let r = '';
  for (const p of parts) r = p.startsWith('/') ? p : `${r}/${p}`;
  return normalize(r.startsWith('/') ? r : `/${r}`);
};
export function dirname(p) {
  const s = String(p).replace(/\/+$/, '');
  const i = s.lastIndexOf('/');
  return i < 0 ? '.' : i === 0 ? '/' : s.slice(0, i);
}
export function basename(p, ext) {
  const b = String(p).replace(/\/+$/, '').split('/').pop() ?? '';
  return ext && b.endsWith(ext) ? b.slice(0, -ext.length) : b;
}
export function extname(p) {
  const b = basename(p);
  const i = b.lastIndexOf('.');
  return i <= 0 ? '' : b.slice(i);
}
export { normalize };
export default { sep, join, resolve, dirname, basename, extname, normalize };
