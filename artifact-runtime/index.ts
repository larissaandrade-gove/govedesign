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
 *   do artefato, download comum do navegador. Dentro do artefato nunca há
 *   `<a download>` (o iframe descarta em silêncio): sem a capacidade, `unavailable`.
 * - Tema: claro por padrão, escuro sob demanda; acompanha o Design System.
 *
 * Os apps rodam em iframes da mesma origem (`apps/<id>.html`) dentro do Design
 * System, por isso alcançam o `claude` da página principal (`window.top`/`parent`).
 */

/* ------------------------------------------------------------------ claude */

type AnyFn = (...args: any[]) => any;
type ClaudeLike = { use: (name: string) => Promise<any> };

/**
 * Capacidades do artefato (db, assets, downloads): ligadas por padrão; o build
 * com VITE_GOVE_CAPS=off remove o código de acesso. Fora do artefato (ou sem a
 * capacidade concedida) os apps usam o armazenamento do navegador e o download comum.
 */
// @ts-ignore — substituído pelo Vite em tempo de build
const CAPS_ENABLED = (import.meta as any).env?.VITE_GOVE_CAPS !== 'off';

/** Janela que atendeu uma capacidade: `principal` (topo), `pai` ou `próprio` (o iframe do app). */
export type CapFrame = 'principal' | 'pai' | 'próprio';
type Candidate = { claude: ClaudeLike; win: any; frame: CapFrame };

/**
 * Instâncias do `claude` ao alcance, na ordem página principal (topo) → pai → próprio
 * iframe, sem repetir. As capacidades são declaradas para o artefato e atendidas pela
 * página principal; o iframe do app pode ter um `claude` próprio que não as atende.
 */
function claudeCandidates(): Candidate[] {
  if (!CAPS_ENABLED || typeof window === 'undefined') return [];
  const tryWin = (w: any): ClaudeLike | null => {
    try {
      return w && w.claude && typeof w.claude.use === 'function' ? (w.claude as ClaudeLike) : null;
    } catch {
      return null; // outra origem
    }
  };
  const out: Candidate[] = [];
  const add = (w: any, frame: CapFrame) => {
    if (!w || out.some((c) => c.win === w)) return;
    const claude = tryWin(w);
    if (claude && !out.some((c) => c.claude === claude)) out.push({ claude, win: w, frame });
  };
  let top: any = null;
  let parent: any = null;
  try {
    top = window.top;
    parent = window.parent;
  } catch {
    /* ignora */
  }
  add(top, 'principal');
  add(parent, 'pai');
  add(window, 'próprio');
  return out;
}

function findClaude(): ClaudeLike | null {
  return claudeCandidates()[0]?.claude ?? null;
}

/** Capacidade resolvida: o objeto, a janela do `claude` que a atendeu e as tentativas feitas. */
type CapHit = { value: any; win: any; frame: CapFrame };
type CapLookup = { hit: CapHit | null; attempts: string[] };

const capCache = new Map<string, Promise<CapLookup>>();
/**
 * Procura a capacidade em cada candidato (topo → pai → próprio) e fica com o primeiro
 * cujo `use(name)` não devolve `null`. Só o resultado positivo fica guardado: um `null`
 * (ou o limite de 12 s numa primeira carga lenta) é tentado de novo no próximo pedido,
 * para uma lentidão passageira não desligar a capacidade pelo resto da sessão.
 */
function lookupCapability(name: string): Promise<CapLookup> {
  if (!capCache.has(name)) {
    const cands = claudeCandidates();
    if (!cands.length) return Promise.resolve({ hit: null, attempts: [] });
    const p: Promise<CapLookup> = (async () => {
      const attempts: string[] = [];
      for (const c of cands) {
        let v: any = null;
        try {
          v = await Promise.race([Promise.resolve(c.claude.use(name)).catch(() => null), new Promise((r) => setTimeout(() => r(null), 12000))]);
        } catch {
          v = null;
        }
        if (v != null) {
          attempts.push(`${c.frame}:ok`);
          return { hit: { value: v, win: c.win, frame: c.frame }, attempts };
        }
        attempts.push(`${c.frame}:null`);
      }
      return { hit: null, attempts };
    })().then((r) => {
      if (!r.hit && capCache.get(name) === p) capCache.delete(name);
      return r;
    });
    capCache.set(name, p);
  }
  return capCache.get(name)!;
}

/** Resolve uma capacidade do artefato, ou `null` (fora do artefato, não concedida…). */
export function capability<T = any>(name: string): Promise<T | null> {
  return lookupCapability(name).then((r) => (r.hit?.value ?? null) as T | null);
}

/**
 * Recria os dados no "mundo" JavaScript da janela `win` (o `claude` de outra janela
 * confere `data instanceof Blob` com o `Blob` dela e recusa um Blob deste iframe).
 */
async function inRealm<T extends Blob | string>(win: any, data: T): Promise<T> {
  if (typeof data === 'string' || !win || win === (typeof window !== 'undefined' ? window : null)) return data;
  try {
    const B: any = win.Blob; // construtor de outra janela
    const blob = data as Blob;
    if (typeof B !== 'function' || blob instanceof B) return data;
    return new B([await blob.arrayBuffer()], { type: blob.type }) as T;
  } catch {
    return data;
  }
}

export const insideArtifact = () => findClaude() !== null;

// Regra para os apps: dentro do artefato, a política de segurança do claude.ai
// (connect-src) bloqueia `fetch()` de URLs `data:` e `blob:` com "Failed to fetch".
// Arquivos embutidos ou gerados no navegador devem ser decodificados localmente
// (ex.: dataUrlToBlob em print-studio/web/src/lib/pdf.browser.ts), nunca buscados.

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
  // Ids que já estiveram no db compartilhado. Um documento local fora dessa lista foi
  // criado só neste navegador (antes de o db estar disponível) e precisa subir para
  // o db; um que está na lista e sumiu do db foi apagado por outra pessoa.
  const syncedKey = `${lsKey}:sincronizados`;
  let synced = new Set<string>();
  try {
    synced = new Set(JSON.parse(safeLS.get(syncedKey) ?? '[]') as string[]);
  } catch {
    /* ignora */
  }
  const pendingUp = new Map<string, T>();
  const saveSynced = () => safeLS.set(syncedKey, JSON.stringify([...synced]));
  let mode: 'db' | 'local' | 'pending' = 'pending';
  let dbCol: any = null;
  const listeners = new Set<Listener<T>>();
  const snapshot = () => [...cache.values()];
  const emit = () => {
    const docs = snapshot();
    safeLS.set(lsKey, JSON.stringify(docs));
    listeners.forEach((l) => l(docs));
  };
  const upload = (doc: T) => {
    const { id, ...data } = doc;
    return dbCol.doc(safeId(id)).set(JSON.parse(JSON.stringify(data)));
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
            if (first) {
              // Na primeira leitura, cadastros feitos só neste navegador não podem sumir:
              // ficam na lista e sobem para o db compartilhado.
              for (const [id, doc] of cache) if (!next.has(id) && !synced.has(id)) pendingUp.set(id, doc);
            }
            // Enquanto o envio não aparece no db, o documento local continua na lista.
            for (const [id, doc] of pendingUp) {
              if (next.has(id)) pendingUp.delete(id);
              else next.set(id, doc);
            }
            for (const id of next.keys()) if (!pendingUp.has(id)) synced.add(id);
            saveSynced();
            cache = next;
            mode = 'db';
            emit();
            if (first) {
              first = false;
              for (const doc of [...pendingUp.values()]) upload(doc).catch(() => undefined);
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
        await upload(doc);
        synced.add(doc.id);
        saveSynced();
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
  const { hit } = await lookupCapability('assets');
  const assets = hit?.value;
  if (assets) {
    try {
      const r = await assets.upload(await inRealm(hit!.win, blob));
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

/**
 * Resultado de um download, já traduzido dos códigos da capacidade `downloads`:
 * - `saved`: a pessoa aceitou a janela do claude.ai (ou, fora do artefato, o navegador recebeu o arquivo);
 * - `declined`: a pessoa recusou ou deixou a janela expirar (não tentar de novo sozinho);
 * - `rate_limited`: já há uma janela de download aberta, ou muitas seguidas: esperar e tentar de novo;
 * - `unavailable`: downloads indisponíveis nesta visualização (inclui `not_granted`, `capability_*`,
 *   `extension_not_enabled`, códigos desconhecidos e a capacidade ausente dentro do artefato);
 * - `too_large`: arquivo acima do limite;
 * - `error`: pedido inválido (`bad_request`, `rejected_extension`…) ou falha do navegador.
 */
export type SaveOutcome = 'saved' | 'declined' | 'rate_limited' | 'unavailable' | 'too_large' | 'error';
/** Forma usada: `capacidade` (janela do claude.ai), `navegador` (`<a download>` fora do artefato). */
export type SaveMethod = 'capacidade' | 'navegador';
/**
 * Janela que fez o download: a página principal, a janela pai, o próprio iframe do app,
 * a `ponte` (postMessage para o Design System) ou o `navegador` (fora do artefato).
 */
export type SaveFrame = CapFrame | 'ponte' | 'navegador';
/** `attempts`: cada tentativa, `janela:código` (ex.: `principal:null`, `pai:saved`), para o diagnóstico. */
export type SaveResult = { outcome: SaveOutcome; code: string; method: SaveMethod; frame?: SaveFrame; attempts?: string[] };

const UNAVAILABLE_CODES = new Set(['unavailable', 'not_granted', 'capability_disabled', 'capability_removed', 'extension_not_enabled']);
const ERROR_CODES = new Set(['rejected_extension', 'bad_request', 'transform_error', 'request_unknown', 'not_signed']);

function outcomeOf(code: string): SaveOutcome {
  if (code === 'declined' || code === 'rate_limited' || code === 'too_large') return code;
  if (ERROR_CODES.has(code)) return 'error';
  return 'unavailable'; // inclui UNAVAILABLE_CODES e códigos desconhecidos (regra do contrato)
}

/* Ponte com o Design System: quando nenhum `claude` ao alcance atende `downloads`, o app
 * manda os bytes por postMessage à janela pai (o Design System), que faz o download com
 * o próprio `claude` e responde. Mensagens:
 *   app → DS  { type: 'gove:download', id, filename, mime, buffer }
 *   DS → app  { type: 'gove:download:ack', id }       (logo ao receber)
 *   DS → app  { type: 'gove:download:result', id, outcome, code, method: 'ponte' }
 */
export const BRIDGE_ACK_MS = 2000;
export const BRIDGE_RESULT_MS = 120000;
const SAVE_OUTCOMES = new Set<SaveOutcome>(['saved', 'declined', 'rate_limited', 'unavailable', 'too_large', 'error']);

async function saveViaBridge(filename: string, data: Blob | string): Promise<{ outcome: SaveOutcome; code: string } | null> {
  let parent: any = null;
  try {
    parent = window.parent;
  } catch {
    return null;
  }
  if (!parent || parent === window || typeof parent.postMessage !== 'function' || typeof window.addEventListener !== 'function') return null;
  const blob = typeof data === 'string' ? new Blob([data], { type: 'text/plain;charset=utf-8' }) : data;
  let buffer: ArrayBuffer;
  try {
    buffer = await blob.arrayBuffer();
  } catch {
    return { outcome: 'error', code: 'ponte_dados_ilegiveis' };
  }
  const id = newId('dl-');
  return new Promise((resolve) => {
    let ackTimer: any = null;
    let resultTimer: any = null;
    const done = (r: { outcome: SaveOutcome; code: string }) => {
      clearTimeout(ackTimer);
      clearTimeout(resultTimer);
      window.removeEventListener('message', onMessage);
      resolve(r);
    };
    const onMessage = (e: MessageEvent) => {
      const m = e.data;
      if (e.source !== parent || !m || typeof m !== 'object' || m.id !== id) return;
      if (m.type === 'gove:download:ack') {
        clearTimeout(ackTimer);
        // A pessoa tem até 2 minutos para responder à janela do claude.ai
        resultTimer = setTimeout(() => done({ outcome: 'declined', code: 'ponte_tempo_esgotado' }), BRIDGE_RESULT_MS);
      } else if (m.type === 'gove:download:result') {
        const outcome = SAVE_OUTCOMES.has(m.outcome) ? (m.outcome as SaveOutcome) : 'error';
        done({ outcome, code: typeof m.code === 'string' ? m.code : outcome });
      }
    };
    window.addEventListener('message', onMessage);
    ackTimer = setTimeout(() => done({ outcome: 'unavailable', code: 'ponte_sem_resposta' }), BRIDGE_ACK_MS);
    try {
      const origin = window.location?.origin;
      const msg = { type: 'gove:download', id, filename, mime: blob.type, buffer };
      parent.postMessage(msg, origin && origin !== 'null' ? origin : '*', [buffer]);
    } catch {
      done({ outcome: 'unavailable', code: 'ponte_falhou' });
    }
  });
}

/**
 * Entrega um arquivo gerado ao visitante e diz o que de fato aconteceu.
 * Dentro do artefato só a capacidade `downloads` funciona: o app roda num iframe
 * sem permissão de download, e um `<a download>` ali é descartado em silêncio pelo
 * navegador. A capacidade é procurada na página principal, na janela pai e no próprio
 * iframe; sem nenhuma, tenta a ponte com o Design System. Se nada funcionar, devolve
 * `unavailable` em vez de um falso `saved`.
 */
export async function saveFileDetailed(filename: string, data: Blob | string): Promise<SaveResult> {
  const { hit, attempts } = await lookupCapability('downloads');
  if (hit) {
    const frame = hit.frame;
    try {
      const r = await hit.value.save({ filename, data: await inRealm(hit.win, data) });
      const code = String(r?.status ?? 'saved');
      return { outcome: 'saved', code, method: 'capacidade', frame, attempts: [...attempts, `${frame}:${code}`] };
    } catch (e: any) {
      const code = typeof e?.code === 'string' ? e.code : 'erro_sem_codigo';
      if (UNAVAILABLE_CODES.has(code)) capCache.delete('downloads'); // na próxima tentativa, pergunta de novo
      return { outcome: code === 'erro_sem_codigo' ? 'error' : outcomeOf(code), code, method: 'capacidade', frame, attempts: [...attempts, `${frame}:${code}`] };
    }
  }
  if (insideArtifact()) {
    const b = await saveViaBridge(filename, data);
    if (b) return { ...b, method: 'capacidade', frame: 'ponte', attempts: [...attempts, `ponte:${b.code}`] };
    return { outcome: 'unavailable', code: 'sem_capacidade', method: 'capacidade', attempts };
  }
  // Fora do artefato: download comum do navegador
  try {
    const blob = typeof data === 'string' ? new Blob([data], { type: 'text/plain;charset=utf-8' }) : data;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    return { outcome: 'saved', code: 'saved', method: 'navegador', frame: 'navegador', attempts: ['navegador:saved'] };
  } catch {
    return { outcome: 'error', code: 'falha_navegador', method: 'navegador', frame: 'navegador', attempts: ['navegador:falha_navegador'] };
  }
}

/** Entrega um arquivo gerado ao visitante (confirmação do claude.ai dentro do artefato). */
export async function saveFile(filename: string, data: Blob | string): Promise<SaveOutcome> {
  return (await saveFileDetailed(filename, data)).outcome;
}

/** Mensagem curta, em português, para cada resultado diferente de `saved` (null para `saved`). */
export function saveOutcomeText(outcome: SaveOutcome): string | null {
  switch (outcome) {
    case 'saved':
      return null;
    case 'declined':
      return 'Download cancelado: a janela de confirmação do claude.ai foi recusada ou expirou.';
    case 'rate_limited':
      return 'Já há uma janela de download aberta. Confirme ou feche essa janela e tente de novo.';
    case 'unavailable':
      return 'Downloads indisponíveis nesta visualização. Recarregue a página ou abra o artefato pelo claude.ai no navegador.';
    case 'too_large':
      return 'O arquivo é grande demais para baixar por aqui.';
    default:
      return 'Não foi possível baixar o arquivo.';
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
  el.dataset['theme'] = t;
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
