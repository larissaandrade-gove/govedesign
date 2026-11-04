# Indicadores do case

Os 9 indicadores abaixo são os únicos que as peças aceitam. Os ids e as unidades são os mesmos do conector **Gove Grafana** e do app "Gerador de cases", então os dados do Grafana entram sem conversão.

| id | Indicador | Unidade | Antes/depois | Rótulo no KPI |
| --- | --- | --- | --- | --- |
| `atendimentos` | Atendimentos | número | sim | atendimentos realizados |
| `ganho_financeiro` | Ganho financeiro | R$ | não | de ganho financeiro |
| `arrecadacao_pos_disparo` | Arrecadação após disparo | R$ | sim | arrecadados após o disparo |
| `aumento_arrecadacao_pct` | Aumento de arrecadação entre munícipes que receberam disparo (%) | % | não | de aumento na arrecadação com disparo |
| `aumento_arrecadacao_valor` | Aumento de arrecadação entre munícipes que receberam disparo (R$) | R$ | não | a mais na arrecadação com disparo |
| `taxa_abertura` | Taxa de abertura | % | não | de taxa de abertura |
| `avaliacao_media` | Avaliação média | nota (de 5 ou de 10) | não | (bloco "Avaliação") |
| `avaliacao_positiva` | Índice de avaliação positiva | % | não | (bloco "Avaliação") |
| `funcionalidades` | Funcionalidades e casos de uso utilizados | lista de nomes | não | (bloco "Funcionalidades usadas") |

## Como escrever no `case.json`

```json
"indicadores": {
  "atendimentos": { "valor": 12450, "antes": 8200, "depois": 12450 },
  "ganho_financeiro": { "valor": 1234567 },
  "taxa_abertura": { "valor": 45.3 },
  "avaliacao_media": { "valor": 4.7 },
  "funcionalidades": { "itens": ["Lembretes de IPTU", "Segunda via"] }
}
```
- **Números sempre como número JSON**, sem `R$`, `%`, ponto de milhar ou vírgula decimal: `1234567`, `12.5`.
- **Percentuais de 0 a 100**: `12.5` é 12,5%. Se a fonte trouxer 0–1 (0,125), multiplique por 100 e confirme com a pessoa.
- **Antes/depois:** só em `atendimentos` e `arrecadacao_pos_disparo`. Sem `valor`, vale o `depois`.
- `"incluir": false` tira o indicador das peças sem apagar o dado.
- Os nomes do conector (`value`, `before`, `after`, `items`, `enabled`) também são aceitos.
- Indicador sem dado: **não inclua a chave**. Nunca preencha com zero para "completar".

## Formatação pt-BR (feita pelos scripts)

| Unidade | Regra | Exemplos |
| --- | --- | --- |
| número | milhar com ponto; abaixo de 100, até 1 casa; a partir de 1 milhão, compacto | 1.234 · 45,5 · 1,2 mi · 3,4 bi |
| R$ | até 999: com centavos se houver; 1.000 a 99.999: inteiro; 100 mil a 999 mil: "mil"; depois "mi" e "bi" | R$ 950 · R$ 12.345 · R$ 350 mil · R$ 1,2 mi |
| % | até 1 casa | 12,5% · 92% |
| nota | 1 casa e a escala | 4,7 de 5 |
| período | mês abreviado | jan. a jun. de 2026 · nov. de 2025 a abr. de 2026 · maio de 2026 |

Arredondamento: metade para cima (como o `Intl.NumberFormat` do app). Nos textos, escreva os números **do mesmo jeito** que as peças mostram (ex.: "R$ 1,2 mi", "12,5%").

## O que vira cada bloco

- **KPIs (até 6):** os indicadores numéricos com dado, na ordem da tabela, exceto as duas avaliações.
- **Gráfico antes/depois:** o primeiro indicador com `antes` **e** `depois` (`atendimentos`, depois `arrecadacao_pos_disparo`). Sem nenhum, entram barras dos indicadores em % (taxa de abertura, aumento %, avaliação positiva).
- **Avaliação dos munícipes:** `avaliacao_media` e/ou `avaliacao_positiva`.
- **Funcionalidades usadas:** os itens de `funcionalidades`.

## Planilha ou CSV que a pessoa enviar

O mesmo formato do app: uma linha por indicador, com cabeçalho.
```
indicador;valor;antes;depois;periodo
atendimentos;12.450;8.200;12.450;2026-01 a 2026-06
taxa_abertura;45,3%;;;
funcionalidades;Lembretes de IPTU | Segunda via;;;
```
- `indicador`: o id ou o nome da tabela, sem diferença de acento ou caixa. Também valem "aumento de arrecadação" (= %), "aumento de arrecadação R$", "avaliação" (= média) e "casos de uso" (= funcionalidades).
- `valor`, `antes`, `depois`: número em pt-BR (`1.234,5`) ou en (`1234.5`); `R$` e `%` são ignorados. "1.234" (grupos de 3) é milhar; "1.5" é decimal.
- `funcionalidades`: itens separados por `|`.
- `periodo` (opcional): `AAAA-MM` ou `AAAA-MM a AAAA-MM`.
- Separador: `;`, `,` ou tabulação.

Planilha com outro formato: leia, monte a tabela de indicadores e **confirme cada número com a pessoa** antes de usar. Na dúvida sobre qual coluna é qual, pergunte.
