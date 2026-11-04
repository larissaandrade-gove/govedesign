# Layout da apresentação 16:9

Gerada por `scripts/build_deck.py`. É a mesma diagramação do app "Gerador de cases" (`cases/src/lib/slides.ts` e `pptx.ts`), que segue o "Prompt de apresentações" do Design System (ver `marca.md`).

## Formato
- .pptx 13,333 × 7,5 pol (1920 × 1080 px a 144 px/pol; `sldSz` 12192000 × 6858000 EMU).
- Margem de 96 px.
- Textos em caixas editáveis, com as fontes **pelo nome**:
  - títulos e números em Montserrat (Bold) e "Montserrat SemiBold";
  - corpo em Inter e "Inter SemiBold".
- Tema do arquivo: Montserrat nos títulos, Inter no corpo.
- O .pptx não embute fontes. Sem elas instaladas, o PowerPoint troca por outra: a marca pede Helvetica e, depois, Arial. Os arquivos estão em `assets/fonts/`.
- Gráfico de colunas **nativo**, editável no PowerPoint ("Editar dados"): sem 3D, com rótulos de valor e sem eixo de valores nem linhas de grade.
- Nada abaixo de 14 pt, exceto o número da página (12 pt, Cinza técnico).

## Slides (na ordem)

| # | Slide | Aparece quando | Conteúdo |
| --- | --- | --- | --- |
| 1 | Capa | sempre | fundo Noite; "CASE DE SUCESSO" (Amarelo, 20 pt), município (48→40 pt), título do case (28→24 pt), período; logo branca com arco amarelo (64 px de altura) embaixo à esquerda |
| 2 | Contexto do município | há `contexto` ou `resumo` | resumo em Inter SemiBold (28→24 pt) + contexto (24→18 pt) |
| 3 | Desafio | há `desafio` | texto 32→20 pt, até 7 linhas |
| 4 | Solução e funcionalidades | há `solucao` ou funcionalidades | solução à esquerda; painel Branco puro com até 8 funcionalidades e marcador amarelo à direita |
| 5 | Resultados | há KPIs ou `resultado` | resultado (até 3 linhas com KPIs) + blocos de KPI (até 4 por linha; 5–6 em 2 linhas de 3), número Roxo 54/44 pt |
| 6 | Gráfico | há antes/depois ou % | "{Indicador}: antes e depois" (Antes Lavanda, Depois Roxo) ou "Indicadores em percentual" (Roxo); rótulos 20 pt |
| 7 | Avaliação / Destaques | há avaliação ou destaques | nota 96 pt + "de 5 na avaliação média"; % positivas 72 pt; destaques com barra amarela à direita. Sem avaliação, o título vira "Destaques" |
| 8 | Próximos passos | sempre | fundo Roxo; "PRÓXIMOS PASSOS" (Amarelo), `contato.cta` (48→40 pt), nome, e-mail e site; logo branca com arco amarelo |

- **Slides de conteúdo (2 a 7):**
  - fundo Branco #F4F4F4;
  - traço amarelo de 64 × 8 px acima do título;
  - título Montserrat Bold 44→40 pt em Noite;
  - corpo em Grafite;
  - logotipo **roxo** de 40 px no rodapé, à direita;
  - número da página à esquerda.
- **Logo pela regra de contraste:** cada cor da logo precisa de pelo menos 4,5:1 com o fundo. Fica roxa no Branco e branca com arco amarelo no Noite e no Roxo. Os scripts escolhem sozinhos.

## Slides sem dados
O slide **fica fora do arquivo**, não fica vazio, e a numeração das páginas segue sem buracos. O script lista os slides gerados e os "Omitidos por falta de dados". Com o mínimo de dados (só município), saem 2 slides: capa e próximos passos.

## Encaixe do texto
O tamanho diminui até o piso de cada caixa. Se ainda não couber, o texto é cortado com reticências e o script avisa `AVISO: <slide>: texto longo demais, encurtado no slide.` **Com aviso, encurte o texto e gere de novo.**

## Números no gráfico
O formato do rótulo é `"R$" #,##0`, `0.0"%"` ou `#,##0`. O separador de milhar e o decimal seguem o idioma do Office de quem abre: em pt-BR, aparece 12.450 e 12,5%.
