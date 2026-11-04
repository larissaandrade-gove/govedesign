// Instância da fonte Grafana ligada à capacidade `mcp` do artefato (conector "Gove Grafana").
import { capability } from '@gove/runtime';
import { createGrafanaSource, type McpLike } from './grafana.ts';

export const grafana = createGrafanaSource(() => capability<McpLike>('mcp'));
