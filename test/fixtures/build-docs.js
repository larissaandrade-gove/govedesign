// Gera as peças de exemplo dos modos Documento (PPTX, PDF, DOCX) e HTML, em
// test/fixtures/docs/, nos casos aprovado e reprovado.
//   node test/fixtures/build-docs.js
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strToU8, zipSync } from 'fflate';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, 'docs');
const ROOT = join(DIR, '..', '..');
const LOGO = (f) => readFileSync(join(ROOT, 'brand', 'logos', f));
const MONT = (w) => readFileSync(join(ROOT, 'node_modules', '@fontsource', 'montserrat', 'files', `montserrat-latin-${w}-normal.woff`));

const xml = (s) => strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${s.trim()}`);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// Logomarca recolorida (não oficial): símbolo em vermelho.
async function redLogo() {
  const { data, info } = await sharp(LOGO('gove-simbolo-roxo.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 230;
    data[i + 1] = 30;
    data[i + 2] = 30;
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

const NS_A = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
const NS_R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const NS_P = 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const rels = (list) =>
  xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${list
    .map(([id, type, target]) => `<Relationship Id="${id}" Type="${REL}/${type}" Target="${target}"/>`)
    .join('')}</Relationships>`);

const THEME = xml(`
<a:theme ${NS_A} name="Gove"><a:themeElements>
<a:clrScheme name="Gove">
<a:dk1><a:srgbClr val="20133D"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="351F65"/></a:dk2><a:lt2><a:srgbClr val="F4F4F4"/></a:lt2>
<a:accent1><a:srgbClr val="3D0099"/></a:accent1><a:accent2><a:srgbClr val="FFC72C"/></a:accent2>
<a:accent3><a:srgbClr val="5AC2CD"/></a:accent3><a:accent4><a:srgbClr val="A278DA"/></a:accent4>
<a:accent5><a:srgbClr val="16499F"/></a:accent5><a:accent6><a:srgbClr val="5B6770"/></a:accent6>
<a:hlink><a:srgbClr val="16499F"/></a:hlink><a:folHlink><a:srgbClr val="351F65"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="Gove"><a:majorFont><a:latin typeface="Montserrat"/></a:majorFont><a:minorFont><a:latin typeface="Inter"/></a:minorFont></a:fontScheme>
<a:fmtScheme name="Gove"/>
</a:themeElements></a:theme>`);

// ------------------------------------------------------------------- PPTX

function pptx({ slides, logos }) {
  const sp = (id, name, ph, body, xfrm = '') => `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr/><p:nvPr>${ph}</p:nvPr></p:nvSpPr><p:spPr>${xfrm}</p:spPr><p:txBody><a:bodyPr/><a:lstStyle/>${body}</p:txBody></p:sp>`;
  const pic = (id, name, rid) =>
    `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${name}" descr="${name}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rid}"/></p:blipFill><p:spPr><a:xfrm><a:off x="8000000" y="300000"/><a:ext cx="600000" cy="800000"/></a:xfrm></p:spPr></p:pic>`;
  const tree = (inner) => `<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>${inner}</p:spTree>`;
  const lvl = (sz, font, clr) => `<a:lvl1pPr><a:defRPr sz="${sz}"><a:solidFill><a:schemeClr val="${clr}"/></a:solidFill><a:latin typeface="${font}"/></a:defRPr></a:lvl1pPr>`;

  const files = {
    '[Content_Types].xml': xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>${slides
      .map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`)
      .join('')}<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/></Types>`),
    '_rels/.rels': rels([['rId1', 'officeDocument', 'ppt/presentation.xml']]),
    'ppt/presentation.xml': xml(`<p:presentation ${NS_A} ${NS_R} ${NS_P}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides
      .map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`)
      .join('')}</p:sldIdLst><p:sldSz cx="9144000" cy="5143500"/><p:defaultTextStyle>${lvl(1800, '+mn-lt', 'tx1')}</p:defaultTextStyle></p:presentation>`),
    'ppt/_rels/presentation.xml.rels': rels([['rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'], ...slides.map((_, i) => [`rId${i + 2}`, 'slide', `slides/slide${i + 1}.xml`]), ['rId99', 'theme', 'theme/theme1.xml']]),
    'ppt/theme/theme1.xml': THEME,
    'ppt/slideMasters/slideMaster1.xml': xml(`<p:sldMaster ${NS_A} ${NS_R} ${NS_P}><p:cSld><p:bg><p:bgPr><a:solidFill><a:schemeClr val="bg1"/></a:solidFill></p:bgPr></p:bg>${tree(
      sp(2, 'Título', '<p:ph type="title"/>', '<a:p><a:r><a:rPr lang="pt-BR"/><a:t>Título mestre</a:t></a:r></a:p>') + sp(3, 'Texto', '<p:ph type="body" idx="1"/>', '<a:p><a:r><a:rPr lang="pt-BR"/><a:t>Texto mestre</a:t></a:r></a:p>'),
    )}</p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle>${lvl(4000, '+mj-lt', 'accent1')}</p:titleStyle><p:bodyStyle>${lvl(2000, '+mn-lt', 'tx1')}</p:bodyStyle><p:otherStyle>${lvl(1800, '+mn-lt', 'tx1')}</p:otherStyle></p:txStyles></p:sldMaster>`),
    'ppt/slideMasters/_rels/slideMaster1.xml.rels': rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ['rId2', 'theme', '../theme/theme1.xml']]),
    'ppt/slideLayouts/slideLayout1.xml': xml(`<p:sldLayout ${NS_A} ${NS_R} ${NS_P}><p:cSld name="Título e conteúdo">${tree(
      sp(2, 'Título', '<p:ph type="title"/>', '<a:p><a:endParaRPr/></a:p>') + sp(3, 'Conteúdo', '<p:ph idx="1"/>', '<a:p><a:endParaRPr/></a:p>'),
    )}</p:cSld></p:sldLayout>`),
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels': rels([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']]),
  };
  logos.forEach((buf, i) => (files[`ppt/media/image${i + 1}.png`] = new Uint8Array(buf)));
  slides.forEach((s, i) => {
    const body = s.shapes
      .map((x, k) =>
        x.pic != null
          ? pic(10 + k, x.name ?? 'Logo Gove', `rIdImg${x.pic}`)
          : sp(10 + k, x.name ?? `Texto ${k}`, x.ph ?? '', x.paras.map((p) => `<a:p>${p.map((r) => `<a:r>${r.rPr ?? '<a:rPr lang="pt-BR"/>'}<a:t>${esc(r.t)}</a:t></a:r>`).join('')}</a:p>`).join(''), x.xfrm),
      )
      .join('');
    files[`ppt/slides/slide${i + 1}.xml`] = xml(`<p:sld ${NS_A} ${NS_R} ${NS_P}><p:cSld>${s.bg ? `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${s.bg}"/></a:solidFill></p:bgPr></p:bg>` : ''}${tree(body)}</p:cSld></p:sld>`);
    files[`ppt/slides/_rels/slide${i + 1}.xml.rels`] = rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ...logos.map((_, j) => [`rIdImg${j}`, 'image', `../media/image${j + 1}.png`])]);
  });
  return zipSync(files);
}

// ------------------------------------------------------------------- DOCX

function docx({ defaults, paras, headerLogo, headerName = 'Logo Gove' }) {
  const NS_W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const NS_WP = 'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
  const NS_PIC = 'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
  const run = (r) => `<w:r>${r.rPr ? `<w:rPr>${r.rPr}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(r.t)}</w:t></w:r>`;
  const para = (p) => `<w:p>${p.style ? `<w:pPr><w:pStyle w:val="${p.style}"/></w:pPr>` : ''}${p.runs.map(run).join('')}</w:p>`;
  const drawing = `<w:drawing><wp:inline><wp:extent cx="540000" cy="720000"/><wp:docPr id="1" name="${headerName}" descr="${headerName}"/><a:graphic ${NS_A}><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="logo.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdLogo"/></pic:blipFill><pic:spPr/></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
  return zipSync({
    '[Content_Types].xml': xml(`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/></Types>`),
    '_rels/.rels': rels([['rId1', 'officeDocument', 'word/document.xml']]),
    'word/document.xml': xml(`<w:document ${NS_W} ${NS_R}><w:body>${paras.map(para).join('')}<w:sectPr><w:headerReference w:type="default" r:id="rIdH"/></w:sectPr></w:body></w:document>`),
    'word/_rels/document.xml.rels': rels([['rIdS', 'styles', 'styles.xml'], ['rIdH', 'header', 'header1.xml'], ['rIdT', 'theme', 'theme/theme1.xml']]),
    'word/styles.xml': xml(`<w:styles ${NS_W}><w:docDefaults><w:rPrDefault><w:rPr>${defaults}</w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Titulo1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:rFonts w:asciiTheme="majorHAnsi" w:hAnsiTheme="majorHAnsi"/><w:b/><w:sz w:val="56"/><w:color w:val="3D0099"/></w:rPr></w:style></w:styles>`),
    'word/header1.xml': xml(`<w:hdr ${NS_W} ${NS_R} ${NS_WP} ${NS_PIC}><w:p><w:r>${drawing}</w:r></w:p></w:hdr>`),
    'word/_rels/header1.xml.rels': rels([['rIdLogo', 'image', 'media/logo.png']]),
    'word/media/logo.png': new Uint8Array(headerLogo),
    'word/theme/theme1.xml': THEME,
  });
}

// -------------------------------------------------------------------- PDF

function pdf(draw) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', tagged: true, pdfVersion: '1.7', lang: 'pt-BR', info: { Title: 'Peça de teste' } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.registerFont('Montserrat-Bold', MONT(700));
    doc.registerFont('Montserrat-Regular', MONT(400));
    draw(doc);
    doc.end();
  });
}
const pdfLogo = (doc, img, x, y) => doc.addStructure(doc.struct('Figure', { alt: 'Logo Gove' }, () => doc.image(img, x, y, { width: 45 })));

// ------------------------------------------------------------------- HTML

const SVG_LOGO = (fill, extra = '') =>
  `<svg class="logo" ${extra} viewBox="0 0 40 40" width="48" height="48" role="img" aria-label="Logo Gove"><title>Logo Gove</title><path d="M20 4a16 16 0 1 0 16 16h-8a8 8 0 1 1-8-8z" fill="${fill}"/></svg>`;

const htmlAprovado = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>E-mail aprovado</title>
<style>
body { margin: 0; background: #FFFFFF; font: 400 17px/1.5 Inter, Arial, sans-serif; color: #2F3539; }
header { padding: 16px; }
h1 { font: 700 32px/1.2 Montserrat, Arial, sans-serif; color: #3D0099; margin: 0 16px; }
p { margin: 16px; }
.cta { display: inline-block; margin: 16px; min-height: 48px; min-width: 160px; padding: 14px 24px; box-sizing: border-box; background: #FFC72C; color: #20133D; font-weight: 600; text-decoration: none; border-radius: 8px; }
</style></head><body>
<header>${SVG_LOGO('#3E0099')}</header>
<h1>Governo Zero Clique</h1>
<p>Serviços públicos que chegam até você, sem filas e sem papel.</p>
<a class="cta" href="https://www.gove.digital/">Conheça a Gove</a>
<script>document.body.style.background = 'red'</script>
</body></html>`;

const htmlReprovado = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>E-mail reprovado</title>
<style>
body { margin: 0; background: #FFFFFF; font: 400 14px/1.4 "Comic Sans MS", cursive; color: #000000; }
.dark { background: #20133D; padding: 16px; }
h1 { font: 700 26px/1.2 Arial, sans-serif; color: #FF0000; }
small { font-size: 9px; }
a { color: #16499F; font-size: 12px; }
</style></head><body>
<div class="dark">${SVG_LOGO('#3E0099')}</div>
<header>${SVG_LOGO('#E61E1E', 'id="logo-vermelho"')}</header>
<h1>Oferta imperdível</h1>
<p>Texto de corpo pequeno em preto puro. <a href="#">Saiba mais</a></p>
<small>Letras miúdas</small>
</body></html>`;

// ------------------------------------------------------------------ build

async function build() {
  mkdirSync(OUT, { recursive: true });
  const roxo = LOGO('gove-simbolo-roxo.png');
  const branco = LOGO('gove-simbolo-branco.png');
  const red = await redLogo();

  // PPTX aprovado: tudo herdado do tema/mestre (Montserrat/Inter, cores da paleta)
  writeFileSync(
    join(OUT, 'apresentacao-aprovada.pptx'),
    pptx({
      logos: [roxo],
      slides: [
        {
          shapes: [
            { name: 'Título 1', ph: '<p:ph type="title"/>', paras: [[{ t: 'Governo Zero Clique' }]] },
            { name: 'Conteúdo 2', ph: '<p:ph idx="1"/>', paras: [[{ t: 'Serviços públicos sem filas e sem papel.' }]] },
            { pic: 0, name: 'Logo Gove' },
          ],
        },
      ],
    }),
  );

  // PPTX reprovado: fonte fora do DS, 9 pt, preto puro, vermelho; logo recolorida;
  // slide 2 com fundo escuro e logo roxa (contraste insuficiente)
  writeFileSync(
    join(OUT, 'apresentacao-reprovada.pptx'),
    pptx({
      logos: [red, roxo],
      slides: [
        {
          shapes: [
            {
              name: 'Caixa de texto',
              paras: [
                [{ t: 'Letras miúdas em preto', rPr: '<a:rPr lang="pt-BR" sz="900"><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:latin typeface="Comic Sans MS"/></a:rPr>' }],
                [{ t: 'Chamada em vermelho', rPr: '<a:rPr lang="pt-BR" sz="2400"><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill><a:latin typeface="Arial"/></a:rPr>' }],
                [{ t: 'Título com gradiente', rPr: '<a:rPr lang="pt-BR" sz="3200"><a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="FF00FF"/></a:gs><a:gs pos="100000"><a:srgbClr val="00FFFF"/></a:gs></a:gsLst></a:gradFill><a:latin typeface="+mj-lt"/></a:rPr>' }],
              ],
            },
            { pic: 0, name: 'Logo Gove' },
          ],
        },
        {
          bg: '20133D',
          shapes: [
            { name: 'Título 1', ph: '<p:ph type="title"/>', paras: [[{ t: 'Slide escuro', rPr: '<a:rPr lang="pt-BR"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:rPr>' }]] },
            { pic: 1, name: 'Logo Gove (roxa)' },
          ],
        },
      ],
    }),
  );

  // DOCX aprovado: Inter 12 pt grafite; título Montserrat 28 pt roxo; logo roxa no cabeçalho
  writeFileSync(
    join(OUT, 'documento-aprovado.docx'),
    docx({
      defaults: '<w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:sz w:val="24"/><w:color w:val="2F3539"/>',
      paras: [
        { style: 'Titulo1', runs: [{ t: 'Relatório Gove' }] },
        { runs: [{ t: 'Corpo de texto em Inter, 12 pt, na cor grafite.' }] },
      ],
      headerLogo: roxo,
    }),
  );

  // DOCX reprovado: Times 8 pt cor automática (preto), Arial vermelho; logo branca em página branca
  writeFileSync(
    join(OUT, 'documento-reprovado.docx'),
    docx({
      defaults: '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="16"/>',
      paras: [
        { runs: [{ t: 'Texto pequeno em Times, cor automática.' }] },
        { runs: [{ t: 'Destaque em Arial vermelho', rPr: '<w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="28"/><w:color w:val="FF0000"/>' }] },
      ],
      headerLogo: branco,
    }),
  );

  // PDF aprovado: Montserrat, cores da paleta, ≥ 11 pt; logo roxa marcada (tagged) sobre branco
  writeFileSync(
    join(OUT, 'folheto-aprovado.pdf'),
    await pdf((d) => {
      pdfLogo(d, roxo, 480, 40);
      d.font('Montserrat-Bold').fontSize(28).fillColor('#3D0099').text('Governo Zero Clique', 50, 60);
      d.font('Montserrat-Regular').fontSize(12).fillColor('#2F3539').text('Serviços públicos que chegam até você.', 50, 120);
    }),
  );

  // PDF reprovado: Times 8 pt preto, Helvetica vermelha; logo roxa sobre faixa escura
  writeFileSync(
    join(OUT, 'folheto-reprovado.pdf'),
    await pdf((d) => {
      d.rect(0, 0, 595, 140).fill('#20133D');
      pdfLogo(d, roxo, 480, 40);
      d.font('Times-Roman').fontSize(8).fillColor('#000000').text('Letras miúdas em preto puro.', 50, 200);
      d.font('Helvetica-Bold').fontSize(20).fillColor('#FF0000').text('Oferta imperdível', 50, 240);
    }),
  );

  writeFileSync(join(OUT, 'email-aprovado.html'), htmlAprovado);
  writeFileSync(join(OUT, 'email-reprovado.html'), htmlReprovado);
  console.log('fixtures de documentos →', OUT);
}

build();
