// archiver → fflate. Mesma interface usada por backend/report/package.js.
import { Buffer } from 'buffer';
import { zipSync } from 'fflate';

const toU8 = (d) => (typeof d === 'string' ? new TextEncoder().encode(d) : d instanceof Uint8Array ? d : new Uint8Array(d));

export class ZipArchive {
  constructor(opts = {}) {
    this.level = opts.zlib?.level ?? 6;
    this.files = {};
    this.handlers = {};
  }
  on(ev, fn) {
    (this.handlers[ev] ??= []).push(fn);
    return this;
  }
  pipe(out) {
    this.out = out;
    return out;
  }
  append(data, { name }) {
    this.files[name] = toU8(data);
    return this;
  }
  async finalize() {
    try {
      const zip = zipSync(this.files, { level: this.level });
      this.out?.write(Buffer.from(zip.buffer, zip.byteOffset, zip.byteLength));
      this.out?.end();
    } catch (err) {
      for (const fn of this.handlers.error ?? []) fn(err);
      throw err;
    }
  }
}
export default { ZipArchive };
