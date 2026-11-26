# Conector "Pexels Gove" (claude.ai)

Os artefatos do Design System rodam dentro do claude.ai, e lá a página não alcança sites externos. Por isso, dois recursos passam por um **conector da organização** chamado **Pexels Gove**:
- a busca de fotos do Pexels nos Criativos (mídia paga e follow-ups) e nas Landing Pages;
- a captura do site do domicílio eletrônico, no modelo Portal Cidadão do Kit de Boas-Vindas.

A chave do Pexels nunca fica no artefato. Ela fica só no conector.

Há dois jeitos de ter o conector:

| | Parte A: conector leve (agora) | Parte B: servidor da Gove (TI, depois) |
| --- | --- | --- |
| Onde roda | Cloudflare Workers, plano gratuito | servidor do projeto (`backend/`) |
| Quem faz | qualquer pessoa, seguindo este guia | TI |
| Busca de fotos | sim | sim |
| Captura de site (Kit) | não: o Kit avisa e aceita a imagem enviada à mão | sim |

Os dois usam o **mesmo nome** e as **mesmas ferramentas**. Trocar um pelo outro é só trocar a URL no claude.ai.

---

## Parte A: conector leve na Cloudflare (passo a passo)

Leva uns 20 minutos. Você não precisa saber programar: é copiar e colar comandos no Terminal.

### Antes de começar

Você vai precisar de:
- **Node.js** instalado no computador. Baixe a versão "LTS" em [nodejs.org](https://nodejs.org) e instale como qualquer programa.
- **Esta pasta do projeto** no computador, com a subpasta `integrations/pexels-connector/worker`.
- **Uma chave da API do Pexels.** Crie de graça em [pexels.com/api](https://www.pexels.com/api/), com a conta da Gove. A chave é um texto longo de letras e números.
- **Acesso de administrador da organização no claude.ai**, para o passo 6. Se você não for admin, peça esse passo a quem for.

> A chave do Pexels e o token são senhas. Não cole em chats, e-mails, documentos ou no git. Guarde-os num cofre de senhas.

### 1. Crie a conta gratuita na Cloudflare

1. Acesse [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).
2. Cadastre o e-mail e a senha e confirme o e-mail.
3. Não é preciso cadastrar cartão nem domínio: o plano gratuito basta.

### 2. Abra o Terminal na pasta do conector e entre na Cloudflare

1. Abra o **Terminal**. No Mac, procure "Terminal" no Spotlight. No Windows, abra o "PowerShell".
2. Entre na pasta do conector. Troque o começo do caminho pelo lugar onde está o projeto no seu computador:
   ```
   cd caminho/do/projeto/integrations/pexels-connector/worker
   ```
3. Entre na sua conta da Cloudflare:
   ```
   npm run login
   ```
   O navegador abre uma página da Cloudflare. Clique em **Allow** e volte ao Terminal. Na primeira vez, o comando demora um pouco mais, porque baixa a ferramenta da Cloudflare (`wrangler`).

### 3. Publique o conector

```
npm run deploy
```

- Na primeira vez, a Cloudflare pode pedir um nome para o seu subdomínio `workers.dev`. Use, por exemplo, `gove`.
- No fim, o Terminal mostra o endereço do conector, parecido com:
  `https://pexels-gove.gove.workers.dev`
  Anote esse endereço.

Por enquanto o conector responde "não encontrado" a tudo, porque ainda não tem token. É assim mesmo.

### 4. Guarde os dois segredos na Cloudflare

**a) Gere o token**, um texto aleatório que funciona como senha do endereço. Use um destes comandos:
- no Mac:
  ```
  openssl rand -hex 32
  ```
- no Mac ou no Windows:
  ```
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
Copie o resultado, com 64 letras e números, e guarde no cofre de senhas.

**b) Grave o token na Cloudflare:**
```
npm run segredo:token
```
Quando o Terminal pedir o valor, cole o token e aperte Enter. O texto não aparece enquanto você cola: é normal.

**c) Grave a chave do Pexels:**
```
npm run segredo:chave
```
Cole a chave do Pexels e aperte Enter.

Os segredos valem na hora. Não é preciso publicar de novo.

### 5. Teste o conector

O endereço completo do conector é o endereço do passo 3 seguido de `/mcp/` e do token:
```
https://pexels-gove.gove.workers.dev/mcp/<token>
```

Teste no Terminal, trocando `<endereço completo>`:
- no Mac:
  ```
  curl -s -X POST "<endereço completo>" -H "content-type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
  ```
- no Windows (PowerShell):
  ```
  Invoke-RestMethod -Method Post -Uri "<endereço completo>" -ContentType "application/json" -Body '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | ConvertTo-Json -Depth 6
  ```

Se der certo, a resposta lista `search_photos`, `get_image` e `capture_site`. Se não aparecer nada, confira o token (veja "Problemas comuns").

Para testar uma busca de verdade no Mac:
```
curl -s -X POST "<endereço completo>" -H "content-type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_photos","arguments":{"query":"prefeitura","per_page":1}}}' | head -c 400
```
A resposta traz `"photographer"` e uma miniatura que começa com `data:image/jpeg;base64`.

### 6. Cadastre o conector no claude.ai (admin da organização)

1. No claude.ai, abra **Configurações da organização** → **Conectores**.
2. Clique em **Adicionar conector personalizado**.
3. Preencha:
   - **Nome:** `Pexels Gove`. Use exatamente esse nome, com P e G maiúsculos e um espaço, porque os apps procuram por ele.
   - **URL:** o endereço completo do passo 5, com o token.
   - Deixe os campos de OAuth em branco, se aparecerem.
4. Salve.

### 7. Cada pessoa liga o conector (uma vez)

Cada pessoa que vai usar a busca de fotos faz isto uma vez:
1. No claude.ai, abra **Configurações** → **Conectores**.
2. Encontre **Pexels Gove** e clique em **Conectar**.

### 8. Use no Design System

1. Abra o artefato do Design System no claude.ai.
2. **Criativos:** abra o Gerador de criativos, depois **Fundo** → **Usar fotos de fundo**, e digite um termo na busca, por exemplo "prefeitura".
3. **Landing Pages:** selecione um bloco de imagem, ou uma caixa com fundo de imagem, e use **Banco de imagens (Pexels)**.
4. Na primeira busca, o claude.ai pergunta se a página pode usar o Pexels Gove. Clique em **Permitir**.
5. Escolha uma foto: ela entra na peça com o crédito do fotógrafo.

**Kit de Boas-Vindas:** com o conector leve, "Capturar do site" avisa que a captura precisa do servidor da Gove. Envie a imagem da tela do celular manualmente, logo abaixo do botão. A captura automática chega com a Parte B.

### Problemas comuns

| O que aparece | O que fazer |
| --- | --- |
| "Ligue o conector Pexels Gove em claude.ai → Configurações → Conectores" | A pessoa não ligou o conector (passo 7), ou o nome cadastrado está diferente de `Pexels Gove` (passo 6). |
| "O Pexels Gove não foi permitido nesta página" | Na primeira busca, a permissão foi recusada. Recarregue o artefato e clique em **Permitir**. |
| O conector não conecta no claude.ai, ou o teste do passo 5 não responde nada | O token na URL está errado ou incompleto. Qualquer diferença faz o conector responder "não encontrado". Confira a URL ou grave um token novo (passo 4b) e atualize a URL no claude.ai. |
| "Busca no Pexels não configurada no servidor" | Falta a chave do Pexels. Repita o passo 4c. |
| "Limite de buscas do Pexels atingido" | O plano gratuito do Pexels permite 200 buscas por hora e 20.000 por mês. Espere alguns minutos. |
| "O Pexels não respondeu agora" | O Pexels está fora do ar ou recusou a chave. Confira a chave em [pexels.com/api](https://www.pexels.com/api/) e grave de novo (passo 4c). |
| "Busca no Pexels indisponível aqui" | A página foi aberta fora do claude.ai, ou o artefato não recebeu o acesso a conectores. Abra o Design System pelo claude.ai. |

**Trocar o token**, por exemplo se ele vazou: gere outro (passo 4a), grave com `npm run segredo:token` e troque a URL no claude.ai (passo 6). O token antigo deixa de funcionar na hora.

**Limites do plano gratuito da Cloudflare:** 100 mil pedidos por dia, folga de sobra para a equipe.

### O que tem na pasta `worker/`

- `src/index.js`: o conector. Não tem dependências e não guarda nada.
- `wrangler.toml`: nome (`pexels-gove`) e configuração. Não tem segredos.
- `package.json`: os comandos deste guia, com a versão do `wrangler` fixa. `npm run check` valida o pacote sem publicar.
- O teste automático fica em `test/pexels-worker.test.js` e roda com `npm test` na raiz do projeto.

---

## Parte B: servidor completo da Gove (TI)

O servidor do projeto (`backend/pexels-mcp.js`) tem as mesmas ferramentas e também faz a captura de site.

1. Publique o servidor do projeto com HTTPS, por exemplo em `https://design.gove.digital`.
2. No `.env` do servidor, ou nos segredos do ECS, que ficam fora do git:
   ```
   PEXELS_API_KEY=<chave do Pexels>
   PEXELS_MCP_TOKEN=<texto longo e aleatório, ex.: openssl rand -hex 32>
   ALLOWED_NETWORKS=<faixas da VPN gove-ecs>
   ```
3. Instale o Chromium na imagem do servidor, para a captura de sites. Use a mesma versão do `playwright-core` do `package.json`:
   ```
   npx playwright@1.56.1 install --with-deps chromium
   ```
   Se preferir um Chromium do sistema, informe o caminho em `CHROMIUM_PATH`. Sem Chromium, a busca do Pexels continua funcionando e a captura avisa que está indisponível.
4. Deixe **só** o caminho `/mcp/*` acessível pela internet, sem VPN, porque o claude.ai precisa alcançá-lo. O resto do servidor continua restrito à VPN por `ALLOWED_NETWORKS`. O token no endereço protege o conector: sem ele, a rota responde 404.
5. No claude.ai, em Configurações da organização → Conectores, **troque só a URL** do conector `Pexels Gove` para:
   `https://design.gove.digital/mcp/<PEXELS_MCP_TOKEN>`
   Mantenha o mesmo nome. As pessoas não precisam fazer nada.
6. Depois de testar, o Worker da Parte A pode ser apagado no painel da Cloudflare (Workers & Pages → pexels-gove → Settings → Delete).

## Ferramentas

| Ferramenta | O que faz |
| --- | --- |
| `search_photos` | busca em pt-BR (orientação e paginação) e devolve as miniaturas e o crédito do fotógrafo |
| `get_image` | devolve a foto escolhida (até 1600 px) para o canvas ou para o HTML exportado |
| `capture_site` | servidor da Gove: abre um site público num celular (390×844, densidade 3) e devolve a captura da tela em JPEG, com 1170×2532 px. Conector leve: responde que a captura precisa do servidor da Gove |

As imagens voltam em data URI, porque o artefato não carrega imagens de outros sites. Só imagens de `images.pexels.com` são aceitas, com até 6 MB.

Sem o conector, os apps avisam que a busca ou a captura está indisponível, e o envio de imagens do dispositivo continua funcionando.

## Captura de sites (Kit de Boas-Vindas, Portal Cidadão)

- **Quando captura:** ao escolher um município no modelo Portal Cidadão, o Editor captura o site do domicílio eletrônico sozinho se ainda não houver captura ou se ela tiver mais de 30 dias. O botão **Atualizar captura** força uma captura nova, e trocar o site no cadastro invalida a captura antiga.
- **O que a fila usa:** sempre a captura mais recente do município, a menos que uma imagem tenha sido enviada à mão.
- **Onde roda:** no servidor do projeto, a rota é `POST /print-studio/api/municipios/:id/captura`. No artefato, a captura passa por este conector, e só funciona com o servidor da Gove (Parte B).
- **Segurança:** o servidor só visita sites públicos, em http ou https nas portas 80 e 443. O endereço, cada redirecionamento e cada recurso da página são conferidos, e endereços de rede interna, loopback, link-local e metadados da nuvem são bloqueados. A captura tem limite de tempo e de tamanho e roda uma por vez.
