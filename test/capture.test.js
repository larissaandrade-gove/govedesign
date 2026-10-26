// Captura do site do domicílio eletrônico (Print Studio, Portal Cidadão): bloqueio de SSRF e captura real.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import sharp from 'sharp';
import { CAPTURE_VIEWPORT, captureSite, closeCaptureBrowser, isAllowedUrl, isPublicIp } from '../print-studio/server/capture.js';

test('captura: só sites públicos (sem rede interna, metadados, portas ou esquemas estranhos)', async () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.5.4', '192.168.0.10', '169.254.169.254', '100.64.1.1', '0.0.0.0', '::1', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1']) {
    assert.equal(isPublicIp(ip), false, ip);
  }
  assert.equal(isPublicIp('8.8.8.8'), true);
  const pub = async () => [{ address: '200.160.2.3', family: 4 }];
  const priv = async () => [{ address: '10.0.0.5', family: 4 }];
  assert.equal(await isAllowedUrl('https://www.prefeitura.sp.gov.br/', pub), true);
  assert.equal(await isAllowedUrl('https://interno.prefeitura.sp.gov.br/', priv), false);
  assert.equal(await isAllowedUrl('http://169.254.169.254/latest/meta-data/', pub), false);
  assert.equal(await isAllowedUrl('http://localhost/', async () => [{ address: '127.0.0.1', family: 4 }]), false);
  assert.equal(await isAllowedUrl('file:///etc/passwd', pub), false);
  assert.equal(await isAllowedUrl('https://www.prefeitura.sp.gov.br:8080/', pub), false);
  assert.equal(await isAllowedUrl('https://user:senha@www.prefeitura.sp.gov.br/', pub), false);
  await assert.rejects(captureSite('http://127.0.0.1:9/'), /não permitido/);
});

test('captura: página no celular em 1170×2532 (390×844 com densidade 3)', async (t) => {
  const srv = createServer((_req, res) => {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end('<!doctype html><meta name="viewport" content="width=device-width"><body style="margin:0;background:#3B3E80;color:#fff;font:24px sans-serif"><h1>Portal Cidadão</h1></body>');
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  t.after(async () => {
    srv.close();
    await closeCaptureBrowser();
  });
  let png;
  try {
    png = await captureSite(`http://127.0.0.1:${srv.address().port}/`, { allowPrivate: true });
  } catch (err) {
    if (/indisponível/.test(err.message)) return t.skip('Chromium não instalado nesta máquina');
    throw err;
  }
  const m = await sharp(png).metadata();
  assert.equal(m.width, CAPTURE_VIEWPORT.width * CAPTURE_VIEWPORT.deviceScaleFactor);
  assert.equal(m.height, CAPTURE_VIEWPORT.height * CAPTURE_VIEWPORT.deviceScaleFactor);
  const { data } = await sharp(png).extract({ left: 600, top: 2000, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual([...data.subarray(0, 3)], [0x3b, 0x3e, 0x80]);
});
