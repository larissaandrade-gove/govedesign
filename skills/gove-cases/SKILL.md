---
name: gove-cases
description: Monta cases de sucesso de clientes da Gove Digital (municípios) para vendas e pré-vendas. Busca os indicadores no Grafana pelo conector "Gove Grafana" ou recebe números, CSV ou planilha, escreve o case no tom Gove e gera um one page A4 em PDF e uma apresentação de resultados 16:9 em PowerPoint (.pptx) editável, na identidade visual Gove. Use quando pedirem case de sucesso, case de cliente, case de município, one page de resultados, apresentação de resultados de um município, material de vendas ou pré-vendas com números de cliente, ou indicadores de um município no Grafana para um case.
---

# Gove Cases

Gera o case de sucesso de um município cliente da Gove em dois arquivos:
- **one page A4 em PDF**;
- **apresentação 16:9 em .pptx editável**.

As duas peças usam a mesma diagramação do app "Gerador de cases" do Design System Gove. Os scripts fazem o layout: você cuida dos dados e dos textos.

## Regras que valem sempre
- **Nenhum número inventado.** Todo número das peças vem dos dados confirmados com a pessoa. Não estime, não complete com zero, não arredonde de outro jeito. Sem o dado, o bloco ou o slide some.
- **Só dados agregados**, como totais, médias, percentuais e nomes de funcionalidades. Nunca use dados pessoais de munícipes (nome, CPF, endereço, telefone, e-mail, caso individual), nem em citação "ilustrativa".
- **Identidade Gove:** só as cores da paleta, Montserrat e Inter, e a logo pela regra de contraste. Os scripts já aplicam isso; não troque cores nem fontes à mão. Regras completas em `references/marca.md`.
- **Use os scripts** para gerar o PDF e o .pptx. Não desenhe as peças por outro caminho: o layout, os pisos de tamanho (11 pt no A4, 14 pt nos slides) e a ocultação de blocos vazios estão neles.

## Fluxo

### 1. Município e período
Pergunte o que faltar:
- município e UF;
- período dos resultados, por mês (`AAAA-MM` a `AAAA-MM`);
- contexto do município, se a pessoa quiser (porte, problema de partida);
- contato da chamada final (nome, e-mail, site) e escala da nota (de 5 ou de 10).

### 2. Dados
**Com o conector "Gove Grafana" disponível** (ferramentas `list_case_dashboards` e `get_case_indicators`; detalhes em `references/conector-gove-grafana.md`):
1. Chame `list_case_dashboards` com `query` = nome do município. Se vier mais de um, peça para a pessoa escolher.
2. Chame `get_case_indicators` com o `dashboard_uid`, `from` e `to` do período.
3. Anote os indicadores que não vieram (`failed_panels`, painéis não mapeados) e pergunte se a pessoa tem esses números.
4. Se der erro, diga a mensagem da tabela de erros e ofereça o caminho manual.

**Sem o conector:**
- Peça os números digitados, um CSV ou uma planilha.
- O formato e os 9 indicadores aceitos estão em `references/indicadores.md`.
- Pode sugerir à pessoa ligar o conector Gove Grafana em Configurações → Conectores.

### 3. Confirmar os indicadores
Mostre uma tabela com indicador, valor formatado em pt-BR e antes/depois, e peça confirmação. Exemplos de formato: R$ 1,2 mi · R$ 350 mil · 12,5% · 1.234 · 4,7 de 5.
- Pergunte quais indicadores entram. O que ficar de fora recebe `"incluir": false` ou sai do arquivo.
- Percentual vindo em 0–1? Converta para 0–100 e confirme.
- Só siga com os números confirmados.

### 4. Escrever os textos
Escreva título, resumo, desafio, solução, resultado e até 3 destaques, seguindo `references/texto-e-tom.md`:
- limites de tamanho;
- voz da marca;
- números escritos exatamente como as peças mostram.

Mostre os textos à pessoa e ajuste o que ela pedir.

### 5. Conferir os números
Monte o `case.json` (passo 6) e rode:
```bash
python scripts/check_numbers.py case.json
```
- **Saída 0:** tudo certo.
- **Saída 1:** a lista mostra números do texto que não estão nos dados. Corrija o texto, ou confirme o dado com a pessoa e acrescente-o aos indicadores ou ao contexto. Rode de novo até sair 0.
- Nunca entregue com número suspeito.

### 6. Gerar as peças
1. Monte o `case.json` no formato de `scripts/case_schema.json`. Use como modelo `examples/exemplo-case.json`, que é fictício: não copie os valores dele.
2. Gere as peças:
   ```bash
   pip install -r scripts/requirements.txt   # só se faltar python-pptx, reportlab ou Pillow
   python scripts/build_onepage.py case.json case-<municipio>-onepage.pdf
   python scripts/build_deck.py case.json case-<municipio>-apresentacao.pptx
   ```
- Os scripts acham as fontes e os logos sozinhos (`assets/`), de qualquer pasta.
- **Qualquer linha `AVISO:`** quer dizer texto cortado ou conteúdo que não coube. Encurte o texto indicado ou tire um destaque, uma funcionalidade ou um indicador, e gere de novo. Não entregue com aviso.
- `build_deck.py` lista os slides gerados e os omitidos por falta de dados. Conte à pessoa quais ficaram de fora e por quê.
- Layout e regras de cada peça: `references/layout-onepage.md` e `references/layout-apresentacao.md`.

### 7. Checklist da marca e entrega
Antes de entregar, confira:
- [ ] PDF com **1 página A4**, sem `AVISO:`;
- [ ] apresentação **16:9**, com os slides esperados e o gráfico nativo quando há antes/depois ou %;
- [ ] `check_numbers.py` com saída 0: **nenhum número inventado**;
- [ ] **nenhum dado pessoal** de munícipe;
- [ ] só cores da paleta e fontes da marca, sem nada alterado à mão depois dos scripts;
- [ ] textos em PT-BR, sentence case, sem emoji e sem exclamações em sequência;
- [ ] um único chamado para ação.

Entregue o PDF e o .pptx e diga em uma frase de onde vieram os dados (Grafana, com o dashboard e o período, ou dados enviados pela pessoa).

Avise também:
- a apresentação usa Montserrat e Inter pelo nome: no computador sem essas fontes instaladas, o PowerPoint troca a fonte. Os arquivos estão em `assets/fonts/`;
- as cores estão em RGB, para tela e envio digital. Para gráfica, é preciso converter para CMYK.

## Arquivos
- `scripts/build_onepage.py`: one page A4, PDF vetorial com fontes embutidas.
- `scripts/build_deck.py`: apresentação .pptx 13,333 × 7,5 pol, até 8 slides.
- `scripts/check_numbers.py`: regra "nenhum número fora dos dados".
- `scripts/case_schema.json`: formato do `case.json`.
- `scripts/brand.py`: paleta, fontes e regra do logo.
- `scripts/caselib.py`: indicadores, formatação, checagem e encaixe de texto.
- `references/`: indicadores, layouts, texto e tom, conector e marca.
- `assets/fonts/`: Montserrat e Inter, licença OFL em `assets/fonts/OFL.txt`.
- `assets/logos/`: logotipos oficiais em PNG.
- `examples/`: case fictício e as peças geradas a partir dele.
