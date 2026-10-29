// Cores institucionais e a "Nova bússola" do estudo Assinatura visual:
// Mapeamento de Predominância de Cores (estratégia de marca Gove).

export type BrandColor = {
  hex: string;
  rgb: string;
  name: string;
  group: 'principal' | 'secundária';
  /** Papel na interface do design system. */
  use: string;
  /** O que a cor transmite (psicologia das cores). */
  meaning: string;
  /** Papel na narrativa da marca. */
  story: string;
  /** Posição na bússola (0–100, a partir do canto superior esquerdo do círculo). */
  at: { x: number; y: number };
};

export const BRAND_COLORS: BrandColor[] = [
  {
    hex: '#F4F4F4', rgb: '244, 244, 244', name: 'Branco', group: 'principal',
    use: 'Superfícies no tema claro; texto sobre fundos escuros.',
    meaning: 'Neutralidade, minimalismo e clareza — um branco acinzentado, sofisticado e moderno.',
    story: 'Não conta a história principal: cria o palco para as outras cores falarem alto.',
    at: { x: 49, y: 49 },
  },
  {
    hex: '#20133D', rgb: '32, 19, 61', name: 'Noite', group: 'principal',
    use: 'Fundo do tema escuro; títulos no tema claro.',
    meaning: 'Autoridade, mistério, seriedade e luxo — a noite, o universo.',
    story: 'Solidez e credibilidade: o ponto de partida que dá peso e contraste à marca.',
    at: { x: 63, y: 83 },
  },
  {
    hex: '#FFC72C', rgb: '255, 199, 44', name: 'Amarelo', group: 'principal',
    use: 'Uma ação principal por tela, destaques e foco. Texto sobre ele: Noite.',
    meaning: 'Vibração, otimismo, energia, inovação e calor.',
    story: 'O ponto focal — as palavras em negrito da história; traz o insight.',
    at: { x: 54, y: 11 },
  },
  {
    hex: '#3D0099', rgb: '61, 0, 153', name: 'Roxo', group: 'principal',
    use: 'Marca e botões principais; títulos e links no tema claro. Texto sobre ele: branco.',
    meaning: 'Criatividade, magia, realeza e inovação digital.',
    story: 'A transformação e o lado tecnológico da marca: criatividade aplicada.',
    at: { x: 71, y: 92 },
  },
  {
    hex: '#351F65', rgb: '53, 31, 101', name: 'Roxo Profundo', group: 'secundária',
    use: 'Bordas e fundos secundários no tema escuro.',
    meaning: 'Mistério, luxo, realeza e profundidade infinita.',
    story: 'A camada de sofisticação premium; o lado artístico e reflexivo.',
    at: { x: 62, y: 80 },
  },
  {
    hex: '#2F3539', rgb: '47, 53, 57', name: 'Grafite', group: 'secundária',
    use: 'Texto de corpo no tema claro; superfícies no tema escuro.',
    meaning: 'Neutra, fria e densa: solidez, seriedade, maturidade e modernidade.',
    story: 'A base estrutural que deixa as cores vibrantes brilharem sem poluir.',
    at: { x: 43, y: 60 },
  },
  {
    hex: '#5B6770', rgb: '91, 103, 112', name: 'Cinza técnico', group: 'secundária',
    use: 'Texto secundário no tema claro (5,8:1 no branco).',
    meaning: 'Técnica, equilibrada, neutra e prática.',
    story: 'A lógica e a estabilidade operacional: mantém a coesão sem roubar a cena.',
    at: { x: 45, y: 57 },
  },
  {
    hex: '#5AC2CD', rgb: '90, 194, 205', name: 'Ciano', group: 'secundária',
    use: 'Informação e gráficos.',
    meaning: 'Frescor, clareza mental, fluidez, inovação e descoberta.',
    story: 'O ponto de virada: a luz no fim do túnel, o futuro e a evolução.',
    at: { x: 30, y: 68 },
  },
  {
    hex: '#A278DA', rgb: '162, 120, 218', name: 'Lavanda', group: 'secundária',
    use: 'Links e realces no tema escuro; bordas em hover. Não usar como texto no claro.',
    meaning: 'Criatividade, sensibilidade, imaginação e acolhimento.',
    story: 'Humaniza a interface: a marca não parece fria ou robótica.',
    at: { x: 59, y: 69 },
  },
  {
    hex: '#16499F', rgb: '22, 73, 159', name: 'Azul confiança', group: 'secundária',
    use: 'Links no tema claro e gráficos.',
    meaning: 'Confiança, segurança e autoridade.',
    story: 'O momento de afirmação: a base tecnológica robusta e a credibilidade.',
    at: { x: 38, y: 89 },
  },
];

/** Os 9 atributos da nova bússola (grade 3×3 do estudo) e as cores que os carregam. */
export const ATTRIBUTES: { name: string; colors: string[] }[] = [
  { name: 'Sofisticada', colors: ['#20133D', '#351F65'] },
  { name: 'Incomum', colors: ['#A278DA', '#351F65'] },
  { name: 'Intelectual', colors: ['#3D0099', '#16499F'] },
  { name: 'Profunda', colors: ['#20133D', '#3D0099'] },
  { name: 'Tranquila', colors: ['#5AC2CD', '#F4F4F4'] },
  { name: 'Tecnológica', colors: ['#3D0099', '#5AC2CD'] },
  { name: 'Equilibrada', colors: ['#5B6770', '#F4F4F4'] },
  { name: 'Confiável', colors: ['#16499F', '#2F3539'] },
  { name: 'Otimista', colors: ['#FFC72C'] },
];

/** Colorimetria em pauta: predominância de cor por assunto (proporções do estudo). */
export const TOPICS: { name: string; subjects: string; focus: string; mix: { hex: string; share: number }[] }[] = [
  {
    name: 'Cidadania, direitos e políticas sociais',
    subjects: 'Desigualdade, pobreza, assistência social, previdência, moradia, criança e adolescente, idoso, pessoa com deficiência, mulheres, racismo, LGBTQIA+, imigração.',
    focus: 'Garantia de direitos, inclusão, proteção social.',
    mix: [{ hex: '#A278DA', share: 46 }, { hex: '#F4F4F4', share: 38 }, { hex: '#2F3539', share: 16 }],
  },
  {
    name: 'Saúde, meio ambiente e sustentabilidade',
    subjects: 'SUS, saúde mental, pandemias, saneamento, mudanças climáticas, Amazônia, resíduos, água, energia limpa, justiça ambiental.',
    focus: 'Qualidade de vida, prevenção, desenvolvimento sustentável.',
    mix: [{ hex: '#5AC2CD', share: 45 }, { hex: '#F4F4F4', share: 28 }, { hex: '#3D0099', share: 14 }, { hex: '#20133D', share: 13 }],
  },
  {
    name: 'Educação, cultura, ciência e tecnologia',
    subjects: 'Qualidade do ensino, evasão escolar, EAD, alfabetização digital, cultura, esporte, lazer, patrimônio, redes sociais, IA, inovação.',
    focus: 'Formação cidadã, acesso ao conhecimento, inclusão digital.',
    // Design system (out/2026): lavanda dominante, com branco e ciano; proporções como as da pauta de três cores
    mix: [{ hex: '#A278DA', share: 46 }, { hex: '#F4F4F4', share: 38 }, { hex: '#5AC2CD', share: 16 }],
  },
  {
    name: 'Economia, trabalho e desenvolvimento',
    subjects: 'Desemprego, informalidade, renda, inflação, tributação, empreendedorismo, agronegócio, indústria, comércio, turismo.',
    focus: 'Crescimento, geração de renda, justiça fiscal.',
    mix: [{ hex: '#16499F', share: 53 }, { hex: '#FFC72C', share: 21 }, { hex: '#F4F4F4', share: 14 }, { hex: '#2F3539', share: 12 }],
  },
  {
    name: 'Segurança, justiça e instituições',
    subjects: 'Violência, criminalidade, sistema prisional, drogas, armas, corrupção, democracia, participação, justiça, defesa, relações internacionais.',
    focus: 'Ordem democrática, combate à impunidade, cidadania.',
    mix: [{ hex: '#20133D', share: 53 }, { hex: '#5B6770', share: 21 }, { hex: '#F4F4F4', share: 14 }, { hex: '#5AC2CD', share: 12 }],
  },
  {
    name: 'Gestão pública, infraestrutura e território',
    subjects: 'Orçamento, transparência, controle, mobilidade urbana, habitação, transportes, energia, comunicações, desenvolvimento regional, favelas, êxodo rural.',
    focus: 'Eficiência do Estado, acesso a serviços, ocupação do território.',
    mix: [{ hex: '#F4F4F4', share: 41 }, { hex: '#351F65', share: 31 }, { hex: '#FFC72C', share: 14 }, { hex: '#16499F', share: 13 }],
  },
];

/** Perguntas que orientam a escolha (Pessoa, Situação e Lugar). */
export const QUESTIONS: { axis: string; items: string[] }[] = [
  { axis: 'Pessoa', items: ['Com qual público estamos conversando?', 'Qual a idade dele?', 'Quais as dores que o afetam?'] },
  { axis: 'Situação', items: ['Qual assunto será tratado?', 'Em que período será tratado?', 'Qual a importância do assunto?'] },
  { axis: 'Lugar', items: ['É uma conversa pública ou privada?', 'Com qual eixo social se comunica?'] },
];

export const colorByHex = (hex: string) => BRAND_COLORS.find((c) => c.hex === hex)!;

/**
 * Prompt para um agente revisar o esquema de cores de uma peça conforme a pauta
 * selecionada na Colorimetria em pauta (e, se houver, as palavras da aba Tom).
 */
export function topicReviewPrompt(index: number, words: number[] = []): string {
  const t = TOPICS[index];
  const hexes = new Set(t.mix.map((m) => m.hex));
  const related = ATTRIBUTES.filter((a) => a.colors.some((h) => hexes.has(h))).map((a) => a.name);
  const tone = words.map((i) => ATTRIBUTES[i]?.name).filter(Boolean);
  const mix = t.mix.map((m) => {
    const c = colorByHex(m.hex);
    return `- ${c.name} ${c.hex}: ${m.share}%. Uso: ${c.use} Transmite: ${c.meaning} Na narrativa: ${c.story}`;
  });
  const palette = BRAND_COLORS.map((c) => `${c.name} ${c.hex}`).join(', ');
  return [
    'Você é um revisor de identidade visual da Gove Digital. Revise o esquema de cores da peça que vou anexar (imagem, PDF, layout ou código) de acordo com a pauta abaixo, seguindo a Colorimetria em pauta do Design System Gove.',
    '',
    `## Pauta: ${t.name}`,
    `Assuntos: ${t.subjects}`,
    `Foco da comunicação: ${t.focus}`,
    '',
    '## Predominância de cores esperada (proporção aproximada da área)',
    ...mix,
    '',
    `Atributos da bússola ligados a estas cores: ${related.join(', ')}.`,
    ...(tone.length ? [`Tom desejado para esta peça: ${tone.join(', ')}.`] : []),
    '',
    '## Regras da marca',
    `- Use apenas as cores oficiais: ${palette}. Qualquer outra cor é desvio.`,
    '- Texto com contraste mínimo de 4,5:1 com o fundo (WCAG AA).',
    '- Amarelo #FFC72C só para a ação principal e destaques pontuais; texto sobre Amarelo em Noite #20133D.',
    '- Texto sobre Roxo #3D0099 em branco; Lavanda #A278DA não é usada como texto em fundo claro.',
    '',
    '## Antes de revisar, considere',
    ...QUESTIONS.map((q) => `- ${q.axis}: ${q.items.join(' ')}`),
    '',
    '## Responda em PT-BR com',
    '1. Diagnóstico: a peça comunica a pauta? Por quê.',
    '2. Proporções medidas: estimativa da área de cada cor presente, comparada à predominância esperada.',
    '3. Desvios: cores fora da paleta, proporções distantes da pauta e falhas de contraste (com a razão calculada).',
    '4. Sugestões: troca a troca, com o elemento, a cor atual e a cor oficial sugerida (nome e HEX).',
  ].join('\n');
}
