// node:stream — só o PassThrough que report/package.js usa para juntar o ZIP.
export class PassThrough {
  #h = {};
  on(ev, fn) {
    (this.#h[ev] ??= []).push(fn);
    return this;
  }
  emit(ev, ...a) {
    for (const fn of this.#h[ev] ?? []) fn(...a);
  }
  write(chunk) {
    this.emit('data', chunk);
    return true;
  }
  end(chunk) {
    if (chunk) this.write(chunk);
    this.emit('finish');
    this.emit('close');
  }
}
export default { PassThrough };
