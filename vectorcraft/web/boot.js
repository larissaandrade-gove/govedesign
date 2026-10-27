// Carrega o VectorCraft (WebAssembly) servido ao lado desta página, em vectorcraft/.
// O .wasm vem em gzip, dividido em partes (limite de 15 MB por arquivo do artefato):
// as partes são baixadas em paralelo, juntadas e descompactadas no navegador.
import { started } from './main.js';

const loading = document.getElementById('vectorcraft_loading');
const base = new URL('./vectorcraft/', location.href);

function progress(text) {
  if (loading) loading.textContent = text;
}

async function wasmBytes() {
  const manifest = await (await fetch(new URL('parts.json', base))).json();
  let done = 0;
  const parts = await Promise.all(
    manifest.parts.map(async (name) => {
      const r = await fetch(new URL(name, base));
      if (!r.ok) throw new Error(`${name}: ${r.status}`);
      const buf = await r.arrayBuffer();
      done += buf.byteLength;
      progress(`Carregando o VectorCraft… ${Math.round((done / manifest.gzipBytes) * 100)}%`);
      return buf;
    }),
  );
  progress('Preparando o editor…');
  const gz = new Blob(parts).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(gz).arrayBuffer();
}

try {
  // Endereço montado em tempo de execução: o empacotador deixa o editor fora do bundle
  const [{ default: init }, bytes] = await Promise.all([import(new URL(`vectorcraft-web.js`, base).href), wasmBytes()]);
  await init({ module_or_path: bytes });
  started();
} catch (e) {
  console.error(e);
  if (loading) {
    loading.replaceChildren(
      Object.assign(document.createElement('strong'), { textContent: 'O VectorCraft não abriu neste navegador.' }),
      Object.assign(document.createElement('span'), {
        textContent: 'Ele precisa de WebAssembly e WebGPU ou WebGL2. Abra no Chrome, Edge ou Safari atualizados, ou rode `npm run vectorcraft` nesta máquina.',
      }),
    );
  }
}
