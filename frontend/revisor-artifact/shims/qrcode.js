// `qrcode` no navegador: o build "browser" do pacote não tem toBuffer.
import QR from 'qrcode/lib/browser.js';
import { Buffer } from 'buffer';

export const { create, toCanvas, toDataURL, toString } = QR;
export async function toBuffer(text, opts = {}) {
  const url = await QR.toDataURL(text, { ...opts, type: 'image/png' });
  return Buffer.from(url.split(',')[1], 'base64');
}
export default { ...QR, toBuffer };
