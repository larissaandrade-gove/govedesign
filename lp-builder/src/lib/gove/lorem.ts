/** Texto lorem ipsum padrão (~300 caracteres) usado em novos blocos de parágrafo. */
export const LOREM_300 =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse.";

const NEEDLES = ["lorem ipsum", "dolor sit amet", "consectetur adipiscing"];

/** Detecta se o conteúdo ainda é o placeholder lorem ipsum. */
export function isLorem(content: string): boolean {
  const text = (content || "").toLowerCase();
  return NEEDLES.some((n) => text.includes(n));
}
