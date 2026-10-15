/** Stub de `@tanstack/react-start` para o build 100% cliente do artefato. */
export function useServerFn<T extends (...args: any[]) => any>(fn: T): T {
  return fn;
}
export function createServerFn(): never {
  throw new Error("Funções de servidor não existem no build do artefato.");
}
