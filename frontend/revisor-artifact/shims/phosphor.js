// `@phosphor-icons/core` → só os nomes (metadados usados por backend/lib/icons.js).
import { iconData } from './vfs.js';

export const icons = iconData().phosphorNames.map((name) => ({ name }));
export default { icons };
