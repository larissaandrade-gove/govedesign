/**
 * Biblioteca de ícones dos cards. As chaves são os nomes gravados nas páginas
 * (nomes legados, anteriores à migração) e ficam estáveis. Rótulo, categoria e o
 * nome Phosphor de cada chave vêm de lib/gove/iconCatalog.ts (fonte única, também
 * usada no export); aqui fica só o componente React equivalente.
 */
import {
  Alarm, Bank, Bell, BookOpen, Briefcase, Buildings, CalendarBlank, Camera, ChartBar, ChartLine,
  ChartPie, Chat, Check, CheckCircle, ClipboardText, Clock, Cloud, Coins, Compass, CreditCard,
  CurrencyDollar, Database, DownloadSimple, Envelope, FileText, Flag, Folder, Funnel, Gauge,
  Gear, Gift, Globe, GraduationCap, HandHeart, Handshake, House, Image, Lightbulb, Lightning,
  Lock, MagnifyingGlass, MapPin, Medal, Monitor, Newspaper, Phone, Presentation, Pulse, Rocket,
  Scales, ShareNetwork, Shield, ShieldCheck, Sparkle, Stack, Star, Target, ThumbsUp, TrendUp,
  Trophy, Users, VideoCamera, Wallet,
  CalendarCheck, Car, Certificate, CursorClick, HouseLine, Heartbeat, IdentificationCard, Megaphone,
  QrCode, Receipt, Recycle, SealCheck, UserCheck, WhatsappLogo,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react";
import { ICON_CATALOG, type IconKey } from "@/lib/gove/iconCatalog";

/** Componente de cada chave do catálogo (o tipo exige um para cada chave). */
const COMPONENTS: Record<IconKey, PhosphorIcon> = {
  Activity: Pulse,
  AlarmClock: Alarm,
  Award: Medal,
  BarChart3: ChartBar,
  Bell: Bell,
  BookOpen: BookOpen,
  Briefcase: Briefcase,
  Building2: Buildings,
  Calendar: CalendarBlank,
  Camera: Camera,
  Check: Check,
  CheckCircle2: CheckCircle,
  ClipboardList: ClipboardText,
  Clock: Clock,
  Cloud: Cloud,
  Coins: Coins,
  Compass: Compass,
  CreditCard: CreditCard,
  Database: Database,
  DollarSign: CurrencyDollar,
  Download: DownloadSimple,
  FileText: FileText,
  Filter: Funnel,
  Flag: Flag,
  Folder: Folder,
  Gauge: Gauge,
  Gift: Gift,
  Globe: Globe,
  GraduationCap: GraduationCap,
  Handshake: Handshake,
  HeartHandshake: HandHeart,
  Home: House,
  Image: Image,
  Landmark: Bank,
  Layers: Stack,
  Lightbulb: Lightbulb,
  LineChart: ChartLine,
  Lock: Lock,
  Mail: Envelope,
  MapPin: MapPin,
  MessageSquare: Chat,
  Monitor: Monitor,
  Newspaper: Newspaper,
  Phone: Phone,
  PieChart: ChartPie,
  Presentation: Presentation,
  Rocket: Rocket,
  Scale: Scales,
  Search: MagnifyingGlass,
  Settings: Gear,
  Share2: ShareNetwork,
  Shield: Shield,
  ShieldCheck: ShieldCheck,
  Sparkles: Sparkle,
  Star: Star,
  Target: Target,
  ThumbsUp: ThumbsUp,
  TrendingUp: TrendUp,
  Trophy: Trophy,
  Users: Users,
  Video: VideoCamera,
  Wallet: Wallet,
  Zap: Lightning,
  Iptu: HouseLine,
  Alvara: Certificate,
  Certidoes: SealCheck,
  Protocolo: ClipboardText,
  Ouvidoria: Megaphone,
  Agendamento: CalendarCheck,
  Matricula: GraduationCap,
  Saude: Heartbeat,
  NotaFiscal: Receipt,
  Financas: CurrencyDollar,
  Transito: Car,
  MeioAmbiente: Recycle,
  WhatsApp: WhatsappLogo,
  QrCode: QrCode,
  PredioPublico: Bank,
  Identidade: IdentificationCard,
  UsuarioVerificado: UserCheck,
  Clique: CursorClick,
};

export interface IconMeta {
  icon: PhosphorIcon;
  label: string;
  categoria: string;
}

export const ICON_LIBRARY: Record<string, IconMeta> = Object.fromEntries(
  (Object.keys(ICON_CATALOG) as IconKey[]).map((key) => [
    key,
    { icon: COMPONENTS[key], label: ICON_CATALOG[key].label, categoria: ICON_CATALOG[key].categoria },
  ]),
);

export const getIcon = (name: string): PhosphorIcon =>
  ICON_LIBRARY[name]?.icon ?? ICON_LIBRARY["Check"]!.icon;
