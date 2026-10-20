# Conector "Pexels Gove" (claude.ai)

Os artefatos do Design System, o principal e o mobile, rodam dentro do claude.ai. Lá a página não alcança sites externos. Por isso, a busca do Pexels dos geradores de criativos, de follow-ups e do LP Builder passa por um **conector da organização**. Esse conector roda no servidor do projeto (`backend/pexels-mcp.js`), e a chave do Pexels fica só nesse servidor.

## 1. Servidor (TI, AWS/ECS)

1. Publique o servidor do projeto com HTTPS, por exemplo em `https://design.gove.digital`.
2. No `.env` do servidor, ou nos segredos do ECS, que ficam fora do git:
   ```
   PEXELS_API_KEY=<chave do Pexels>
   PEXELS_MCP_TOKEN=<texto longo e aleatório, ex.: openssl rand -hex 32>
   ALLOWED_NETWORKS=<faixas da VPN gove-ecs>
   ```
3. Deixe **só** o caminho `/mcp/*` acessível pela internet, sem VPN, porque o claude.ai precisa alcançá-lo. O resto do servidor continua restrito à VPN por `ALLOWED_NETWORKS`. O token no endereço protege o conector: sem ele, a rota responde 404.

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

Sem o conector, os apps avisam que a busca está indisponível e o envio de imagens do dispositivo continua funcionando.
