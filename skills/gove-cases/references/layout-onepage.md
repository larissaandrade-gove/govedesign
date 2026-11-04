# Layout da one page A4

Gerada por `scripts/build_onepage.py`. É a mesma diagramação do app "Gerador de cases" (`cases/src/lib/onepage.ts`). **Não desenhe a página à mão:** ajuste o conteúdo do `case.json` e gere de novo.

## Página
- A4 retrato, 210 × 297 mm (595,28 × 841,89 pt), uma página, PDF vetorial.
- Margem lateral de 14 mm; largura útil de 182 mm.
- Fontes embutidas: Montserrat Bold/SemiBold nos títulos e números, Inter Regular/SemiBold no corpo.
- **Nada abaixo de 11 pt.**
- Cores só da paleta, em RGB.

## Blocos, de cima para baixo

| Bloco | Conteúdo | Cores | Tamanhos |
| --- | --- | --- | --- |
| Cabeçalho (46 mm) | "CASE DE SUCESSO", "Município – UF", "Resultados de {período}"; logotipo à direita (10 mm de altura) | fundo Noite #20133D; sobretítulo Amarelo; texto Branco; logo branca com arco amarelo | 11 pt · 26→18 pt · 12 pt |
| Título | `textos.titulo`, até 2 linhas | Noite | 24→16 pt |
| Resumo | `textos.resumo`, até 4 linhas | Grafite | 12,5→11 pt |
| KPIs | até 6 blocos: até 4 numa linha; 5 ou 6 em 2 linhas de 3; número + rótulo curto | bloco Branco #F4F4F4, número Roxo, rótulo Grafite | número 20→12 pt, rótulo 11 pt |
| Desafio · Solução · Resultado | colunas lado a lado, só as que têm texto; traço amarelo em cima | título Roxo (Montserrat SemiBold 13 pt), texto Grafite | 12→11 pt |
| Gráfico (86 mm) + lateral | antes/depois em barras (Antes Lavanda, Depois Roxo) **ou** barras horizontais dos % ; à direita "Avaliação dos munícipes" (nota 28 pt) e "Funcionalidades usadas" em etiquetas (até 4 linhas) | | rótulos 11 pt |
| Destaques | até 3 frases, com barra amarela à esquerda, até 2 linhas cada | Noite, Inter SemiBold | 12→11 pt |
| Chamada final (26 mm) | `contato.cta` e "nome · e-mail · site" | faixa Roxo, texto Branco | 16→13 pt · 12 pt |

Sem gráfico, a lateral ocupa a largura toda; sem lateral, o gráfico ocupa a largura toda.

## Encaixe do texto
1. Tenta 4 níveis de tamanho e espaçamento, do maior para o menor, sem passar dos pisos.
2. Se ainda não couber, reduz as linhas dos blocos de texto e do resumo, e corta com reticências (…).
3. O script avisa:
   - `AVISO: <bloco>: texto longo demais, encurtado na página.`
   - `AVISO: O conteúdo não cabe na página A4. Desmarque indicadores ou encurte os textos.`

**Com qualquer AVISO, não entregue.** Encurte o texto indicado (ou tire um destaque, uma funcionalidade ou um indicador com `"incluir": false`) e gere de novo.

## O que some sem dados
Blocos sem conteúdo não aparecem e não deixam espaço vazio:
- título e resumo vazios;
- KPIs sem indicadores numéricos;
- colunas de desafio, solução ou resultado vazias;
- gráfico sem antes/depois e sem %;
- avaliação e funcionalidades;
- destaques vazios;
- contato.

Cabeçalho e chamada final sempre aparecem.

## Limites de texto que costumam caber
Título 70 caracteres · resumo 260 · desafio, solução e resultado 340 cada (menos quando os três aparecem com 6 KPIs) · destaque 110.
