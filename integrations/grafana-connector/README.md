# Conector "Gove Grafana" (claude.ai)

O Grafana da Gove fica dentro da VPN, em domínio próprio, por causa dos dados sensíveis. Por isso o conector público "Grafana Cloud" do claude.ai não o alcança. O **Gove Grafana** é um conector da própria Gove que:
- roda no servidor do projeto (`backend/grafana-mcp.js`), que já fica na AWS dentro da VPN;
- exige que **cada pessoa entre com o usuário e a senha do próprio Grafana**;
- faz toda consulta **com a sessão e as permissões dessa pessoa no Grafana**: quem não vê um dashboard no Grafana também não o vê pelo conector.

O app **Gerador de cases** (`cases/`) usa o conector para listar os municípios e buscar os indicadores do período. O Claude no chat também pode usá-lo.

## O que o conector faz

Ferramentas, todas só de leitura:

| Ferramenta | O que faz |
| --- | --- |
| `list_case_dashboards` | lista os dashboards de cases (tag `cases`) que a pessoa vê, com uid, título, município provável, UF, pasta e endereço; aceita `query` (parte do nome) e `folder` |
| `describe_dashboard` | lista os painéis de um dashboard (id, título, tipo, fonte de dados) e o indicador que cada um alimenta; serve para ajustar o mapa |
| `get_case_indicators` | roda as consultas dos painéis mapeados no período (`from`/`to` em `AAAA-MM`, `AAAA-MM-DD`, ISO ou `now-90d`) e devolve cada indicador já reduzido a um número, com antes/depois quando cabe |

Resposta de `get_case_indicators`:
```json
{
  "municipio": "…", "uf": "SP",
  "period": { "from": "2026-01-01T03:00:00.000Z", "to": "2026-07-01T02:59:59.999Z" },
  "indicators": [{ "id": "atendimentos", "value": 600, "before": 200, "after": 600, "unit": "numero", "panel_title": "Atendimentos realizados" }],
  "unmapped_panels": [{ "id": 6, "title": "Mapa por bairro", "type": "geomap" }],
  "failed_panels": []
}
```
- **Nunca sai dado linha a linha.** Saem só números reduzidos (último valor, soma, média…) e, no indicador de funcionalidades, os nomes das funcionalidades.
- Os ids e as unidades são os de `cases/src/data/indicators.ts`.

## 1. Servidor (TI, AWS/ECS)

1. No `.env` do servidor, ou nos segredos do ECS, que ficam fora do git:
   ```
   GRAFANA_URL=<endereço interno do Grafana, ex.: https://grafana.interno.gove.digital>
   GRAFANA_CONNECTOR_SECRET=<texto longo e aleatório: openssl rand -hex 32>
   PUBLIC_BASE_URL=<endereço público deste servidor, ex.: https://design.gove.digital>
   ```
   Opcionais:

   | Variável | Padrão | Para quê |
   | --- | --- | --- |
   | `GRAFANA_CONNECTOR_REDIRECTS` | `https://claude.ai/api/mcp/auth_callback,https://claude.com/api/mcp/auth_callback` | endereços de retorno aceitos no login, com comparação exata |
   | `GRAFANA_CASES_TAG` | `cases` | tag dos dashboards de cases |
   | `GRAFANA_SESSION_COOKIE` | `grafana_session` | nome do cookie de sessão, se o Grafana usar outro (`login_cookie_name`) |
   | `TRUST_PROXY` | — | atrás do balanceador, para o limite de tentativas ver o IP real |

   Sem `GRAFANA_URL`, `GRAFANA_CONNECTOR_SECRET` (mín. 32 caracteres) ou `PUBLIC_BASE_URL`, as rotas do conector respondem **503** com a variável que falta. O resto do servidor sobe normalmente.
2. Abra para a internet, sem VPN, **só** estes caminhos, porque o claude.ai precisa alcançá-los:
   - `/mcp/grafana`;
   - `/oauth/*` (registro, tela de login, token e os arquivos da tela);
   - `/.well-known/oauth-protected-resource*` e `/.well-known/oauth-authorization-server*`.

   O resto continua restrito à VPN por `ALLOWED_NETWORKS`. O conector Pexels Gove segue em `/mcp/<token>`.
3. O servidor precisa alcançar o `GRAFANA_URL` pela rede interna. Use HTTPS.
4. **Teste real (com a TI):** depois de publicar, siga o passo 3, conecte com um usuário do Grafana e rode `describe_dashboard` num dashboard de cases para conferir o mapa de painéis.

## 2. Grafana (TI)

- **Login:** cada pessoa usa o próprio usuário do Grafana, com login por usuário e senha habilitado (`disable_login_form = false`). Contas só de SSO sem senha local não funcionam neste conector.
- **Dashboards:** um por município, com a tag `cases` (ou a de `GRAFANA_CASES_TAG`). O nome do município vem do título, por exemplo `Cases - São Carlos/SP` ou `São Carlos - SP`.
- **Permissões:** valem as do Grafana. Para ver um município pelo conector, a pessoa precisa ver o dashboard e a fonte de dados no Grafana.
- **Nomes dos painéis:** o mapa em `backend/grafana/indicators.json` reconhece títulos como estes, sem diferença de maiúsculas ou acentos:

  | Indicador (`id`) | Unidade | Título do painel |
  | --- | --- | --- |
  | `atendimentos` | número | Atendimentos, Total de atendimentos |
  | `ganho_financeiro` | R$ | Ganho financeiro, Economia gerada |
  | `arrecadacao_pos_disparo` | R$ | Arrecadação após disparo |
  | `aumento_arrecadacao_pct` | % | Aumento de arrecadação (%) |
  | `aumento_arrecadacao_valor` | R$ | Aumento de arrecadação (R$), Aumento de arrecadação |
  | `taxa_abertura` | % | Taxa de abertura |
  | `avaliacao_media` | nota | Avaliação média, Nota média |
  | `avaliacao_positiva` | % | Avaliação positiva, Índice de avaliação positiva |
  | `funcionalidades` | lista | Funcionalidades…, Casos de uso |

  - **Ajuste por dashboard:** quando um título não segue o padrão, use `overrides` com o id do painel, que aparece em `describe_dashboard`:
    ```json
    "overrides": { "<uid do dashboard>": { "12": "atendimentos", "15": null } }
    ```
    `null` ignora o painel.
  - **Redução:** `reduce: "panel"` usa o cálculo do próprio painel (por exemplo, *Last*, *Total* ou *Mean* do painel Stat). Também aceita `last`, `sum`, `mean`, `max` ou `min`. Com várias séries, soma os valores; com `mean`, tira a média.
  - **Percentuais:** painéis com unidade `percentunit` (0–1) viram 0–100.
  - **Antes/depois:** indicadores com `comparison: true` calculam também o período anterior, de mesmo tamanho.
  - **Variáveis do dashboard** (`$cidade`, `${ds}`) entram com o valor salvo no dashboard.
  - **Fuso:** os meses (`AAAA-MM`) usam o fuso de `timezone_offset` (padrão `-03:00`).

## 3. claude.ai (admin da organização)

Configurações da organização → **Conectores** → Adicionar conector personalizado:
- **Nome:** `Gove Grafana`. Use exatamente esse nome, porque o Gerador de cases procura por ele.
- **URL:** `${PUBLIC_BASE_URL}/mcp/grafana`, por exemplo `https://design.gove.digital/mcp/grafana`.
- Não informe Client ID nem segredo: o claude.ai se registra sozinho (registro dinâmico) como cliente público, com PKCE.

No artefato do Design System, o manifesto da capacidade `mcp` precisa declarar `{ server: 'Gove Grafana', tools: ['list_case_dashboards', 'get_case_indicators', 'describe_dashboard'] }`.

## 4. Como cada pessoa conecta

1. No claude.ai: Configurações → Conectores → **Gove Grafana** → Conectar.
2. Abre a tela Gove **"Entre com seu usuário do Grafana"**. A pessoa digita o usuário e a senha do Grafana e clica em **Entrar e conectar**.
3. Pronto. No Gerador de cases, o passo Município lista os dashboards, e a aba Grafana do passo Indicadores tem o botão **Buscar no Grafana**. Os números entram nos campos, e a pessoa ainda pode editar. O preenchimento à mão e o CSV continuam funcionando.

Quando a sessão do Grafana expira, o claude.ai pede o login de novo.

## Segurança

- **Senha:** vai direto para o `GRAFANA_URL/login` e **nunca é guardada nem registrada em log**. Fica guardado só o cookie de sessão do Grafana da pessoa, criptografado com AES-256-GCM (chave derivada de `GRAFANA_CONNECTOR_SECRET`).
- **Tokens do claude.ai:** ficam só como hash SHA-256.
  - O token de acesso vale 1 hora.
  - O de renovação vale 7 dias, renovados a cada uso, até 30 dias no total. A cada renovação ele é trocado, e reusar um token antigo derruba a conexão inteira.
- **Sessão expirada:** quando o Grafana recusa a sessão, a chamada responde 401 com `WWW-Authenticate`, a conexão é apagada e o claude.ai pede o login de novo. O conector também acompanha a renovação de sessão do Grafana 10+ (`/api/user/auth-tokens/rotate`).
- **Login:**
  - **PKCE S256** obrigatório;
  - `redirect_uri` só da lista;
  - formulário com proteção **CSRF**;
  - **limite de tentativas**: 5 por IP e usuário, 20 por IP, a cada 15 minutos;
  - mensagem única "Usuário ou senha inválidos", que não revela se o usuário existe.
- **Tela de login:** não carrega nada de fora (logo e fontes vêm do próprio servidor), tem CSP restrita e não abre dentro de outro site.
- **Registro de uso:** a tabela `grafana_audit` no SQLite guarda quem (login do Grafana), a ferramenta, o dashboard, o horário e o resultado. **Os valores não são guardados.** Para consultar:
  ```
  sqlite3 db/revisor.sqlite "SELECT at, grafana_login, tool, dashboard_uid, outcome FROM grafana_audit ORDER BY id DESC LIMIT 50"
  ```
- **Trocar o `GRAFANA_CONNECTOR_SECRET`** invalida as sessões guardadas: todo mundo entra de novo.

## Problemas comuns

| Sintoma | O que ver |
| --- | --- |
| 503 "não configurado" | falta `GRAFANA_URL`, `GRAFANA_CONNECTOR_SECRET` (mín. 32) ou `PUBLIC_BASE_URL` |
| O claude.ai não abre a tela de login | `/.well-known/*` e `/oauth/*` precisam estar abertos para a internet; o `PUBLIC_BASE_URL` precisa ser o endereço público com HTTPS |
| "Endereço de retorno não permitido" | o claude.ai usou um retorno fora de `GRAFANA_CONNECTOR_REDIRECTS`; inclua o endereço exato |
| "Usuário ou senha inválidos" com a senha certa | a conta é só SSO ou o login por formulário está desligado no Grafana; o Grafana também bloqueia depois de várias tentativas erradas |
| "O Grafana não respondeu agora" | o servidor não alcança o `GRAFANA_URL` (rede, DNS ou certificado) |
| "O Grafana não devolveu o cookie de sessão" | o Grafana usa outro nome de cookie: ajuste `GRAFANA_SESSION_COOKIE` |
| Lista de municípios vazia | os dashboards não têm a tag `cases`, ou a pessoa não tem permissão neles |
| "Sem permissão no Grafana para este dashboard" | a pessoa não vê o dashboard ou a fonte de dados no Grafana |
| Indicador não vem | rode `describe_dashboard`: o painel aparece com `indicator: null`; ajuste o título ou use `overrides` |
| Painel em `failed_panels` | a consulta falhou no Grafana ou demorou mais de 15 s; tente um período menor |
| No app: "Gove Grafana não conectado" | a pessoa precisa ligar o conector em claude.ai → Configurações → Conectores |
