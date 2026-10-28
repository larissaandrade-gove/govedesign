import { useEffect, useState } from 'react';
import type { GoveApp } from '../data/apps';

/**
 * Disponibilidade dos apps que dependem de publicação web (hoje, o Gove Links):
 * - 'ok': app comum, sempre disponível;
 * - 'em-breve': sem endereço publicado, ou o servidor não respondeu em /saude;
 * - 'verificando': conferindo o servidor;
 * - 'publicado': endereço configurado e servidor no ar.
 * O endereço vem de links/publicacao.json (build) ou, no servidor Gove, de
 * LINKS_PUBLIC_URL (/api/publicacao).
 */
export type AppStatus = 'ok' | 'em-breve' | 'verificando' | 'publicado';
export type Published = { status: AppStatus; url: string };

const TTL = 10 * 60e3;
const cache = new Map<string, { at: number; ok: boolean }>();
const pending = new Map<string, Promise<boolean>>();

/** O servidor responde como Gove Links em /saude? (bloqueio de CSP do artefato = confia no endereço) */
export function checkPublished(url: string, fetchImpl: typeof fetch = fetch, timeoutMs = 6000): Promise<boolean> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL) return Promise.resolve(hit.ok);
  if (pending.has(url)) return pending.get(url)!;
  const target = `${url}/saude`;
  let blocked = false;
  const onCsp = (e: SecurityPolicyViolationEvent) => {
    if (e.blockedURI && target.startsWith(e.blockedURI.replace(/\/+$/, ''))) blocked = true;
  };
  if (typeof document !== 'undefined') document.addEventListener('securitypolicyviolation', onCsp);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const p = fetchImpl(target, { signal: ctrl.signal, cache: 'no-store' })
    .then(async (r) => r.ok && (await r.json().catch(() => null))?.app === 'gove-links')
    // O evento de CSP chega logo depois da rejeição: espera um instante antes de decidir
    .catch(() => new Promise<boolean>((res) => setTimeout(() => res(blocked), 50)))
    .then((ok) => {
      cache.set(url, { at: Date.now(), ok });
      return ok;
    })
    .finally(() => {
      clearTimeout(timer);
      pending.delete(url);
      if (typeof document !== 'undefined') document.removeEventListener('securitypolicyviolation', onCsp);
    });
  pending.set(url, p);
  return p;
}

let serverUrl: Promise<string> | null = null;
/** No servidor Gove, LINKS_PUBLIC_URL vale sobre o arquivo do build. */
function configuredUrl(build: string): Promise<string> {
  serverUrl ??= fetch('/api/publicacao', { credentials: 'same-origin' })
    .then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? r.json() : null))
    .then((j) => String(j?.links ?? ''))
    .catch(() => '');
  return serverUrl.then((u) => (u || build).trim().replace(/\/+$/, ''));
}

const initial = (app: GoveApp | undefined): Published => (!app?.publish ? { status: 'ok', url: '' } : { status: 'verificando', url: '' });

export function useAppStatus(app: GoveApp | undefined): Published {
  const [state, setState] = useState<Published>(() => initial(app));
  useEffect(() => {
    setState(initial(app));
    if (!app?.publish) return;
    let alive = true;
    configuredUrl(app.publish.url).then(async (url) => {
      if (!url) return alive && setState({ status: 'em-breve', url: '' });
      const ok = await checkPublished(url);
      if (alive) setState({ status: ok ? 'publicado' : 'em-breve', url });
    });
    return () => {
      alive = false;
    };
  }, [app]);
  return state;
}

/** Disponível para abrir (apps comuns ou publicados). */
export const isOpen = (s: AppStatus) => s === 'ok' || s === 'publicado';

/** Situação de todos os apps (para listas): id → status. */
export function useStatuses(apps: GoveApp[]): Record<string, AppStatus> {
  const ids = apps.map((a) => a.id).join();
  const [map, setMap] = useState<Record<string, AppStatus>>(() => Object.fromEntries(apps.map((a) => [a.id, initial(a).status])));
  useEffect(() => {
    let alive = true;
    for (const app of apps) {
      if (!app.publish) continue;
      configuredUrl(app.publish.url)
        .then(async (url) => (url && (await checkPublished(url)) ? 'publicado' : 'em-breve'))
        .then((s) => alive && setMap((m) => ({ ...m, [app.id]: s as AppStatus })));
    }
    return () => {
      alive = false;
    };
  }, [ids]);
  return map;
}
