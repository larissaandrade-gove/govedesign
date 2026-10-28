// Páginas de referência para o teste de regressão do HTML exportado.
//
// Monta (com ids determinísticos) os modelos iniciais GOVE e BB e algumas
// páginas feitas à mão que exercitam as opções que existiam antes das opções de
// layout da LP de referência. O documento de cada página é salvo junto com o
// HTML em fixtures/export-baseline.json: o teste exporta o DOCUMENTO SALVO, como
// acontece com uma página antiga guardada no navegador.
//
//   node lp-builder/scripts/export-baseline.mjs   (regrava a linha de base)
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createJiti } from "jiti";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "../src");
export const jiti = createJiti(import.meta.url, {
  alias: { "@": src, "./bbFonts": path.join(here, "bb-fonts.stub.ts") },
});
export const BASELINE_FILE = path.join(here, "fixtures/export-baseline.json");

/** Math.random determinístico (mulberry32) só durante `fn`: ids estáveis. */
function seeded(seed, fn) {
  const original = Math.random;
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

const CREDIT = {
  source: "pexels",
  id: 123,
  photographer: "Fulana de Tal",
  photographerUrl: "https://www.pexels.com/@fulana",
  pexelsUrl: "https://www.pexels.com/photo/123",
};

/** Páginas (documentos) da linha de base, com nome estável. */
export async function buildFixturePages() {
  const f = await jiti.import(path.join(src, "lib/gove/factories.ts"));
  const { seedTemplates } = await jiti.import(path.join(src, "lib/gove/templates.ts"));
  const { pageFromPreset } = await jiti.import(path.join(src, "lib/gove/presets.ts"));
  const bb = await jiti.import(path.join(src, "lib/gove/bb.ts"));
  const { TARGET_END, TARGET_FORM } = await jiti.import(path.join(src, "lib/gove/anchors.ts"));

  const out = [];
  // Modelos iniciais (GOVE e BB) e o "em branco".
  seeded(1, () => {
    for (const t of seedTemplates("2026-01-01T00:00:00.000Z")) out.push({ name: t.id, page: t.publishedDoc });
    out.push({ name: "preset-blank-gove", page: pageFromPreset("blank", "gove") });
    out.push({ name: "preset-blank-bb", page: pageFromPreset("blank", "bb") });
  });

  // Página GOVE com todas as opções antigas.
  out.push({
    name: "manual-gove-completa",
    page: seeded(2, () => {
      const form = f.makeSection({
        box: f.defaultBox({ bgColor: "#F4F4F4", borderWidth: 2, borderColor: "#3D0099", radius: 24, shadow: "md", paddingY: 48, paddingX: 32 }),
      });
      const formRow = f.makeRow(2, { gap: 40, alignItems: "center" });
      formRow.columns[0].children = [
        f.makeText({ tag: "h2", content: "Inscreva-se <agora> & \"já\"", size: 30, weight: "bold", italic: true, align: "center" }),
        f.makeCountdown({ target: "2027-03-01T10:00", mode: "dhm", variant: "glass", animation: "glow" }),
      ];
      formRow.columns[1].children = [f.makeRdForm({ snippet: "<form id='rd-form'><input name='email'></form>" })];
      form.children = [formRow];

      const hero = f.makeSection({
        box: f.defaultBox({ fill: "image", bgImage: "https://images.pexels.com/x.jpg", bgCredit: CREDIT, overlay: 40, overlayColor: "#20133D", bgSize: "contain", bgPosition: "top", bgRepeat: true, animation: "kenburns" }),
      });
      const heroRow = f.makeRow(1);
      heroRow.columns[0].children = [
        f.makeText({ tag: "h1", content: "Título", size: 40, weight: "bold", color: "#FFFFFF", align: "center" }),
        f.makeButton({ label: "Ir ao formulário", linkMode: "section", target: TARGET_FORM, variant: "elevated", animation: "pulse", align: "center" }),
        f.makeButton({ label: "Fim", linkMode: "section", target: TARGET_END, variant: "text", animation: "shine" }),
        f.makeButton({ label: "Externo", href: "https://gove.digital/?a=1&b=2", variant: "outline", animation: "float", radius: 999 }),
        f.makeButton({ label: "Vidro", variant: "glass", bgColor: "#3D0099", color: "#FFFFFF" }),
      ];
      hero.children = [heroRow];

      const grid = f.makeSection({ box: f.defaultBox({ fill: "gradient", gradientVia: "", gradientAngle: 90, animation: "pan" }) });
      const r3 = f.makeRow(3, { gap: 16, alignItems: "stretch", box: f.defaultBox({ bgColor: "#FFFFFF", radius: 16, shadow: "sm", paddingY: 24, paddingX: 24, animation: "reveal" }) });
      r3.columns[0].children = [f.makeCard({ icon: "Rocket", title: "Card", shadow: "md" })];
      r3.columns[1].children = [f.makeCard({ icon: "Inexistente", borderWidth: 0, shadow: "none", align: "center" })];
      r3.columns[2].children = [f.makeImage({ src: "https://images.pexels.com/y.jpg", alt: "Foto", credit: CREDIT, frame: "circle", width: 60 })];
      const r4 = f.makeRow(4, { alignItems: "end", box: f.defaultBox({ fill: "image", bgImage: "https://images.pexels.com/z.jpg", bgCredit: CREDIT, animation: "shimmer" }) });
      r4.columns[0].children = [f.makeImage({ src: "https://images.pexels.com/w.jpg", alt: "", frame: "rounded" })];
      r4.columns[1].children = [f.makeVideo({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", aspect: "4 / 3", width: 80 })];
      r4.columns[2].children = [f.makeImage({ src: "", alt: "vazia" }), f.makeVideo({ url: "" })];
      r4.columns[3].children = [f.makeText({ tag: "h3", content: "h3" }), f.makeText({ content: "p" })];
      grid.children = [r3, r4];

      return {
        version: 1,
        sections: [hero, grid, form],
        cursor: { mode: "follower", url: "https://x/cursor.gif", size: 48, hotspot: "center", hideNative: true },
      };
    }),
  });

  // Página GOVE com cursor estático.
  out.push({
    name: "manual-gove-cursor",
    page: seeded(3, () => {
      const page = pageFromPreset("centered", "gove");
      page.cursor = { mode: "image", url: "https://x/cursor.png", size: 32, hotspot: "topleft", hideNative: false };
      return page;
    }),
  });

  // Página BB com logomarca, foto com proteção e link de texto.
  out.push({
    name: "manual-bb-logo",
    page: seeded(4, () => {
      const P = bb.BB_PALETTE;
      const photo = f.makeSection({ box: f.defaultBox({ fill: "image", bgImage: "https://images.pexels.com/bb.jpg", bgCredit: CREDIT, overlay: 30, overlayColor: P.azulEscuro }) });
      const row = f.makeRow(2);
      row.columns[0].children = [f.makeText({ tag: "h1", content: "BB", color: P.branco }), f.makeButton({ variant: "text", color: P.branco })];
      row.columns[1].children = [f.makeCountdown({ target: "2027-01-01T00:00" })];
      photo.children = [row];
      const light = f.makeSection({ box: f.defaultBox({ bgColor: P.branco }) });
      const lrow = f.makeRow(1);
      lrow.columns[0].children = [f.makeButton({ variant: "text", color: P.azulEscuro, label: "Saiba mais" }), f.makeCard({})];
      light.children = [lrow];
      const page = {
        version: 1,
        identity: "bb",
        bbLogo: { src: "data:image/png;base64,AA==", version: "horizontal", width: 160, aspect: 4, bg: P.amareloInstitucional, align: "left" },
        sections: [photo, light],
      };
      return bb.bbHarmonize(page);
    }),
  });

  return JSON.parse(JSON.stringify(out));
}
