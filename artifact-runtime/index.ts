/**
 * Camada de execução compartilhada pelos apps Gove quando rodam dentro do
 * artefato do Design System (claude.ai) — e também fora dele.
 *
 * - Dados: coleções de documentos JSON. Dentro do artefato usam a capacidade
 *   `db` (compartilhada entre quem abre o artefato); fora dele, ou quando a
 *   capacidade não está disponível, ficam no localStorage do navegador.
 *   Leitura síncrona a partir de um cache local; escrita assíncrona.
 * - Arquivos (logos, imagens): capacidade `assets` quando disponível; senão
 *   IndexedDB do navegador.
 * - Downloads: capacidade `downloads` (o visitante confirma o arquivo); fora
 *   do artefato, download comum do navegador.
 * - Tema: claro por padrão, escuro sob demanda; acompanha o Design System.
 *
 * Os apps rodam em iframes `srcdoc` do mesmo documento, por isso alcançam
 * `window.parent.claude`.
 */

/* ------------------------------------------------------------------ claude */

type AnyFn = (...args: any[]) => any;
type ClaudeLike = { use: (name: string) => Promise<any> };

/**
 * Capacidades do artefato (db, assets, downloads) ligadas só no build com
 * VITE_GOVE_CAPS=on. Desligadas, o código de acesso some do bundle e os apps
 * usam o armazenamento do navegador e o download comum.
 */
// @ts-ignore — substituído pelo Vite em tempo de build
const CAPS_ENABLED = import.meta.env.VITE_GOVE_CAPS === 'on';

function findClaude(): ClaudeLike | null {
  if (!CAPS_ENABLED) return null;
  const tryWin = (w: any): ClaudeLike | null => {
    try {
      return w && w.claude && typeof w.claude.use === 'function' ? (w.claude as ClaudeLike) : null;
    } catch {
      return null; // outra origem
    }
  };
  if (typeof window === 'undefined') return null;
  return tryWin(window) ?? (window.parent !== window ? tryWin(window.parent) : null) ?? (window.top !== window ? tryWin(window.top) : null);
}

const capCache = new Map<string, Promise<any>>();
/** Resolve uma capacidade do artefato, ou `null` (fora do artefato, não concedida…). */
export function capability<T = any>(name: string): Promise<T | null> {
  if (!capCache.has(name)) {
    const c = findClaude();
    const p = c
      ? Promise.race([
          c.use(name).catch(() => null),
          new Promise((r) => setTimeout(() => r(null), 12000)),
        ])
      : Promise.resolve(null);
    capCache.set(name, p);
  }
  return capCache.get(name)! as Promise<T | null>;
}

export const insideArtifact = () => findClaude() !== null;

/* ------------------------------------------------------------------- store */

export type Doc = Record<string, unknown> & { id: string };
type Listener<T> = (docs: T[]) => void;

const safeLS = {
  get(k: string): string | null {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* armazenamento indisponível ou cheio */
    }
  },
};

const SEG = /[^A-Za-z0-9_\-.~:@+]/g;
export const safeId = (s: string) => s.replace(SEG, '-').slice(0, 180) || 'x';

export function newId(prefix = ''): string {
  const r = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return prefix + r;
}

export type Collection<T extends Doc = Doc> = {
  /** Promessa resolvida após a primeira leitura definitiva (db ou local). */
  ready: Promise<void>;
  /** 'db' = compartilhado no artefato; 'local' = só neste navegador. */
  mode: () => 'db' | 'local' | 'pending';
  all: () => T[];
  get: (id: string) => T | undefined;
  set: (doc: T) => Promise<void>;
  remove: (id: string) => Promise<void>;
  subscribe: (fn: Listener<T>) => () => void;
};

const collections = new Map<string, Collection<any>>();

/**
 * Coleção `name` do app `app`. Caminho no db: `apps/<app>/<name>/<id>`.
 * Documentos devem ter até ~200 KB (limite do db: 256 KiB).
 */
export function collection<T extends Doc = Doc>(app: string, name: string): Collection<T> {
  const key = `${app}/${name}`;
  if (collections.has(key)) return collections.get(key)!;

  const lsKey = `gove:${app}:${name}`;
  let cache = new Map<string, T>();
  try {
    const raw = safeLS.get(lsKey);
    if (raw) for (const d of JSON.parse(raw) as T[]) cache.set(d.id, d);
  } catch {
    /* ignora cache corrompido */
  }
  let mode: 'db' | 'local' | 'pending' = 'pending';
  let dbCol: any = null;
  const listeners = new Set<Listener<T>>();
  const snapshot = () => [...cache.values()];
  const emit = () => {
    const docs = snapshot();
    safeLS.set(lsKey, JSON.stringify(docs));
    listeners.forEach((l) => l(docs));
  };

  const ready = (async () => {
    const db = await capability('db');
    if (!db) {
      mode = 'local';
      return;
    }
    try {
      dbCol = db.collection(`apps/${safeId(app)}/${safeId(name)}`);
      await new Promise<void>((resolve) => {
        let first = true;
        dbCol.onSnapshot(
          (snap: any) => {
            if (snap.metadata?.fromCache && first && snap.empty) return; // espera a leitura definitiva
            const next = new Map<string, T>();
            for (const d of snap.docs) next.set(d.id, { ...(d.data() as object), id: d.id } as T);
            cache = next;
            mode = 'db';
            emit();
            if (first) {
              first = false;
              resolve();
            }
          },
          () => {
            if (first) {
              first = false;
              mode = 'local';
              dbCol = null;
              resolve();
            }
          },
        );
        setTimeout(() => {
          if (first) {
            first = false;
            resolve();
          }
        }, 8000);
      });
      if (mode === 'pending') mode = 'db';
    } catch {
      mode = 'local';
      dbCol = null;
    }
  })();

  const col: Collection<T> = {
    ready,
    mode: () => mode,
    all: snapshot,
    get: (id) => cache.get(id),
    async set(doc) {
      cache.set(doc.id, doc);
      emit();
      if (dbCol) {
        const { id, ...data } = doc;
        await dbCol.doc(safeId(id)).set(JSON.parse(JSON.stringify(data)));
      }
    },
    async remove(id) {
      cache.delete(id);
      emit();
      if (dbCol) await dbCol.doc(safeId(id)).delete();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
  collections.set(key, col);
  return col;
}

/* ------------------------------------------------------------------- files */

const IDB_NAME = 'gove-files';
function idb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('files');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
const memFiles = new Map<string, Blob>();

export type StoredFile = { id: string; url: string };

/** Guarda um arquivo e devolve um id durável + uma URL para exibir. */
export async function putFile(blob: Blob): Promise<StoredFile> {
  const assets = await capability('assets');
  if (assets) {
    try {
      const r = await assets.upload(blob);
      return { id: `asset:${r.id}`, url: r.url };
    } catch {
      /* cai para o armazenamento local */
    }
  }
  const id = newId('local:');
  memFiles.set(id, blob);
  const db = await idb();
  if (db) {
    await new Promise<void>((res) => {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').put(blob, id);
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  }
  return { id, url: URL.createObjectURL(blob) };
}

const urlCache = new Map<string, string>();
/** URL exibível para um id salvo por `putFile` (ou null se o arquivo não estiver neste navegador). */
export async function fileUrl(id: string): Promise<string | null> {
  if (CAPS_ENABLED && id.startsWith('asset:')) return '/_blob/' + id.slice(6);
  if (urlCache.has(id)) return urlCache.get(id)!;
  const blob = await getFile(id);
  if (!blob) return null;
  const u = URL.createObjectURL(blob);
  urlCache.set(id, u);
  return u;
}

/** Conteúdo de um arquivo salvo por `putFile`. */
export async function getFile(id: string): Promise<Blob | null> {
  if (CAPS_ENABLED && id.startsWith('asset:')) {
    try {
      const r = await fetch('/_blob/' + id.slice(6));
      return r.ok ? await r.blob() : null;
    } catch {
      return null;
    }
  }
  if (memFiles.has(id)) return memFiles.get(id)!;
  const db = await idb();
  if (!db) return null;
  return new Promise((res) => {
    const req = db.transaction('files').objectStore('files').get(id);
    req.onsuccess = () => res((req.result as Blob) ?? null);
    req.onerror = () => res(null);
  });
}

export async function deleteFile(id: string): Promise<void> {
  if (CAPS_ENABLED && id.startsWith('asset:')) {
    const assets = await capability('assets');
    try {
      await assets?.delete(id.slice(6));
    } catch {
      /* sem permissão: mantém o arquivo */
    }
    return;
  }
  memFiles.delete(id);
  const db = await idb();
  if (db) db.transaction('files', 'readwrite').objectStore('files').delete(id);
}

/* --------------------------------------------------------------- downloads */

export type SaveOutcome = 'saved' | 'declined' | 'error';

/** Entrega um arquivo gerado ao visitante (confirmação do claude.ai dentro do artefato). */
export async function saveFile(filename: string, data: Blob | string): Promise<SaveOutcome> {
  const downloads = await capability('downloads');
  if (downloads) {
    try {
      await downloads.save({ filename, data });
      return 'saved';
    } catch (e: any) {
      return e?.code === 'declined' ? 'declined' : 'error';
    }
  }
  // Sem a capacidade (fora do artefato, ou artefato publicado sem ela): download comum do navegador
  try {
    const blob = typeof data === 'string' ? new Blob([data], { type: 'text/plain;charset=utf-8' }) : data;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return 'saved';
  } catch {
    return 'error';
  }
}

/** Abre um link externo (o artefato bloqueia `window.open` em alguns hosts). */
export function openExternal(url: string) {
  try {
    // Sem 'noopener' (com ele window.open sempre devolve null e abriríamos duas abas)
    const w = (window.top ?? window).open(url, '_blank');
    if (w) {
      w.opener = null;
      return;
    }
  } catch {
    /* ignora */
  }
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* ------------------------------------------------------------------- theme */

export type Theme = 'light' | 'dark';
const THEME_KEY = 'gove-theme';

function parentTheme(): Theme | null {
  try {
    if (window.parent !== window) {
      // O Design System usa data-gove-theme (data-theme pode ser definido pelo host do artefato)
      const ds = window.parent.document.documentElement.dataset;
      const t = ds['goveTheme'] ?? ds['theme'];
      if (t === 'light' || t === 'dark') return t;
    }
  } catch {
    /* outra origem */
  }
  return null;
}

export function currentTheme(): Theme {
  const p = parentTheme();
  if (p) return p;
  const s = safeLS.get(THEME_KEY);
  return s === 'dark' ? 'dark' : 'light';
}

function applyTheme(t: Theme) {
  const el = document.documentElement;
  el.dataset.theme = t;
  el.classList.toggle('dark', t === 'dark');
  el.style.colorScheme = t;
}

/**
 * Aplica o tema (claro por padrão) e acompanha o Design System quando o app
 * roda num iframe dele. Chame uma vez, antes de renderizar.
 */
export function syncTheme(onChange?: (t: Theme) => void): () => void {
  applyTheme(currentTheme());
  let obs: MutationObserver | null = null;
  try {
    if (window.parent !== window) {
      obs = new MutationObserver(() => {
        const t = currentTheme();
        applyTheme(t);
        onChange?.(t);
      });
      obs.observe(window.parent.document.documentElement, { attributes: true, attributeFilter: ['data-gove-theme', 'data-theme'] });
    }
  } catch {
    obs = null;
  }
  return () => obs?.disconnect();
}

/** Troca o tema quando o app roda sozinho (fora do Design System). */
export function setStandaloneTheme(t: Theme) {
  safeLS.set(THEME_KEY, t);
  applyTheme(t);
}

export const isEmbedded = () => {
  try {
    return window.parent !== window && !!window.parent.document;
  } catch {
    return false;
  }
};

export type { AnyFn };
