# Conector "Pexels Gove" (claude.ai)

Os artefatos do Design System, o principal e o mobile, rodam dentro do claude.ai. Lá a página não alcança sites externos. Por isso, dois recursos passam por um **conector da organização**:
- a busca do Pexels dos geradores de criativos, de follow-ups e do LP Builder;
- a captura do site do domicílio eletrônico, usada no modelo Portal Cidadão do Print Studio.

Esse conector roda no servidor do projeto (`backend/pexels-mcp.js`), e a chave do Pexels fica só nesse servidor.

## 1. Servidor (TI, AWS/ECS)

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

Endereço do conector: `https://design.gove.digital/mcp/<PEXELS_MCP_TOKEN>`

## 2. claude.ai (admin da organização)

Configurações da organização → **Conectores** → Adicionar conector personalizado:
- **Nome:** `Pexels Gove`. Use exatamente esse nome, porque os artefatos procuram por ele.
- **URL:** o endereço acima.

Depois, cada pessoa ativa o conector no próprio claude.ai, uma vez. Na primeira busca, o artefato pede permissão para usá-lo.

## Ferramentas

| Ferramenta | O que faz |
| --- | --- |
| `search_photos` | busca em pt-BR (orientação e paginação) e devolve as miniaturas e o crédito do fotógrafo |
| `get_image` | devolve a foto escolhida (até 1600 px) para o canvas ou para o HTML exportado |
| `capture_site` | abre um site público num celular (390×844, densidade 3) e devolve a captura da tela em JPEG, com 1170×2532 px |

Sem o conector, os apps avisam que a busca ou a captura está indisponível, e o envio de imagens do dispositivo continua funcionando.

## Captura de sites (Print Studio, Portal Cidadão)

- **Quando captura:** ao escolher um município no modelo Portal Cidadão, o Editor captura o site do domicílio eletrônico sozinho se ainda não houver captura ou se ela tiver mais de 30 dias. O botão **Atualizar captura** força uma captura nova, e trocar o site no cadastro invalida a captura antiga.
- **O que a fila usa:** sempre a captura mais recente do município, a menos que uma imagem tenha sido enviada à mão.
- **Onde roda:** no servidor do projeto, a rota é `POST /print-studio/api/municipios/:id/captura`. No artefato, a captura passa por este conector.
- **Segurança:** o servidor só visita sites públicos, em http ou https nas portas 80 e 443. O endereço, cada redirecionamento e cada recurso da página são conferidos, e endereços de rede interna, loopback, link-local e metadados da nuvem são bloqueados. A captura tem limite de tempo e de tamanho e roda uma por vez.
