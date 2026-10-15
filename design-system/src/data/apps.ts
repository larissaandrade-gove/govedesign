import { LayoutTemplate, Link2, Printer, ScanSearch, Sparkles, type LucideIcon } from 'lucide-react';
import revisor1 from '../assets/apps/revisor-1.webp';
import revisor2 from '../assets/apps/revisor-2.webp';
import criativos1 from '../assets/apps/criativos-1.webp';
import criativos2 from '../assets/apps/criativos-2.webp';
import links1 from '../assets/apps/links-1.webp';
import lp1 from '../assets/apps/lp-1.webp';
import lp2 from '../assets/apps/lp-2.webp';
import print1 from '../assets/apps/print-studio-1.webp';
import print2 from '../assets/apps/print-studio-2.webp';

export type Shot = { src: string; caption: string };

export type GoveApp = {
  id: string;
  name: string;
  route: string;
  icon: LucideIcon;
  summary: string;
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
};

/** Aplicações do repositório govedesign que aplicam este design system. */
export const APPS: GoveApp[] = [
  {
    id: 'revisor',
    name: 'Revisor de identidade visual',
    route: '/revisor/',
    icon: ScanSearch,
    summary: 'Audita peças de marketing e apresentações contra os tokens de marca e entrega um relatório com o que corrigir.',
    features: ['Paleta por Delta-E', 'Montserrat e gradientes', 'Margens, logo e ícones', 'Relatório HTML + ZIP'],
    stack: ['Express', 'SQLite', 'Fabric.js', 'sharp'],
    folder: 'backend/ · db/ · frontend/revisor/',
    run: 'npm start  →  http://localhost:3040/revisor/',
    sameServer: true,
    embeddedNote: 'Roda aqui mesmo, no navegador.',
    shots: [
      { src: revisor1, caption: 'Envio da peça: Modo A (Fabric.js JSON) ou Modo B (PNG/JPG).' },
      { src: revisor2, caption: 'Resultado com status geral, preview anotado e itens a corrigir.' },
    ],
  },
  {
    id: 'criativos',
    name: 'Gerador de criativos',
    route: '/criativos',
    icon: Sparkles,
    summary: 'Cria criativos de mídia paga em lote e no Studio ao vivo, com as travas do manual de marca aplicadas automaticamente.',
    features: ['8 diagramações', 'Lote e Studio ao vivo', 'Vídeo de 15 s', 'Texto alternativo'],
    stack: ['TanStack Start', 'React', 'Canvas'],
    folder: 'criativos/',
    run: 'npm run criativos:install && npm run criativos:dev',
    sameServer: false,
    embeddedNote: 'Roda aqui mesmo, no navegador.',
    shots: [
      { src: criativos1, caption: 'Studio ao vivo: diagramação, fundos e checagem do manual de marca.' },
      { src: criativos2, caption: 'Gerador em lote: 8 variações por rodada.' },
    ],
  },
  {
    id: 'links',
    name: 'Gove Links',
    route: '/links',
    icon: Link2,
    summary: 'Encurta links das campanhas e registra cada clique, sem guardar IP ou dados pessoais.',
    features: ['Links curtos', 'Cliques por dispositivo e país', 'Dashboard', 'Domínio próprio'],
    stack: ['TanStack Start', 'Supabase'],
    folder: 'links/',
    run: 'npm run links:install && npm run links:dev',
    sameServer: false,
    embeddedNote: 'Roda aqui mesmo, no navegador.',
    shots: [{ src: links1, caption: 'Acesso institucional da equipe de marketing (contas criadas pela administração).' }],
  },
  {
    id: 'lp',
    name: 'LP Builder',
    route: '/lp',
    icon: LayoutTemplate,
    summary: 'Monta landing pages visualmente com blocos prontos e exporta o HTML para a plataforma final.',
    features: ['Presets de Hero', 'Contagem regressiva', 'Formulário RD Station', 'Desktop e mobile'],
    stack: ['TanStack Start', 'React'],
    folder: 'lp-builder/',
    run: 'npm run lp:install && npm run lp:dev',
    sameServer: false,
    embeddedNote: 'Roda aqui mesmo, no navegador.',
    shots: [
      { src: lp2, caption: 'Nova landing page a partir de um preset de Hero.' },
      { src: lp1, caption: 'Editor com biblioteca de blocos e visualização desktop/mobile.' },
    ],
  },
  {
    id: 'print-studio',
    name: 'Print Studio',
    route: '/print-studio/',
    icon: Printer,
    summary: 'Gera os PDFs de gráfica do Kit de Boas-Vindas por município, em lote, prontos para impressão.',
    features: ['4 layouts', 'CMYK e sangria de 5 mm', 'QR code do WhatsApp', 'Exportação em .zip'],
    stack: ['React', 'Fabric.js', 'pdfkit', 'SQLite'],
    folder: 'print-studio/',
    run: 'npm start  →  http://localhost:3040/print-studio/',
    sameServer: true,
    embeddedNote: 'Roda aqui mesmo, no navegador.',
    shots: [
      { src: print1, caption: 'Editor com preview fiel ao PDF, sangria e área de segurança.' },
      { src: print2, caption: 'Verificação antes do download: sangria, fontes, CMYK e QR code.' },
    ],
  },
];
