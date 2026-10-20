// Acesso só pela VPN Gove (Pritunl, organização gove-ecs): com ALLOWED_NETWORKS
// definido (faixas CIDR da VPN, separadas por vírgula), qualquer pedido vindo
// de fora dessas faixas recebe 403 antes mesmo da tela de login. Atrás de um
// proxy/balanceador, defina TRUST_PROXY para ler o IP real do cliente.
import { BlockList, isIP } from 'node:net';

export function parseNetworks(raw) {
  const list = new BlockList();
  let count = 0;
  for (const item of String(raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)) {
    const [addr, bits] = item.split('/');
    const family = isIP(addr);
    if (!family) throw new Error(`ALLOWED_NETWORKS: endereço inválido "${item}"`);
    const type = family === 6 ? 'ipv6' : 'ipv4';
    if (bits === undefined) list.addAddress(addr, type);
    else list.addSubnet(addr, Number(bits), type);
    count++;
  }
  return count ? list : null;
}

/** IP do cliente normalizado (IPv4 mapeado em IPv6 vira IPv4). */
const clientIp = (req) => String(req.ip ?? req.socket?.remoteAddress ?? '').replace(/^::ffff:/, '');

const PAGE = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Conecte-se à VPN — Gove</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#20133D;color:#fff;font:17px/1.5 Inter,Arial,sans-serif}
main{max-width:420px;padding:32px 24px;text-align:center}h1{font:800 26px/1.2 Montserrat,Arial,sans-serif;margin:0 0 12px}p{margin:0;color:#E9E1F7}</style></head>
<body><main><h1>Conecte-se à VPN Gove</h1><p>O Design System só abre pela VPN da Gove (gove-ecs). Conecte no Pritunl e recarregue a página.</p></main></body></html>`;

/** Middleware: deixa passar só quem vem das redes liberadas (sem lista, libera tudo). */
export function networkGate(networks = parseNetworks(process.env.ALLOWED_NETWORKS)) {
  return (req, res, next) => {
    if (!networks) return next();
    const ip = clientIp(req);
    const family = isIP(ip);
    if (family && networks.check(ip, family === 6 ? 'ipv6' : 'ipv4')) return next();
    const wantsHtml = (req.headers.accept ?? '').includes('text/html');
    return wantsHtml ? res.status(403).type('html').send(PAGE) : res.status(403).json({ error: 'Conecte-se à VPN Gove para acessar.' });
  };
}
