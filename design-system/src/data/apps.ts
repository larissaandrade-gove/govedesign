import { LayoutTemplate, Link2, Printer, ScanSearch, Sparkles, type LucideIcon } from 'lucide-react';

export type GoveApp = {
  id: string;
  name: string;
  route: string;
  icon: LucideIcon;
  summary: string;
  features: string[];
  stack: string[];
  folder: string;
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
  },
];
