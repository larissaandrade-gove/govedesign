// Grafana pelo conector "Grafana Cloud" do claude.ai (capacidade `mcp` do artefato,
// com as credenciais de quem está vendo a página, como o Pexels em artifact-runtime/pexels.ts).
//
// PENDENTE (Etapa 0 do plano): o conector ainda não foi ligado e diagnosticado, então os
// nomes das ferramentas, os argumentos e o formato das respostas são desconhecidos. Pelas regras
// do runtime, a interface não é adivinhada: esta camada expõe o contrato que o app usa e responde
// "pending-setup" até a configuração. Nenhum dado de exemplo é gerado aqui.
import type { IndicatorId, IndicatorValue } from '../data/indicators.ts';

/** Nome do conector exatamente como cadastrado no claude.ai. */
export const GRAFANA_CONNECTOR = 'Grafana Cloud';

export const GRAFANA_PENDING = 'Conector do Grafana ainda não configurado neste app';

export type GrafanaStatus = 'pending-setup' | 'ready' | 'unavailable';
export type GrafanaMunicipio = { id: string; nome: string; uf?: string; dashboardUid?: string };
export type GrafanaIndicators = Partial<Record<IndicatorId, Partial<IndicatorValue>>>;

export interface GrafanaSource {
  status(): Promise<GrafanaStatus>;
  /** Municípios com dashboard (um dashboard por município). */
  listMunicipios(): Promise<GrafanaMunicipio[]>;
  /** Indicadores de um município no período ('AAAA-MM'). */
  fetchIndicators(municipio: GrafanaMunicipio, periodo: { inicio: string; fim: string }): Promise<GrafanaIndicators>;
}

export class GrafanaError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? grafanaMessage({ code }));
    this.code = code;
  }
}

/** Mensagem curta por código de erro (mesmos códigos do conector Pexels). */
export function grafanaMessage(e: unknown): string {
  switch ((e as { code?: string } | null)?.code) {
    case 'pending-setup':
      return `${GRAFANA_PENDING}. Preencha os números à mão ou importe um CSV.`;
    case 'server_not_connected':
    case 'not_in_manifest':
      return 'Grafana não conectado. Ligue o conector Grafana Cloud em claude.ai → Configurações → Conectores, ou preencha à mão.';
    case 'needs_reauth':
      return 'Reconecte o Grafana Cloud em claude.ai → Configurações → Conectores.';
    case 'rate_limited':
      return 'Muitas consultas seguidas ao Grafana. Tente em alguns segundos.';
    default:
      return 'Grafana indisponível no momento. Preencha os números à mão ou importe um CSV.';
  }
}

/** Implementação atual: aguardando a configuração do conector. */
export const grafana: GrafanaSource = {
  status: async () => 'pending-setup',
  listMunicipios: async () => {
    throw new GrafanaError('pending-setup');
  },
  fetchIndicators: async () => {
    throw new GrafanaError('pending-setup');
  },
};
