import { useEffect, useState } from 'react';
import { GRAFANA_PENDING, grafana, grafanaMessage, type GrafanaStatus } from '@/lib/grafana.ts';
import { Note } from './ui.tsx';

/** Aviso (não bloqueia) sobre a importação do Grafana, que entra depois da configuração. */
export function GrafanaNote() {
  const [status, setStatus] = useState<GrafanaStatus | null>(null);
  useEffect(() => {
    void grafana.status().then(setStatus);
  }, []);
  if (status === 'ready' || status == null) return null;
  return (
    <Note>
      <strong className="text-text-primary">Importar do Grafana: em breve.</strong> {status === 'pending-setup' ? `${GRAFANA_PENDING}; a importação será liberada depois da configuração.` : grafanaMessage({})} Enquanto isso, preencha os números à mão ou importe um CSV.
    </Note>
  );
}
