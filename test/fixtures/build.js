// Gera as peças de exemplo usadas nos testes e na demonstração do frontend.
//   node test/fixtures/build.js
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import sharp from 'sharp';

const DIR = dirname(fileURLToPath(import.meta.url));
const base = { originX: 'left', originY: 'top', scaleX: 1, scaleY: 1, angle: 0, opacity: 1 };

// Paths exatos do ícone Lucide "arrow-right"
const lucideArrow = {
  ...base,
  type: 'Group',
  name: 'Ícone seta',
  left: 880,
  top: 880,
  width: 24,
  height: 24,
  scaleX: 4,
  scaleY: 4,
  objects: [
    { ...base, type: 'Path', path: 'M5 12h14', fill: '', stroke: '#FFC72C', strokeWidth: 2, left: -12, top: -12 },
    { ...base, type: 'Path', path: 'm12 5 7 7-7 7', fill: '', stroke: '#FFC72C', strokeWidth: 2, left: -12, top: -12 },
  ],
};

async function qrDataUrl(text, { dark = '#1A153A', light = '#FFFFFF' } = {}) {
  return QRCode.toDataURL(text, { margin: 4, width: 240, color: { dark, light } });
}

async function build() {
  const qr = await qrDataUrl('https://www.gove.digital/');
  const qrTransparent = await qrDataUrl('https://www.gove.digital/', { light: '#0000' });

  const aprovado = {
    version: '7.4.0',
    width: 1080,
    height: 1080,
    background: '#1A153A',
    gove: { pieceType: 'post' },
    objects: [
      { ...base, type: 'Textbox', name: 'Título', text: 'Governo Zero Clique', left: 80, top: 120, width: 800, fontSize: 72, fontFamily: 'Montserrat', fontWeight: 900, fontStyle: 'normal', fill: '#FFFFFF' },
      { ...base, type: 'Textbox', name: 'Subtítulo', text: 'O governo que sabe, antecipa e age', left: 80, top: 320, width: 800, fontSize: 36, fontFamily: 'Montserrat', fontWeight: 400, fill: '#EAEAEA' },
      { ...base, type: 'Textbox', name: 'Destaque', text: 'Para quem precisa e para quem serve', left: 80, top: 440, width: 700, fontSize: 32, fontFamily: 'Montserrat', fontWeight: 'bold', fill: '#FFC72C' },
      { ...base, type: 'Image', name: 'Logo', src: 'assets/gove-logo-branco-amarelo.png', left: 80, top: 880, width: 300, height: 100 },
      lucideArrow,
      { ...base, type: 'Rect', name: 'Base QR', left: 600, top: 620, width: 240, height: 240, fill: '#FFFFFF' },
      { ...base, type: 'Image', name: 'QR code', gove: { role: 'qrcode' }, src: qrTransparent, left: 600, top: 620, width: 240, height: 240 },
    ],
  };

  const reprovado = {
    version: '7.4.0',
    width: 1080,
    height: 1080,
    background: '#1A153A',
    objects: [
      {
        ...base,
        type: 'Rect',
        name: 'Faixa gradiente',
        left: 0,
        top: 560,
        width: 1080,
        height: 520,
        fill: { type: 'linear', gradientUnits: 'pixels', coords: { x1: 0, y1: 0, x2: 1080, y2: 0 }, colorStops: [{ offset: 0, color: '#4A00E0' }, { offset: 1, color: '#FF00AA' }] },
      },
      { ...base, type: 'Textbox', name: 'Título', text: 'Oferta imperdível', left: 20, top: 30, width: 900, fontSize: 72, fontFamily: 'Arial', fontWeight: 'bold', fill: '#FFFFFF' },
      { ...base, type: 'Textbox', name: 'Subtítulo', text: 'Texto com baixo contraste', left: 80, top: 200, width: 800, fontSize: 28, fontFamily: 'Montserrat', fontWeight: 600, fill: '#3A2E6B' },
      { ...base, type: 'Textbox', name: 'Chamada', text: 'Saiba mais', left: 80, top: 260, width: 400, fontSize: 28, fontFamily: 'Montserrat', fontWeight: 400, fontStyle: 'normal', fill: '#FF0000', styles: [{ start: 0, end: 5, style: { fontStyle: 'italic', fontWeight: 700 } }] },
      { ...base, type: 'Image', name: 'Logo', src: 'assets/gove-logo-roxo.png', left: 700, top: 60, width: 300, height: 80, scaleX: 1.2, scaleY: 1, filters: [{ type: 'BlendColor', color: '#FFFFFF', mode: 'tint' }] },
      { ...base, type: 'Path', name: 'Ícone custom', path: 'M0 0 L40 0 L40 40 L0 40 Z M10 10 L30 30', fill: '#FFC72C', left: 900, top: 300, width: 40, height: 40 },
      { ...base, type: 'Image', name: 'QR code', gove: { role: 'qrcode' }, src: qrTransparent, left: 820, top: 900, width: 240, height: 240, scaleX: 0.5, scaleY: 0.5 },
    ],
  };

  writeFileSync(join(DIR, 'post-aprovado.fabric.json'), JSON.stringify(aprovado, null, 2));
  writeFileSync(join(DIR, 'post-reprovado.fabric.json'), JSON.stringify(reprovado, null, 2));

  // Peça raster (Modo B) + metadados das regiões de texto e QR code
  const qrPng = await sharp(Buffer.from(qr.split(',')[1], 'base64')).resize(240, 240).png().toBuffer();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080">
    <rect width="1080" height="1080" fill="#1A153A"/>
    <rect x="80" y="120" width="700" height="90" fill="#1A153A"/>
    <text x="80" y="190" font-family="sans-serif" font-size="72" font-weight="900" fill="#FFFFFF">Governo Zero Clique</text>
    <text x="80" y="320" font-family="sans-serif" font-size="36" fill="#5C6B73">Texto com pouco contraste</text>
    <rect x="80" y="880" width="300" height="100" fill="#FFC72C"/>
  </svg>`;
  const raster = await sharp(Buffer.from(svg)).composite([{ input: qrPng, left: 760, top: 760 }]).png().toBuffer();
  writeFileSync(join(DIR, 'post-raster.png'), raster);
  writeFileSync(
    join(DIR, 'post-raster.regions.json'),
    JSON.stringify(
      {
        pieceType: 'post',
        textRegions: [
          { label: 'Título', x: 72, y: 118, width: 760, height: 96 },
          { label: 'Subtítulo', x: 72, y: 280, width: 560, height: 56 },
        ],
        qrRegions: [{ label: 'QR code', x: 760, y: 760, width: 240, height: 240 }],
        logoRegions: [{ label: 'Logo', x: 80, y: 880, width: 300, height: 100 }],
      },
      null,
      2,
    ),
  );
  console.log('Fixtures geradas em', DIR);
}

build();
