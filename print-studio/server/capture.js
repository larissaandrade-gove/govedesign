// Captura da tela do celular a partir do site do município (modelo Portal Cidadão).
//
// Um Chromium headless (Playwright) abre o site num celular de 390×844 pt com densidade 3
// (1170×2532 px, ~9:19,5), espera a página assentar e captura só a parte visível. O recorte
// final da tela do mockup é feito na exportação (mockupCmyk), como com uma captura enviada.
//
// Segurança (SSRF): o servidor só visita endereços públicos. A URL, cada redirecionamento e
// cada recurso da página passam pela checagem: só http/https nas portas 80/443, e o nome
// resolvido por DNS não pode cair em rede privada, loopback, link-local ou metadados da nuvem.
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

export const CAPTURE_VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 3 };
const TIMEOUT_MS = 20_000;
const MAX_BYTES = 15 * 1024 * 1024;
const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

export class CaptureError extends Error {}

const blocked = new BlockList();
for (const [net, bits] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4],
]) blocked.addSubnet(net, bits, 'ipv4');
for (const [net, bits] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['64:ff9b::', 96]]) blocked.addSubnet(net, bits, 'ipv6');

/** Endereço IP fora das redes internas (IPv4 mapeado em IPv6 é conferido como IPv4). */
export function isPublicIp(ip) {
  const v4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)?.[1];
  if (v4) return !blocked.check(v4, 'ipv4');
  const fam = isIP(ip);
  return fam === 4 ? !blocked.check(ip, 'ipv4') : fam === 6 ? !blocked.check(ip, 'ipv6') : false;
}

const hostCache = new Map();
/** A URL pode ser visitada pelo servidor? (http/https, portas padrão, só IPs públicos) */
export async function isAllowedUrl(raw, resolve = (h) => lookup(h, { all: true, verbatim: true })) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (u.port && u.port !== '80' && u.port !== '443') return false;
  if (u.username || u.password) return false;
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) return isPublicIp(host);
  if (!hostCache.has(host)) {
    hostCache.set(
      host,
      resolve(host)
        .then((addrs) => addrs.length > 0 && addrs.every((a) => isPublicIp(a.address)))
        .catch(() => false),
    );
    setTimeout(() => hostCache.delete(host), 60_000).unref?.();
  }
  return hostCache.get(host);
}

let browserPromise = null;
async function browser() {
  if (!browserPromise) {
    const { chromium } = await import('playwright-core');
    browserPromise = chromium
      .launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--disable-dev-shm-usage'] })
      .catch((err) => {
        browserPromise = null;
        throw new CaptureError(`Navegador da captura indisponível no servidor (${err.message.split('\n')[0]}).`);
      });
  }
  return browserPromise;
}

// Uma captura por vez: o Chromium é pesado e a captura é rara (cadastro/atualização)
let queue = Promise.resolve();

/**
 * Captura a tela do celular de `url`. Devolve o PNG (Buffer) em 1170×2532 px.
 * @param {string} url  endereço completo (normalizeSite do layout)
 */
export function captureSite(url, { resolve, allowPrivate = false } = {}) {
  const job = queue.then(() => doCapture(url, resolve, allowPrivate));
  queue = job.catch(() => {});
  return job;
}

// `allowPrivate`: só nos testes (página local); nunca vem de uma requisição
async function doCapture(url, resolve, allowPrivate) {
  const allowed = (u) => (allowPrivate ? /^https?:/.test(u) : isAllowedUrl(u, resolve));
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^\[|\]$/g, '');
    } catch {
      return '';
    }
  })();
  if (!allowPrivate && host && !isIP(host)) {
    const found = await (resolve ?? ((h) => lookup(h, { all: true, verbatim: true })))(host).then((a) => a.length > 0, () => false);
    if (!found) throw new CaptureError(`Site não encontrado (${host}): confira o endereço no cadastro do município.`);
  }
  if (!(await allowed(url))) throw new CaptureError('Endereço não permitido para captura (só sites públicos em http/https).');
  const b = await browser();
  const ctx = await b.newContext({
    viewport: { width: CAPTURE_VIEWPORT.width, height: CAPTURE_VIEWPORT.height },
    deviceScaleFactor: CAPTURE_VIEWPORT.deviceScaleFactor,
    isMobile: true,
    hasTouch: true,
    userAgent: MOBILE_UA,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    acceptDownloads: false,
    serviceWorkers: 'block',
  });
  let bytes = 0;
  try {
    // Toda requisição (inclusive redirecionamentos e recursos da página) passa pela checagem
    await ctx.route('**/*', async (route) => {
      const u = route.request().url();
      if (u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
      if (bytes > MAX_BYTES || !(await allowed(u))) return route.abort('blockedbyclient');
      return route.continue();
    });
    const page = await ctx.newPage();
    page.on('response', (r) => {
      const n = Number(r.headers()['content-length']);
      if (Number.isFinite(n)) bytes += n;
    });
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS }).catch((err) => {
      throw new CaptureError(`O site não abriu: ${err.message.split('\n')[0]}`);
    });
    if (res && res.status() >= 400) throw new CaptureError(`O site respondeu com erro ${res.status()}.`);
    // Espera imagens e fontes assentarem, sem passar do limite
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    await page.waitForTimeout(600);
    return await page.screenshot({ type: 'png', fullPage: false, animations: 'disabled', caret: 'hide' });
  } finally {
    await ctx.close().catch(() => {});
  }
}

/** Fecha o navegador (testes e encerramento do servidor). */
export async function closeCaptureBrowser() {
  const p = browserPromise;
  browserPromise = null;
  if (p) await (await p.catch(() => null))?.close().catch(() => {});
}
