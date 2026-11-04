import { CalendarCheck, Cards, type Icon as IconType, Layout, LinkSimple, PresentationChart, Printer, RocketLaunch, Sparkle } from '@phosphor-icons/react';
import cases1 from '../assets/apps/cases-1.webp';
import cases2 from '../assets/apps/cases-2.webp';
import criativos1 from '../assets/apps/criativos-1.webp';
import criativos2 from '../assets/apps/criativos-2.webp';
import links1 from '../assets/apps/links-1.webp';
import lp1 from '../assets/apps/lp-1.webp';
import lp2 from '../assets/apps/lp-2.webp';
import print1 from '../assets/apps/print-studio-1.webp';
import print2 from '../assets/apps/print-studio-2.webp';

export type Shot = { src: string; caption: string };

export const APP_TAGS = ['Mídia', 'Web', 'Impresso'] as const;
export type AppTag = (typeof APP_TAGS)[number];

export type GoveApp = {
  id: string;
  name: string;
  route: string;
  icon: IconType;
  summary: string;
  /** Uma linha de benefício para cartões e listas. */
  tagline: string;
  features: string[];
  stack: string[];
  folder: string;
  /** Comando para rodar localmente (a partir da raiz do repositório). */
  run: string;
  /** Roda no próprio servidor do projeto (Express em /). */
  sameServer: boolean;
  /** Como o app funciona dentro do design system (artefato). */
  embeddedNote: string;
  shots: Shot[];
  /** Fora da versão mobile (só no computador). */
  desktopOnly?: boolean;
  /** Categoria para os filtros da lista de aplicações. */
  tag: AppTag;
  /** App embutido que abre esta página (padrão: o próprio id) e rota inicial no hash (com "#", ex.: "#eventos"). */
  embed?: { file: string; hash?: string };
  /** Depende de publicação web: fica "Em breve" até o endereço público responder (lib/appStatus). */
  publish?: { url: string };
};

declare const __GOVE_LINKS_URL__: string;

const CRIATIVOS_NOTE = 'Roda aqui no navegador. Busca no Pexels pelo conector Pexels Gove; sem ele, envie imagens do dispositivo.';
/** Partes do Gerador de criativos com página própria: mesmo app embutido, aberto na tela certa. */
const CRIATIVOS_BASE: Pick<GoveApp, 'tag' | 'route' | 'stack' | 'folder' | 'run' | 'sameServer' | 'embeddedNote'> = {
  tag: 'Mídia',
  route: '/criativos',
  stack: ['TanStack Start', 'React', 'Canvas'],
  folder: 'criativos/',
  run: 'npm run criativos:install && npm run criativos:dev',
  sameServer: false,
  embeddedNote: CRIATIVOS_NOTE,
};

/** Apps disponíveis no tamanho de tela atual (o Kit de Boas-Vindas fica só no computador). */
export const appsFor = (mobile: boolean) => (mobile ? APPS.filter((a) => !a.desktopOnly) : APPS);

/** Aplicações do repositório govedesign que aplicam este design system. */
export const APPS: GoveApp[] = [
  {
    id: 'criativos',
    tag: 'Mídia',
    name: 'Gerador de criativos',
    route: '/criativos',
    icon: Sparkle,
    summary: 'Mídia paga, eventos, atualizações de produto e Studio de cards num só lugar, nas identidades GOVE ou Banco do Brasil, com as travas de marca aplicadas.',
    tagline: 'Mídia paga, eventos e atualizações.',
    features: ['Mídia paga em lote', 'Eventos', 'Atualizações', 'Studio de cards', 'GOVE ou Banco do Brasil'],
    stack: ['TanStack Start', 'React', 'Canvas'],
    folder: 'criativos/',
    run: 'npm run criativos:install && npm run criativos:dev',
    sameServer: false,
    embeddedNote: CRIATIVOS_NOTE,
    embed: { file: 'criativos', hash: '#midia-paga' },
    shots: [
      { src: criativos2, caption: 'Gerador em lote: 8 variações por rodada.' },
      { src: criativos1, caption: 'Studio ao vivo: diagramação, fundos e checagem do manual de marca.' },
    ],
  },
  {
    id: 'links',
    tag: 'Web',
    name: 'Gove Links',
    route: '/links',
    icon: LinkSimple,
    summary: 'Encurta links das campanhas e registra cada clique, sem guardar IP ou dados pessoais.',
    tagline: 'Links curtos com cliques e QR.',
    features: ['Links curtos', 'Cliques por dispositivo e país', 'Dashboard', 'Domínio próprio'],
    stack: ['TanStack Start', 'Supabase'],
    folder: 'links/',
    run: 'npm run links:install && npm run links:dev',
    sameServer: false,
    embeddedNote:
      'Em breve: o link curto só redireciona fora da plataforma quando o encurtador estiver publicado com domínio próprio (go.gove.digital). A liberação é automática assim que o time de tecnologia publicar o servidor.',
    publish: { url: __GOVE_LINKS_URL__ },
    shots: [{ src: links1, caption: 'Acesso institucional da equipe de marketing (contas criadas pela administração).' }],
  },
  {
    id: 'lp',
    tag: 'Web',
    name: 'Landing Pages',
    route: '/lp',
    icon: Layout,
    summary: 'Monta landing pages visualmente com blocos prontos e exporta o HTML para a plataforma final.',
    tagline: 'Landing pages em minutos.',
    features: ['Presets de Hero', 'Contagem regressiva', 'Formulário RD Station', 'Desktop e mobile'],
    stack: ['TanStack Start', 'React'],
    folder: 'lp-builder/',
    run: 'npm run lp:install && npm run lp:dev',
    sameServer: false,
    embeddedNote: 'Roda aqui no navegador. Páginas salvas neste navegador; o HTML sai por download ou cópia.',
    shots: [
      { src: lp2, caption: 'Nova landing page a partir de um preset de Hero.' },
      { src: lp1, caption: 'Editor com biblioteca de blocos e visualização desktop/mobile.' },
    ],
  },
  {
    id: 'print-studio',
    desktopOnly: true,
    tag: 'Impresso',
    name: 'Kit de Boas-Vindas',
    route: '/print-studio/',
    icon: Printer,
    summary: 'Gera os PDFs de gráfica do Kit de Boas-Vindas (flyers, adesivo e display) por município, em lote, prontos para impressão.',
    tagline: 'PDFs de gráfica por município.',
    features: ['4 layouts', 'CMYK e sangria de 5 mm', 'QR code do WhatsApp', 'Exportação em .zip'],
    stack: ['React', 'Fabric.js', 'pdfkit', 'SQLite'],
    folder: 'print-studio/',
    run: 'npm start  →  http://localhost:3040/print-studio/',
    sameServer: true,
    embeddedNote: 'Roda aqui no navegador. Vetores e textos em CMYK; imagens saem em RGB — converta antes de imprimir.',
    shots: [
      { src: print1, caption: 'Editor com preview fiel ao PDF, sangria e área de segurança.' },
      { src: print2, caption: 'Verificação antes do download: sangria, fontes, CMYK e QR code.' },
    ],
  },
  {
    id: 'cases',
    tag: 'Mídia',
    name: 'Gerador de cases',
    route: '/cases',
    icon: PresentationChart,
    summary:
      'Monta o case de um município com os indicadores do período e exporta a one page A4 em PDF e a apresentação 1920×1080 em PowerPoint editável, com a marca aplicada.',
    tagline: 'Cases de municípios em PDF e .pptx.',
    features: ['One page A4 em PDF', 'Apresentação .pptx editável', 'Indicadores à mão ou por CSV', 'Texto com Claude, só com os números do case', 'Histórico por município'],
    stack: ['React', 'pdfkit', 'pptxgenjs'],
    folder: 'cases/',
    run: 'npm run cases:install && npm run cases:dev',
    sameServer: false,
    embeddedNote:
      'Roda aqui no navegador. Cases salvos no Design System; o texto com Claude aparece só dentro do claude.ai. Importação do Grafana: liberada depois da configuração do conector.',
    shots: [
      { src: cases1, caption: 'Indicadores à mão, por CSV ou (em breve) do Grafana, com a one page ao vivo.' },
      { src: cases2, caption: 'Apresentação 1920×1080: slides sem dados ficam ocultos.' },
    ],
  },
  {
    ...CRIATIVOS_BASE,
    id: 'studio-cards',
    name: 'Studio de cards',
    icon: Cards,
    summary: 'Monta cards um a um, ao vivo, com fundos, diagramação e checagem do manual de marca.',
    tagline: 'Cards ao vivo, com a marca checada.',
    features: ['Diagramação ao vivo', 'Fundos da marca', 'Checagem do manual', 'GOVE ou Banco do Brasil'],
    embed: { file: 'criativos', hash: '#studio' },
    shots: [{ src: criativos1, caption: 'Studio ao vivo: diagramação, fundos e checagem do manual de marca.' }],
  },
  {
    ...CRIATIVOS_BASE,
    id: 'atualizacoes',
    name: 'Cards de atualização',
    icon: RocketLaunch,
    summary: 'Cards de novidades do software: título curto, até 5 novidades com ícones, versão e data.',
    tagline: 'Novidades do produto em cards.',
    features: ['Até 5 novidades', 'Versão e data', 'Formatos 4:3 e 1:1'],
    embed: { file: 'criativos', hash: '#atualizacoes' },
    shots: [{ src: criativos1, caption: 'Cards prontos com a identidade GOVE.' }],
  },
  {
    ...CRIATIVOS_BASE,
    id: 'eventos',
    name: 'Confirmação de evento',
    icon: CalendarCheck,
    summary: 'Card de presença confirmada: foto da pessoa em moldura circular, nome, evento, data e logo.',
    tagline: 'Presença confirmada em um card.',
    features: ['Foto em moldura circular', 'Nome e evento', 'Formatos 4:3 e 1:1'],
    embed: { file: 'criativos', hash: '#eventos' },
    shots: [{ src: criativos1, caption: 'Cards prontos com a identidade GOVE.' }],
  },
];
