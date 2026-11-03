import {
  BookOpenText, ChartLineUp, ChatTeardropText, Cube, Handshake, type Icon as IconType, Megaphone, Palette, Robot, SealCheck, SquaresFour, TextAa,
} from '@phosphor-icons/react';
import { APPS, type GoveApp } from './apps.ts';

/** Seções do diretório Instruções (Apoio de IA). Os ids são as âncoras de sempre (#cores, #tipografia…). */
export const INSTRUCOES = [
  { id: 'prompts', label: 'Prompts', icon: ChatTeardropText, summary: 'Prompts prontos para copiar, montados com os parâmetros atuais.' },
  { id: 'tipografia', label: 'Tipografia', icon: TextAa, summary: 'Montserrat e Inter, escala e tamanhos mínimos.' },
  { id: 'cores', label: 'Cores', icon: Palette, summary: 'Bússola de cores, pautas e ferramentas de cor.' },
  { id: 'logomarca', label: 'Logomarca', icon: SealCheck, summary: 'Versões oficiais e a regra de contraste.' },
  { id: 'componentes', label: 'Componentes', icon: SquaresFour, summary: 'Botões, campos e cards ao vivo.' },
  { id: 'diretrizes', label: 'Diretrizes', icon: BookOpenText, summary: 'O guia completo da marca para baixar.' },
] as const satisfies readonly { id: string; label: string; icon: IconType; summary: string }[];

export type InstrucaoId = (typeof INSTRUCOES)[number]['id'];
export const isInstrucao = (id: string): id is InstrucaoId => INSTRUCOES.some((s) => s.id === id);

export type Team = {
  id: string;
  label: string;
  /** Uma linha sobre o que a equipe encontra no studio. */
  description: string;
  icon: IconType;
  /** Apps do studio, na ordem de prioridade (o primeiro é o destaque). */
  apps: string[];
  /** Apresentação compacta da lista de apps (equipes com muitos apps). */
  compact?: boolean;
  /** Seções de Instruções que o studio mostra (Apoio de IA). */
  instrucoes?: InstrucaoId[];
};

export const TEAMS: Team[] = [
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Todos os apps, com o encurtador de links em primeiro.',
    icon: Megaphone,
    apps: ['links', 'criativos', 'lp', 'studio-cards', 'eventos', 'atualizacoes', 'print-studio'],
    compact: true,
  },
  {
    id: 'sucesso-operacoes',
    label: 'Sucesso do cliente e Operações',
    description: 'Kit de Boas-Vindas dos municípios, pronto para a gráfica.',
    icon: Handshake,
    apps: ['print-studio'],
  },
  {
    id: 'produto',
    label: 'Produto',
    description: 'Cards de atualização do software.',
    icon: Cube,
    apps: ['atualizacoes'],
  },
  {
    id: 'vendas',
    label: 'Vendas e pré-vendas',
    description: 'Cards, criativos de mídia paga e confirmação de evento.',
    icon: ChartLineUp,
    apps: ['studio-cards', 'criativos', 'eventos'],
  },
  {
    id: 'apoio-ia',
    label: 'Apoio de IA',
    description: 'Instruções do design system e prompts prontos para copiar.',
    icon: Robot,
    apps: [],
    instrucoes: INSTRUCOES.map((s) => s.id),
  },
];

export const teamById = (id: string | null | undefined) => TEAMS.find((t) => t.id === id) ?? null;

/** Apps da equipe na ordem dela (sem equipe: todos). */
export const teamApps = (team: Team | null): GoveApp[] =>
  team ? team.apps.map((id) => APPS.find((a) => a.id === id)).filter((a): a is GoveApp => !!a) : APPS;
