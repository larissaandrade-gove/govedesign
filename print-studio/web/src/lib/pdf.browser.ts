// Renderização do PDF no navegador (build de artefato). Mesmo desenhista do
// servidor (shared/pdfpaint.js): vetores e textos em CMYK, Montserrat embutida,
// logomarca Gove oficial em máscaras 1 bit com a cor CMYK da marca.
// Diferença do servidor: logos enviados e a foto do mockup entram como JPEG RGB,
// porque o navegador não converte para CMYK — o relatório avisa isso.
/* eslint-disable @typescript-eslint/no-explicit-any */
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { buildLayout, logoContrastCheck } from '../../../shared/layout.js';
import { LOGO_VARIANT_COLORS, buildStencils, imageElements, paintPdf, pixelContrast } from '../../../shared/pdfpaint.js';
import { COLORS, FONT_FILES, contrastRatio, mmToPt, ptToMm } from '../../../shared/tokens.js';
import { brandLogoUrl } from '@/lib/brand';
import { fontBytes, type FontWeight } from '@/lib/fonts.embedded';
import { logoJpeg, mockupJpeg, rgbaOf } from '@/lib/images.browser';

const WEIGHTS = Object.keys(FONT_FILES) as FontWeight[];
const COLOR_MAP = COLORS as Record<string, { hex: string; cmyk?: number[] }>;

let measureDoc: any = null;
/** Medição de texto com as mesmas .ttf embutidas no PDF (igual ao servidor). */
export function measure(text: string, weight: string, sizePt: number): number {
  if (!measureDoc) {
    measureDoc = new PDFDocument({ autoFirstPage: false, font: fontBytes('regular') });
    for (const w of WEIGHTS) measureDoc.registerFont(w, fontBytes(w));
  }
  return ptToMm(measureDoc.font(weight).fontSize(sizePt).widthOfString(text));
}

export const qrModules = (data: string) => QRCode.create(data, { errorCorrectionLevel: 'H' }).modules;

const stencils = new Map<string, Promise<any[]>>();
function officialStencils(e: any) {
  const key = `${e.file}:${e.variant}`;
  if (!stencils.has(key)) {
    stencils.set(
      key,
      fetch(brandLogoUrl(e.file))
        .then((r) => r.blob())
        .then((b) => rgbaOf(b))
        .then(({ data, width, height }) => buildStencils(data, width, height, LOGO_VARIANT_COLORS[e.variant as keyof typeof LOGO_VARIANT_COLORS])),
    );
  }
  return stencils.get(key)!;
}

export type PieceFiles = { logos: Partial<Record<'gove' | 'bb' | 'prefeitura', Blob | null>>; mockup: Blob | null };
export type FileCheck = { level: 'ok' | 'warn' | 'error'; code: string; message: string; layout: string };

/** Gera o PDF de uma peça. */
export async function renderPiece(layoutId: string, input: any, files: PieceFiles) {
  const L = buildLayout(layoutId, input, measure) as any;
  const doc = new PDFDocument({
    size: [mmToPt(L.page.w), mmToPt(L.page.h)],
    margin: 0,
    pdfVersion: '1.4',
    // No navegador não há Helvetica (padrão do pdfkit): começa já na Montserrat.
    font: fontBytes('regular'),
    info: { Title: `${L.layout.name} — ${input.municipio?.nome_municipio ?? ''}`, Creator: 'Gove Print Studio' },
  });
  for (const w of WEIGHTS) doc.registerFont(w, fontBytes(w));
  const chunks: Uint8Array[] = [];
  doc.on('data', (c: Uint8Array) => chunks.push(c));
  const done = new Promise<void>((res) => doc.on('end', () => res()));

  const images = { total: 0, masks: 0 };
  const uploadedContrast: number[] = [];
  const prepared = new Map<any, any>();
  for (const e of imageElements(L) as any[]) {
    if (e.type === 'mockup-screen') {
      if (!files.mockup) continue;
      prepared.set(e, { jpeg: await mockupJpeg(files.mockup, e.focus, e.w, e.w / e.h) });
      images.total += 1;
    } else if (e.official) {
      prepared.set(e, { masks: await officialStencils(e) });
      images.masks += 1;
    } else {
      const file = files.logos?.[e.which as 'gove' | 'bb' | 'prefeitura'];
      if (!file) continue;
      prepared.set(e, { jpeg: await logoJpeg(file, e.w) });
      images.total += 1;
      if (e.which === 'gove') {
        const px = await rgbaOf(file, 600);
        const c = pixelContrast(px.data, e.bg ?? '#FFFFFF');
        if (c != null) uploadedContrast.push(c);
      }
    }
  }
  paintPdf(doc, L, prepared, { qr: qrModules });
  doc.end();
  await done;
  const size = chunks.reduce((n, c) => n + c.length, 0);
  const bytes = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) {
    bytes.set(c, off);
    off += c.length;
  }
  return { bytes, layout: L, report: fileChecks(bytes, L, images, uploadedContrast) };
}

/** Checagens do arquivo gerado: sangria, fontes, CMYK, contraste do QR e da logomarca. */
function fileChecks(bytes: Uint8Array, L: any, images: { total: number; masks: number }, uploaded: number[]): FileCheck[] {
  const raw = new TextDecoder('latin1').decode(bytes);
  const out: FileCheck[] = [];
  const add = (level: FileCheck['level'], code: string, message: string) => out.push({ level, code, message, layout: L.layout.name });

  const box = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(raw);
  const wMm = box ? ptToMm(Number(box[1])) : 0;
  const hMm = box ? ptToMm(Number(box[2])) : 0;
  const okSize = Math.abs(wMm - L.page.w) < 0.1 && Math.abs(hMm - L.page.h) < 0.1;
  add(okSize ? 'ok' : 'error', 'sangria', okSize
    ? `Sangria ok — ${L.page.w.toFixed(0)} × ${L.page.h.toFixed(0)} mm (corte ${L.trim.w} × ${L.trim.h} mm + 5 mm).`
    : `Tamanho do PDF (${wMm.toFixed(1)} × ${hMm.toFixed(1)} mm) diferente do esperado.`);

  const fonts = (raw.match(/\/FontFile2/g) ?? []).length;
  const fontRefs = (raw.match(/\/Type \/Font\b/g) ?? []).length;
  add(fonts > 0 && fonts * 2 >= fontRefs ? 'ok' : 'error', 'fontes', fonts > 0 ? `Fontes embutidas ok — ${fonts} variação(ões) da ${L.identity === 'bb' ? 'BancoDoBrasil Titulos/Textos' : 'Montserrat'}.` : 'Nenhuma fonte embutida encontrada.');
  if (L.identity === 'bb') {
    // Identidade BB: só as fontes corporativas BB no arquivo (nunca Montserrat nem o "Alfabeto Especial")
    const names = [...new Set((raw.match(/\/BaseFont \/[A-Z]{6}\+([\w-]+)/g) ?? []).map((m) => m.split('+')[1]))];
    const off = names.filter((n) => !/^BancoDoBrasil(Titulos|Textos)-/.test(n));
    add(off.length || !names.length ? 'error' : 'ok', 'bb-fontes', off.length ? `Fontes fora da tipografia BB no PDF: ${off.join(', ')}.` : `Tipografia BB embutida: ${names.join(', ')}.`);
  }

  // No navegador as imagens saem em RGB; qualquer outro objeto RGB é erro.
  const rgbObjects = (raw.match(/\/DeviceRGB/g) ?? []).length;
  const marca = images.masks ? `; logomarca Gove em ${images.masks} máscara(s) com cor CMYK da marca` : '';
  if (rgbObjects > images.total) {
    add('error', 'cmyk', 'Há elementos vetoriais ou textos em RGB no arquivo.');
  } else if (images.total > 0) {
    add('warn', 'cmyk', `Vetores e textos em CMYK${marca}; ${images.total} imagem(ns) (logos enviados/mockup) saem em RGB nesta versão do navegador — converta-as para CMYK (ou gere pelo Print Studio do servidor) antes de enviar à gráfica.`);
  } else {
    add('ok', 'cmyk', `Cores em CMYK ok — preenchimentos e textos em CMYK${marca}.`);
  }

  const bbQr = L.identity === 'bb';
  const qrRatio = bbQr ? contrastRatio(COLOR_MAP.bbAzulEscuro.hex, COLOR_MAP.bbBranco.hex) : contrastRatio(COLOR_MAP.preto.hex, COLOR_MAP.branco.hex);
  add(qrRatio >= 7 ? 'ok' : 'error', 'qr-contraste', `Contraste QR ok — módulos ${bbQr ? 'Azul escuro BB (C90 M95)' : 'K100'} sobre branco sólido (${qrRatio.toFixed(1)}:1), correção de erro H.`);

  const official = logoContrastCheck(L) as Omit<FileCheck, 'layout'> | null;
  let logo: Omit<FileCheck, 'layout'>;
  if (uploaded.length && Math.min(...uploaded) < 4.5) {
    logo = { level: 'error', code: 'logo-contraste', message: `Contraste da logomarca Gove enviada de ${Math.min(...uploaded).toFixed(1)}:1 com o fundo — mínimo 4,5:1.` };
  } else if (uploaded.length && (!official || official.level === 'ok')) {
    logo = { level: 'ok', code: 'logo-contraste', message: `Contraste da logomarca ok — logo Gove enviado ≥ 4,5:1 (mín. ${Math.min(...uploaded).toFixed(1)}:1).` };
  } else {
    logo = official ?? { level: 'warn', code: 'logo-contraste', message: 'Logomarca Gove ausente: contraste não verificado.' };
  }
  out.push({ ...logo, layout: L.layout.name });
  return out;
}
