import { type Icon as IconType, Layout, LinkSimple, Printer, Sparkle } from '@phosphor-icons/react';
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
  /** App embutido que abre esta página (padrão: o próprio id) e rota inicial no hash. */
  embed?: { file: string; hash?: string };
  /** Depende de publicação web: fica "Em breve" até o endereço público responder (lib/appStatus). */
  publish?: { url: string };
};

declare const __GOVE_LINKS_URL__: string;

/** Apps disponíveis no tamanho de tela atual (o Print Studio fica só no computador). */
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
    embeddedNote: 'Roda aqui no navegador. Busca no Pexels pelo conector Pexels Gove; sem ele, envie imagens do dispositivo.',
    shots: [
      { src: criativos1, caption: 'Studio ao vivo: diagramação, fundos e checagem do manual de marca.' },
      { src: criativos2, caption: 'Gerador em lote: 8 variações por rodada.' },
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
    name: 'Print Studio',
    route: '/print-studio/',
    icon: Printer,
    summary: 'Gera os PDFs de gráfica do Kit de Boas-Vindas por município, em lote, prontos para impressão.',
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
];
