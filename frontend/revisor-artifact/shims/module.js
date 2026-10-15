// node:module — createRequire().resolve aponta para o sistema de arquivos virtual.
import { VROOT } from './vfs.js';

export function createRequire() {
  const req = () => {
    throw new Error('require() indisponível no navegador.');
  };
  req.resolve = (id) => `${VROOT}/${id}`;
  return req;
}
export default { createRequire };
