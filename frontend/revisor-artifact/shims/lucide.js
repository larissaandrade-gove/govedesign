// `lucide` → índice embutido (só os <path>, que é o que backend/lib/icons.js usa).
import { iconData } from './vfs.js';

export const icons = Object.fromEntries(Object.entries(iconData().lucide).map(([k, ds]) => [k, ds.map((d) => ['path', { d }])]));
export default { icons };
