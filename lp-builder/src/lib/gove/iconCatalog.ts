/**
 * Catálogo canônico dos ícones dos cards: chave gravada na página → ícone Phosphor
 * (nome do arquivo em @phosphor-icons/core, kebab-case), rótulo e categoria.
 *
 * Fonte única para:
 *  - components/gove/icons.ts (componente React de cada chave, no editor);
 *  - scripts/build-icons.mjs (gera iconPaths.ts, usado no HTML exportado).
 *
 * As chaves antigas (nomes legados) ficam estáveis: as páginas salvas as usam.
 * Ao adicionar um ícone aqui, adicione o componente em icons.ts e rode `npm run icons`.
 */
export const ICON_CATALOG = {
  Activity: { phosphor: "pulse", label: "Atividade", categoria: "dados" },
  AlarmClock: { phosphor: "alarm", label: "Despertador", categoria: "tempo" },
  Award: { phosphor: "medal", label: "Medalha", categoria: "resultado" },
  BarChart3: { phosphor: "chart-bar", label: "Gráfico de barras", categoria: "dados" },
  Bell: { phosphor: "bell", label: "Sino", categoria: "comunicação" },
  BookOpen: { phosphor: "book-open", label: "Livro", categoria: "educação" },
  Briefcase: { phosphor: "briefcase", label: "Maleta", categoria: "negócios" },
  Building2: { phosphor: "buildings", label: "Prédios", categoria: "gestão pública" },
  Calendar: { phosphor: "calendar-blank", label: "Calendário", categoria: "tempo" },
  Camera: { phosphor: "camera", label: "Câmera", categoria: "mídia" },
  Check: { phosphor: "check", label: "Confirmado", categoria: "resultado" },
  CheckCircle2: { phosphor: "check-circle", label: "Confirmado (círculo)", categoria: "resultado" },
  ClipboardList: { phosphor: "clipboard-text", label: "Prancheta", categoria: "gestão pública" },
  Clock: { phosphor: "clock", label: "Relógio", categoria: "tempo" },
  Cloud: { phosphor: "cloud", label: "Nuvem", categoria: "tecnologia" },
  Coins: { phosphor: "coins", label: "Moedas", categoria: "finanças" },
  Compass: { phosphor: "compass", label: "Bússola", categoria: "estratégia" },
  CreditCard: { phosphor: "credit-card", label: "Cartão de crédito", categoria: "finanças" },
  Database: { phosphor: "database", label: "Banco de dados", categoria: "dados" },
  DollarSign: { phosphor: "currency-dollar", label: "Cifrão", categoria: "finanças" },
  Download: { phosphor: "download-simple", label: "Baixar", categoria: "ações" },
  FileText: { phosphor: "file-text", label: "Documento", categoria: "documentos" },
  Filter: { phosphor: "funnel", label: "Filtro", categoria: "dados" },
  Flag: { phosphor: "flag", label: "Bandeira", categoria: "estratégia" },
  Folder: { phosphor: "folder", label: "Pasta", categoria: "documentos" },
  Gauge: { phosphor: "gauge", label: "Indicador", categoria: "dados" },
  Gift: { phosphor: "gift", label: "Presente", categoria: "marketing" },
  Globe: { phosphor: "globe", label: "Globo", categoria: "tecnologia" },
  GraduationCap: { phosphor: "graduation-cap", label: "Formatura", categoria: "educação" },
  Handshake: { phosphor: "handshake", label: "Aperto de mão", categoria: "pessoas" },
  HeartHandshake: { phosphor: "hand-heart", label: "Mão com coração", categoria: "pessoas" },
  Home: { phosphor: "house", label: "Casa", categoria: "gestão pública" },
  Image: { phosphor: "image", label: "Imagem", categoria: "mídia" },
  Landmark: { phosphor: "bank", label: "Instituição", categoria: "gestão pública" },
  Layers: { phosphor: "stack", label: "Camadas", categoria: "estratégia" },
  Lightbulb: { phosphor: "lightbulb", label: "Ideia", categoria: "estratégia" },
  LineChart: { phosphor: "chart-line", label: "Gráfico de linha", categoria: "dados" },
  Lock: { phosphor: "lock", label: "Cadeado", categoria: "segurança" },
  Mail: { phosphor: "envelope", label: "E-mail", categoria: "comunicação" },
  MapPin: { phosphor: "map-pin", label: "Localização", categoria: "gestão pública" },
  MessageSquare: { phosphor: "chat", label: "Mensagem", categoria: "comunicação" },
  Monitor: { phosphor: "monitor", label: "Monitor", categoria: "tecnologia" },
  Newspaper: { phosphor: "newspaper", label: "Jornal", categoria: "comunicação" },
  Phone: { phosphor: "phone", label: "Telefone", categoria: "comunicação" },
  PieChart: { phosphor: "chart-pie", label: "Gráfico de pizza", categoria: "dados" },
  Presentation: { phosphor: "presentation", label: "Apresentação", categoria: "educação" },
  Rocket: { phosphor: "rocket", label: "Foguete", categoria: "marketing" },
  Scale: { phosphor: "scales", label: "Balança", categoria: "gestão pública" },
  Search: { phosphor: "magnifying-glass", label: "Buscar", categoria: "ações" },
  Settings: { phosphor: "gear", label: "Configurações", categoria: "tecnologia" },
  Share2: { phosphor: "share-network", label: "Compartilhar", categoria: "ações" },
  Shield: { phosphor: "shield", label: "Escudo", categoria: "segurança" },
  ShieldCheck: { phosphor: "shield-check", label: "Escudo confirmado", categoria: "segurança" },
  Sparkles: { phosphor: "sparkle", label: "Brilho", categoria: "marketing" },
  Star: { phosphor: "star", label: "Estrela", categoria: "resultado" },
  Target: { phosphor: "target", label: "Alvo", categoria: "estratégia" },
  ThumbsUp: { phosphor: "thumbs-up", label: "Joinha", categoria: "resultado" },
  TrendingUp: { phosphor: "trend-up", label: "Tendência de alta", categoria: "dados" },
  Trophy: { phosphor: "trophy", label: "Troféu", categoria: "resultado" },
  Users: { phosphor: "users", label: "Pessoas", categoria: "pessoas" },
  Video: { phosphor: "video-camera", label: "Vídeo", categoria: "mídia" },
  Wallet: { phosphor: "wallet", label: "Carteira", categoria: "finanças" },
  Zap: { phosphor: "lightning", label: "Raio", categoria: "marketing" },

  // Serviços públicos (mesmo mapeamento das peças do Print Studio)
  Iptu: { phosphor: "house-line", label: "IPTU", categoria: "serviços públicos" },
  Alvara: { phosphor: "certificate", label: "Alvará", categoria: "serviços públicos" },
  Certidoes: { phosphor: "seal-check", label: "Certidões", categoria: "serviços públicos" },
  Protocolo: { phosphor: "clipboard-text", label: "Protocolo", categoria: "serviços públicos" },
  Ouvidoria: { phosphor: "megaphone", label: "Ouvidoria", categoria: "serviços públicos" },
  Agendamento: { phosphor: "calendar-check", label: "Agendamento", categoria: "serviços públicos" },
  Matricula: {
    phosphor: "graduation-cap",
    label: "Matrícula escolar",
    categoria: "serviços públicos",
  },
  Saude: { phosphor: "heartbeat", label: "Saúde", categoria: "serviços públicos" },
  NotaFiscal: { phosphor: "receipt", label: "Nota fiscal", categoria: "serviços públicos" },
  Financas: { phosphor: "currency-dollar", label: "Finanças", categoria: "serviços públicos" },
  Transito: { phosphor: "car", label: "Trânsito", categoria: "serviços públicos" },
  MeioAmbiente: { phosphor: "recycle", label: "Meio ambiente", categoria: "serviços públicos" },

  // Atendimento e conversão
  WhatsApp: { phosphor: "whatsapp-logo", label: "WhatsApp", categoria: "atendimento" },
  QrCode: { phosphor: "qr-code", label: "QR Code", categoria: "atendimento" },
  PredioPublico: { phosphor: "bank", label: "Prédio público", categoria: "gestão pública" },
  Identidade: { phosphor: "identification-card", label: "Identidade", categoria: "atendimento" },
  UsuarioVerificado: {
    phosphor: "user-check",
    label: "Usuário verificado",
    categoria: "atendimento",
  },
  Clique: { phosphor: "cursor-click", label: "Clique", categoria: "ações" },
} as const satisfies Record<string, { phosphor: string; label: string; categoria: string }>;

export type IconKey = keyof typeof ICON_CATALOG;
