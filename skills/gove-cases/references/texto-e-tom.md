# Texto e tom do case

Os textos do case vão em `textos` no `case.json`. São as mesmas regras do prompt de redação do app "Gerador de cases" (`cases/src/lib/prompt.ts`).

## Campos e limites

| Campo | Para quê | Limite |
| --- | --- | --- |
| `titulo` | a conquista principal, em uma frase | 70 caracteres |
| `resumo` | o case em 2 ou 3 frases: quem, o que mudou, o maior número | 260 |
| `desafio` | o problema de partida do município | 340 |
| `solucao` | o que o Gove fez, com foco no benefício para o munícipe e para a gestão | 340 |
| `resultado` | o que mudou, com os números confirmados | 340 |
| `destaques` | até 3 frases curtas, cada uma com um resultado | 110 cada |
| `contato.cta` | um único chamado para ação (padrão: "Leve o Gove para o seu município") | 1 linha |

Os limites cabem na one page e nos slides. Mesmo assim, o script de geração é quem decide: se ele avisar que cortou, encurte.

## A regra dos números (obrigatória)
- Use **somente** os números confirmados nos dados do case, escritos **do mesmo jeito** que as peças mostram:
  - "R$ 1,2 mi", "R$ 350 mil", "12,5%", "12.450", "4,7 de 5".
- Não calcule números novos, não arredonde de outro jeito e não invente números, datas, nomes, citações ou depoimentos.
- Dá para usar, porque o script reconhece como dado:
  - a diferença entre antes e depois (ex.: de 8.200 para 12.450 = 4.250 a mais);
  - a variação % (51,8%);
  - a quantidade de funcionalidades;
  - a escala da nota;
  - o ano e o mês do período;
  - os números do `contexto` que a pessoa informou.
- **Se um dado não estiver no case, não fale dele.** Não escreva "cerca de", "mais de" ou "quase" para disfarçar um número que não existe.
- Depois de escrever, rode `python scripts/check_numbers.py case.json`.
  - **Saída 0:** tudo certo.
  - **Saída 1:** lista os números suspeitos. Corrija o texto ou confirme o dado com a pessoa e acrescente-o aos indicadores ou ao contexto.

## Voz da marca Gove
- Português do Brasil; frases curtas e declarativas, com verbo de ação; foco no benefício, não na tecnologia.
- Títulos em sentence case: só a primeira letra e os nomes próprios em maiúscula.
- Sem emoji, sem jargão burocrático, sem exclamações em sequência e sem textos repetidos entre os campos.
- A Gove (Governo Zero Clique) é o governo que sabe, antecipa e age.
- Fale de "munícipes" e "gestão", nunca de pessoas identificáveis.

## Privacidade
- Só dados agregados: totais, médias, percentuais e nomes de funcionalidades.
- Nada de nome, CPF, endereço, telefone, e-mail ou caso individual de munícipe, nem em citação "ilustrativa".
- Nome de servidor ou de gestor só se a pessoa pedir e confirmar que pode ser publicado.

## Prompt de referência (o mesmo do app)

```text
Você escreve cases de sucesso da Gove Digital para a equipe de vendas: uma página sobre o resultado de um município que usa o Gove.

## Dados do case (use SOMENTE estes números)
- Município: {Município – UF}
- Período: {jan. a jun. de 2026}
- Contexto informado pela equipe: {contexto}
- {Indicador}: {valor formatado}; antes {x}, depois {y} (variação de {z%})
- ...

## Regras
- Use apenas os números acima, escritos do mesmo jeito (ex.: "R$ 1,2 mi", "12,5%"). Não calcule, não arredonde de outro jeito e não invente números, datas, nomes ou citações.
- Se um dado não estiver acima, não fale dele.
- Português do Brasil; frases curtas e declarativas, com verbo de ação; foco no benefício, não na tecnologia.
- Títulos em sentence case (só a primeira letra e nomes próprios em maiúscula).
- Sem emoji, sem jargão burocrático, sem exclamações em sequência, sem textos repetidos.
- A Gove (Governo Zero Clique) é o governo que sabe, antecipa e age.

## Formato da resposta
{"titulo": string (até 70 caracteres), "resumo": string (até 260), "desafio": string (até 340), "solucao": string (até 340), "resultado": string (até 340), "destaques": [até 3 frases curtas, cada uma até 110 caracteres]}
```

## Exemplo de bom texto
- **Título:** "Atendimento digital que aumentou a arrecadação"
- **Resultado:** "Os atendimentos subiram de 8.200 para 12.450, alta de 51,8%. Entre quem recebeu o disparo, a arrecadação cresceu 12,5%."
- **Destaque:** "R$ 350 mil arrecadados após o disparo"

## Evite
- "Revolucionamos a gestão pública!!!": exagero e exclamações.
- "Cerca de 15 mil atendimentos": número que não está nos dados.
- "A plataforma omnichannel baseada em IA...": tecnologia em vez de benefício.
- "A Dona Maria, do bairro X, conseguiu...": dado pessoal de munícipe.
