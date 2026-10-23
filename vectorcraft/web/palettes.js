// Amostras de impressão para o VectorCraft: as mesmas cores (HEX + CMYK) que o
// Print Studio usa nos PDFs de gráfica (print-studio/shared/tokens.js).
import { COLORS } from '../../print-studio/shared/tokens.js';

const pick = (keys) => keys.map((k) => ({ key: k, name: COLORS[k].name, hex: COLORS[k].hex, cmyk: COLORS[k].cmyk }));

export const PALETTES = {
  gove: {
    id: 'gove',
    label: 'GOVE',
    group: 'GOVE · impressão',
    colors: pick(['roxoGove', 'amareloGove', 'azulLink', 'grafite', 'cinzaTexto', 'cinzaClaro', 'branco', 'preto', 'pretoRico', 'whatsapp', 'folhaClara', 'folhaMedia', 'verdeProfundo']),
  },
  bb: {
    id: 'bb',
    label: 'Banco do Brasil',
    group: 'Banco do Brasil · impressão',
    colors: pick(Object.keys(COLORS).filter((k) => k.startsWith('bb'))),
  },
};

/** QR code: sempre preto #000000 (K100) sobre branco #FFFFFF, em qualquer identidade. */
export const QR = { dark: COLORS.qrPreto, light: COLORS.branco };
