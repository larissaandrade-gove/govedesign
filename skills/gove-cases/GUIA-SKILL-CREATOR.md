# Guia: usar e melhorar a skill "Gove Cases" no claude.ai

Este guia é para quem vai usar e ajustar a skill, sem precisar programar. Ele explica o que tem no pacote, como instalar no claude.ai, como melhorar a skill com o **Criador de skills** (skill-creator) e como testar.

> Os nomes dos menus do claude.ai mudam de tempos em tempos. Quando este guia cita um caminho como "Configurações → Recursos", o nome exato pode ser outro: procure algo parecido.

---

## 1. O que é o pacote

A skill **gove-cases** ensina o Claude a montar o case de sucesso de um município cliente da Gove. Ela:
1. pega os números do município no Grafana, pelo conector **Gove Grafana**, ou recebe os números da pessoa em texto, CSV ou planilha;
2. confirma os indicadores com a pessoa;
3. escreve os textos no tom Gove, sem inventar números;
4. gera dois arquivos com a identidade visual Gove:
   - **one page A4 em PDF**;
   - **apresentação 16:9 em PowerPoint (.pptx)** editável.

O layout é o mesmo do app "Gerador de cases" do Design System.

### Mapa de arquivos

| Arquivo | Para quê |
| --- | --- |
| `SKILL.md` | instruções principais: quando usar a skill e o passo a passo. É o "cérebro" da skill. |
| `references/indicadores.md` | os 9 indicadores, unidades, formatação (R$ 1,2 mi, 12,5%…) e formato de CSV/planilha |
| `references/layout-onepage.md` | como é a one page: blocos, tamanhos e o que some sem dados |
| `references/layout-apresentacao.md` | os 8 slides, quando cada um aparece e as regras de fonte e logo |
| `references/texto-e-tom.md` | limites de texto, voz da marca, regra dos números e privacidade |
| `references/conector-gove-grafana.md` | as ferramentas do conector, o que devolvem e as mensagens de erro |
| `references/marca.md` | cópia das diretrizes do Design System Gove |
| `scripts/build_onepage.py` | gera o PDF A4 |
| `scripts/build_deck.py` | gera o .pptx |
| `scripts/check_numbers.py` | confere se algum número do texto não está nos dados |
| `scripts/case_schema.json` | formato do arquivo `case.json`, com os dados e textos do case |
| `scripts/brand.py`, `scripts/caselib.py` | cores, fontes, logo, formatação e encaixe de texto, usados pelos scripts |
| `scripts/requirements.txt` | bibliotecas Python necessárias: python-pptx, reportlab e Pillow |
| `assets/fonts/` | Montserrat e Inter, com a licença OFL. **As fontes do Banco do Brasil não entram.** |
| `assets/logos/` | logotipos oficiais da Gove em PNG |
| `examples/` | um case **fictício** (`exemplo-case.json`) e o PDF e o .pptx gerados com ele |
| `GUIA-SKILL-CREATOR.md` | este guia |

---

## 2. Preparar o claude.ai

1. **Ligue a execução de código e a criação de arquivos.** Em Configurações → Recursos (ou "Capabilities"), ative a opção de **execução de código e criação de arquivos**. A skill roda scripts Python para gerar o PDF e o .pptx, então não funciona sem isso.
2. **Ligue as Skills.** Na mesma área, ou em Configurações → Skills, confira se as Skills estão ativadas.
   - Em conta de organização (Team/Enterprise), o admin pode precisar liberar antes.
3. **Ligue o Criador de skills.** Na lista de skills de exemplo da Anthropic, ative a **skill-creator** ("Criador de skills").

---

## 3. Instalar a skill

### Caminho A: subir o zip direto (mais rápido)
1. Em Configurações → Skills (ou Recursos → Skills), clique em **Enviar skill** ou **Upload skill**.
2. Escolha o arquivo `gove-cases-skill.zip`. Ele já tem a pasta `gove-cases/` com o `SKILL.md` dentro.
3. Confirme que **gove-cases** aparece na lista e está ativada.
4. Teste numa conversa nova: "Monte um case de sucesso do Município Exemplo com os dados do arquivo de exemplo".

### Caminho B: revisar com o Criador de skills antes de instalar
1. Abra uma conversa nova e anexe o `gove-cases-skill.zip`.
2. Escreva:
   > Use o skill-creator. Este zip é uma skill chamada gove-cases. Leia tudo, rode os scripts com o examples/exemplo-case.json e me diga o que melhoraria antes de eu instalar. Não mude o layout nem as regras de números e privacidade sem me perguntar.
3. Peça as mudanças que fizerem sentido. No final, peça: "Me devolva a skill atualizada em zip".
4. Instale o zip novo pelo Caminho A.

> **Dica:** sempre que mudar a skill, guarde o zip anterior. Assim dá para voltar atrás.

---

## 4. Prompts prontos para o Criador de skills

Anexe o zip da skill e cole um destes prompts.

**Revisar os gatilhos (quando a skill é usada)**
> Use o skill-creator para revisar a descrição da skill gove-cases. Quero que ela seja usada quando alguém pedir case de sucesso, case de cliente, one page de resultados, apresentação de resultados de um município ou material de vendas com números de cliente. Não quero que ela seja usada para apresentações genéricas da Gove nem para peças sem números de município. Escreva 10 pedidos que devem acionar a skill e 10 que não devem, teste a descrição e ajuste.

**Criar casos de teste com 3 municípios fictícios**
> Use o skill-creator para criar casos de teste da skill gove-cases com 3 municípios fictícios:
> 1. completo, com os 9 indicadores e antes/depois;
> 2. só com taxa de abertura e avaliação;
> 3. com textos longos demais para caber.
>
> Use nomes claramente fictícios e números marcados como exemplo. Para cada caso, diga o resultado esperado: quantos slides, quais blocos aparecem e se deve dar aviso de texto cortado.

**Rodar e comparar as saídas**
> Rode os 3 casos de teste com a skill e compare com o esperado. Para cada um, mostre:
> - o PDF renderizado em imagem;
> - a lista de slides gerados;
> - os avisos;
> - a saída do check_numbers.py.
>
> Aponte qualquer número que apareça nas peças e não esteja nos dados.

**Testar a regra dos números**
> Escreva de propósito um texto de case com um número inventado e confira se o check_numbers.py pega. Depois confira se a skill corrige o texto antes de gerar as peças.

**Ajustar o layout**
> Na one page da skill gove-cases, quero [descreva: por exemplo, o bloco de destaques antes do gráfico]. Faça a mudança no scripts/build_onepage.py e atualize o references/layout-onepage.md. Mantenha o piso de 11 pt, as cores da paleta e a regra do logo. Gere o exemplo de novo e me mostre a página renderizada.

**Adicionar uma seção ou um indicador novo**
> Quero acrescentar o indicador "[nome]" (unidade: [número / R$ / % / nota / lista]) na skill gove-cases. Atualize:
> - o scripts/caselib.py;
> - o scripts/case_schema.json;
> - o references/indicadores.md;
> - os layouts, se precisar.
>
> Lembre que o id precisa ser o mesmo do conector Gove Grafana. Me diga o que a TI precisa mudar no mapa de painéis do conector.

**Versão futura para o Banco do Brasil**
> Quero planejar uma variação da skill gove-cases com a identidade do Banco do Brasil. Não inclua as fontes do BB no pacote, porque são proprietárias. Proponha como separar o que é marca (cores, fontes, logo) do que é case (dados, textos, layout) e liste o que eu preciso pedir à equipe de marca. Não implemente ainda.

---

## 5. Ligar o conector "Gove Grafana" e testar

O conector depende da **TI**. Ela precisa:
- publicar o servidor;
- abrir os endereços para o claude.ai;
- cadastrar o conector na organização do claude.ai.

O passo a passo da TI está em `integrations/grafana-connector/README.md`, no repositório do Design System.

Quando a TI avisar que está pronto:
1. Em claude.ai → Configurações → Conectores, encontre **Gove Grafana** e clique em **Conectar**.
2. Abre a tela Gove "Entre com seu usuário do Grafana". Entre com **o seu usuário e a sua senha do Grafana**.
   - Cada consulta respeita as suas permissões no Grafana.
   - A senha não fica guardada.
3. Numa conversa nova, com a skill e o conector ligados, peça:
   > Monte o case de [um município que você conhece bem] de janeiro a junho de 2026.
4. Confira:
   - O Claude achou o dashboard certo?
   - Os números batem com o que você vê no Grafana?
   - Ele avisou quais indicadores não vieram?
5. Se um número esperado não vier, peça: "Rode describe_dashboard nesse dashboard e me diga quais painéis não estão mapeados". Mande a resposta para a TI ajustar o mapa de painéis.

**Sem o conector,** a skill funciona do mesmo jeito com números digitados, CSV ou planilha.

---

## 6. Checklist de qualidade (antes de enviar um case)

- [ ] O PDF tem **1 página A4**, e o script não deu `AVISO`.
- [ ] A apresentação é **16:9** e só tem slides com conteúdo.
- [ ] **Nenhum número inventado:** todos os números estão nos dados que você confirmou, e o `check_numbers.py` passou.
- [ ] **Nenhum dado pessoal** de munícipe: nomes, CPF, endereços ou casos individuais.
- [ ] **Só cores da paleta Gove**, Montserrat e Inter, e a logo oficial na versão certa para o fundo.
- [ ] Textos em português, frases curtas, sem emoji e sem exclamações em sequência.
- [ ] Um único chamado para ação no final, com o contato certo.
- [ ] O município autorizou o uso dos dados no material comercial, quando for o caso.

---

## 7. Manutenção

- **Mapa de indicadores:**
  - **Painel novo ou com outro nome no Grafana:** a TI ajusta `backend/grafana/indicators.json`, no servidor do conector.
  - **Indicador novo:** atualize também a skill. Use o prompt "Adicionar uma seção ou um indicador novo".
- **Diretrizes da marca:** quando o Design System mudar, copie de novo `skills/gove-design-system/SKILL.md` para `references/marca.md`. Se mudarem cores ou fontes, atualize `scripts/brand.py`.
- **Exemplos:** depois de qualquer mudança nos scripts, gere os exemplos de novo:
  ```bash
  python scripts/build_onepage.py examples/exemplo-case.json examples/exemplo-onepage.pdf
  python scripts/build_deck.py examples/exemplo-case.json examples/exemplo-apresentacao.pptx
  python scripts/check_numbers.py examples/exemplo-case.json
  ```
- **Versão:**
  - anote no fim do `SKILL.md` a data e o que mudou, por exemplo "v1.1 (dez/2026): indicador X";
  - suba o zip novo no claude.ai, substituindo a skill antiga;
  - guarde o zip anterior.
- **Fonte da verdade:** o pacote fica em `skills/gove-cases/` no repositório do Design System. Mudanças feitas no claude.ai precisam voltar para o repositório. Peça a quem cuida do repositório.

---

## 8. Limitações conhecidas

- **Fontes no PowerPoint:** o .pptx usa Montserrat e Inter pelo nome, mas não leva as fontes dentro do arquivo. Em computador sem elas, o PowerPoint troca por outra fonte, e o texto pode mudar de tamanho.
  - Instale as fontes de `assets/fonts/`.
  - Ou, no PowerPoint para Windows, salve com Arquivo → Opções → Salvar → "Incorporar fontes no arquivo".
  - O PDF não tem esse problema: as fontes vão embutidas.
- **Cores em RGB:** as peças são para tela e envio digital. Para impressão em gráfica, as cores precisam ser convertidas para CMYK.
- **Separador de números no gráfico do .pptx:** segue o idioma do Office de quem abre. Em pt-BR, aparece 12.450 e 12,5%.
- **Dados do Grafana:** dependem do mapa de painéis e das suas permissões. Quando um indicador não vem, a skill pergunta. Ela não estima.
- **A skill não decide o que é publicável:** confirmar que os números podem ir para material comercial é responsabilidade de quem pede o case.
