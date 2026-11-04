# Conector "Gove Grafana"

Conector MCP da própria Gove (servidor em `backend/grafana-mcp.js` no repositório do Design System; guia da TI em `integrations/grafana-connector/README.md`).

O Grafana da Gove fica dentro da VPN. Este conector é a ponte:
- cada pessoa entra com o **usuário e a senha do próprio Grafana**;
- toda consulta respeita as **permissões dela no Grafana**;
- todas as ferramentas são **só de leitura** e nunca devolvem dado linha a linha.

## Como saber se está ligado
Veja se as ferramentas `list_case_dashboards`, `get_case_indicators` e `describe_dashboard` aparecem entre as suas ferramentas, no conector "Gove Grafana". Elas podem vir com um prefixo do conector no nome.
- **Não aparecem:** o conector não está ligado nesta conversa. Peça à pessoa que ligue em claude.ai → Configurações → Conectores → Gove Grafana → Conectar. Ou siga com os números enviados por ela (CSV, planilha ou digitados).
- **Não confunda com o conector público "Grafana Cloud":** ele não alcança o Grafana da Gove.

## Ferramentas

### `list_case_dashboards`
Lista os dashboards de cases (um por município, tag `cases`) que a pessoa conectada pode ver.

Entrada (tudo opcional):
```json
{ "query": "parte do nome do município ou do título", "folder": "nome da pasta" }
```
Saída:
```json
{
  "tag": "cases",
  "total": 2,
  "dashboards": [
    { "uid": "abc123", "title": "Cases - São Carlos/SP", "municipio": "São Carlos", "uf": "SP", "folder": "Cases", "url": "https://…/d/abc123/…" }
  ]
}
```
- Use `query` com o nome do município.
- **Mais de um resultado:** mostre as opções (município, UF, título, pasta) e peça para a pessoa escolher.
- **Nenhum resultado:** os dashboards não têm a tag `cases`, ou a pessoa não tem permissão. Peça os números de outro jeito.

### `get_case_indicators`
Roda as consultas dos painéis mapeados no período e devolve cada indicador já reduzido a um número.

Entrada (tudo obrigatório):
```json
{ "dashboard_uid": "abc123", "from": "2026-01", "to": "2026-06" }
```
`from` e `to` aceitam `AAAA-MM`, `AAAA-MM-DD`, data ISO ou `now-90d` / `now`. Para o case, use meses (`AAAA-MM`); o fuso é -03:00.

Saída:
```json
{
  "dashboard_uid": "abc123",
  "dashboard_title": "Cases - São Carlos/SP",
  "municipio": "São Carlos", "uf": "SP",
  "period": { "from": "2026-01-01T03:00:00.000Z", "to": "2026-07-01T02:59:59.999Z" },
  "indicators": [
    { "id": "atendimentos", "unit": "numero", "value": 600, "before": 200, "after": 600, "panel_title": "Atendimentos realizados", "panel_id": 2 },
    { "id": "funcionalidades", "unit": "lista", "items": ["Lembretes de IPTU", "Segunda via"], "panel_title": "Funcionalidades", "panel_id": 9 }
  ],
  "unmapped_panels": [{ "id": 6, "title": "Mapa por bairro", "type": "geomap" }],
  "failed_panels": [{ "id": 7, "title": "Taxa de abertura", "indicator": "taxa_abertura", "reason": "consulta do painel falhou no Grafana" }]
}
```
- Os ids e as unidades são os de `indicadores.md`.
- `before` é o **período anterior, de mesmo tamanho**, e só vem nos indicadores com comparação.
- Para o `case.json`: copie `value`, `before`, `after` e `items` de cada indicador para `indicadores.<id>`. Os nomes em inglês são aceitos; os em português ficam mais legíveis.
- `percentunit` (0–1) já vem convertido para 0–100.
- `unmapped_panels` e `failed_panels` **não são erro do case**:
  - conte à pessoa quais indicadores não vieram;
  - pergunte se ela tem esses números;
  - não invente.

### `describe_dashboard`
Diagnóstico: lista os painéis (id, título, tipo, fonte de dados, nº de consultas) e o indicador que cada um alimenta (`indicator: null` = não mapeado).

Entrada: `{ "dashboard_uid": "abc123" }`.

Use quando um indicador esperado não veio, para dizer à pessoa (ou à TI) qual painel precisa de ajuste no mapa (`backend/grafana/indicators.json`).

## Erros e o que dizer
A ferramenta devolve `isError` com `structuredContent.error.code`:

| Código | Mensagem para a pessoa |
| --- | --- |
| `forbidden` | Sem permissão no Grafana para este dashboard. Peça acesso a quem administra o Grafana ou escolha outro município. |
| `not_found` | Dashboard não encontrado no Grafana. Liste os municípios de novo. |
| `timeout` | O Grafana demorou demais. Tente um período menor ou tente de novo. |
| `invalid_argument` | Período ou uid inválido. Confira as datas (AAAA-MM). |
| `unavailable` | O Grafana não respondeu agora. Tente de novo em alguns minutos. |
| `bad_response` / `error` | O Grafana não conseguiu responder. Tente de novo ou envie os números. |

Erros da conexão:
- **Sessão expirada:** o claude.ai pede o login de novo. A pessoa precisa entrar outra vez no Gove Grafana em Configurações → Conectores.
- **Limite de chamadas:** espere alguns segundos.

Em qualquer erro, ofereça o caminho manual: números digitados, CSV ou planilha.

## Regras de uso
- Só leitura; consulte só o município do case.
- Não peça nem guarde senha: o login é feito pela tela do conector.
- Os números do Grafana **ainda precisam ser confirmados com a pessoa** antes de entrar no case (passo 3 do fluxo).
