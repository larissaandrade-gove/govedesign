# Conversor de cores BB (PowerPoint e planilhas)

Ferramentas do guia "Design System Banco do Brasil", com a conversão de cores para a paleta do Manual da Logomarca BB.

- `bb_palette.py`: paleta oficial e motor de contraste WCAG. Todo texto fica com contraste de pelo menos 4,5:1.
- `bb_recolor_xlsx.py`: converte as cores de uma `.xlsx` no nível do XML.
  - Uso: `python bb_recolor_xlsx.py entrada.xlsx saida.xlsx`

**Falta o `bb_recolor_pptx.py`.** O `bb_recolor_xlsx.py` importa o tema e os gráficos desse arquivo, que não veio junto. O código impresso no apêndice do PDF tem linhas cortadas e não serve como fonte. Coloque o arquivo original nesta pasta.

Nos geradores da GOVE, a mesma paleta e os mesmos pares aprovados estão em `brand/bb.js`.
