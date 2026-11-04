// Cliente do Grafana com a sessão de cada pessoa (conector "Gove Grafana").
//
// O login usa o usuário e a senha do próprio Grafana: o servidor envia os dois para
// GRAFANA_URL/login, guarda só o cookie de sessão devolvido (grafana_session) e
// confere a pessoa em /api/user. A senha nunca é guardada nem registrada em log.
// Toda consulta depois disso usa o cookie da pessoa, então as permissões do Grafana
// valem para o conector: quem não vê um dashboard lá também não o vê aqui.
//
// O Grafana renova (rotaciona) o cookie de sessão de tempos em tempos. Quando uma
// resposta traz um cookie novo, `onRotate` recebe o valor para ser guardado; diante de
// um 401, o cliente tenta a renovação (/api/user/auth-tokens/rotate) uma vez.

export class GrafanaError extends Error {
  /**
   * @param {'invalid_credentials'|'unauthorized'|'forbidden'|'not_found'|'timeout'|'unavailable'|'bad_response'} kind
   */
  constructor(kind, status = 0, message = kind) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;

/** Valor do cookie `name` nas respostas (Set-Cookie). Valor vazio (cookie apagado) conta como ausente. */
function cookieFrom(res, name) {
  const list = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
  for (const line of list) {
    const first = String(line).split(';')[0];
    const i = first.indexOf('=');
    if (i > 0 && first.slice(0, i).trim() === name) {
      const value = first.slice(i + 1).trim();
      return value || null;
    }
  }
  return null;
}

const kindOf = (status) => (status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : status === 404 ? 'not_found' : status >= 500 ? 'unavailable' : 'bad_response');

export function createGrafanaClient({ baseUrl, cookieName = 'grafana_session', fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const base = String(baseUrl ?? '').replace(/\/+$/, '');

  async function send(path, { method = 'GET', body, cookie } = {}) {
    const headers = { accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (cookie) headers.cookie = `${cookieName}=${cookie}`;
    try {
      return await fetchImpl(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
    } catch (err) {
      if (err?.name === 'TimeoutError' || err?.name === 'AbortError') throw new GrafanaError('timeout', 0, 'O Grafana demorou demais para responder.');
      throw new GrafanaError('unavailable', 0, 'Grafana inacessível a partir do servidor.');
    }
  }

  async function json(res) {
    try {
      return await res.json();
    } catch {
      throw new GrafanaError('bad_response', res.status, 'Resposta inesperada do Grafana.');
    }
  }

  /**
   * Login com usuário e senha do Grafana. Devolve só o cookie de sessão e a identidade.
   * Usuário inexistente e senha errada dão o mesmo erro (`invalid_credentials`).
   */
  async function login(user, password) {
    const res = await send('/login', { method: 'POST', body: { user, password } });
    if (res.status >= 500) throw new GrafanaError('unavailable', res.status, 'O Grafana não respondeu ao login.');
    if (!res.ok) {
      await res.body?.cancel().catch(() => {});
      throw new GrafanaError('invalid_credentials', res.status, 'Usuário ou senha inválidos.');
    }
    await res.body?.cancel().catch(() => {});
    const cookie = cookieFrom(res, cookieName);
    if (!cookie) throw new GrafanaError('bad_response', res.status, `O Grafana não devolveu o cookie de sessão (${cookieName}).`);
    const s = session(cookie);
    const me = await s.get('/api/user');
    if (!me?.login) throw new GrafanaError('bad_response', 200, 'O Grafana não confirmou o usuário.');
    return { cookie: s.cookie(), login: String(me.login), userId: me.id ?? null };
  }

  /** Consultas com a sessão de uma pessoa. */
  function session(initialCookie, onRotate = () => {}) {
    let current = initialCookie;
    const track = async (res) => {
      const next = cookieFrom(res, cookieName);
      if (next && next !== current) {
        current = next;
        await onRotate(next);
      }
    };

    async function rotate() {
      const res = await send('/api/user/auth-tokens/rotate', { method: 'POST', body: {}, cookie: current });
      await res.body?.cancel().catch(() => {});
      if (!res.ok) return false;
      const before = current;
      await track(res);
      return current !== before;
    }

    async function request(path, init = {}, retried = false) {
      const res = await send(path, { ...init, cookie: current });
      await track(res);
      if (res.status === 401 && !retried) {
        await res.body?.cancel().catch(() => {});
        if (await rotate()) return request(path, init, true);
        throw new GrafanaError('unauthorized', 401, 'Sessão do Grafana expirada.');
      }
      if (res.status >= 300 && res.status < 400) {
        await res.body?.cancel().catch(() => {});
        throw new GrafanaError('unauthorized', res.status, 'Sessão do Grafana expirada.');
      }
      if (!res.ok && !init.allowStatus?.includes(res.status)) {
        await res.body?.cancel().catch(() => {});
        throw new GrafanaError(kindOf(res.status), res.status, `Grafana respondeu ${res.status}.`);
      }
      return { status: res.status, data: await json(res) };
    }

    return {
      cookie: () => current,
      get: async (path, query) => (await request(query ? `${path}?${new URLSearchParams(query)}` : path)).data,
      /** POST que aceita respostas parciais do Grafana (ex.: /api/ds/query devolve 207/400 com erros por consulta). */
      post: (path, body, allowStatus = []) => request(path, { method: 'POST', body, allowStatus }),
    };
  }

  return { baseUrl: base, login, session };
}
