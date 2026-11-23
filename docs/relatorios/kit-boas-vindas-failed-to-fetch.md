# Relatório: erro "Failed to fetch" no download do Kit de Boas-Vindas

**Data:** 23/11/2026 · **App:** Kit de Boas-Vindas (Design System Gove, no claude.ai) · **Status:** corrigido

## O que aconteceu
Ao clicar em **Verificar e exportar** ou **Baixar .zip** na Fila de exportação, o app mostrava o erro **"Failed to fetch"** e nenhum PDF era gerado.

## Quando acontecia
Em **todo download feito pelo Design System no claude.ai**, para qualquer município e qualquer peça. Todas as peças levam a logomarca da Gove, e era justamente ela que falhava. Não dependia do município, do logo da prefeitura nem do computador da analista.

## Causa
Para desenhar a logomarca da Gove em vetor no PDF, o app lia o arquivo do logo, que fica embutido na própria página, usando uma chamada de rede (`fetch`).

O claude.ai aplica uma regra de segurança às páginas publicadas que **bloqueia esse tipo de leitura**. O navegador recusava a chamada e devolvia a mensagem genérica "Failed to fetch".

Reproduzimos o erro com a mesma regra de segurança. O navegador registra: *"Refused to connect because it violates the document's Content Security Policy"*.

## O que foi corrigido
- O logo embutido agora é lido **direto da memória da página**, sem chamada de rede, e a regra de segurança não interfere mais.
- Se algo falhar ao gerar os arquivos, a mensagem passa a ser em português e diz o que fazer, em vez de "Failed to fetch".
- Na versão que roda no servidor da Gove (pela VPN), uma queda de conexão também mostra uma mensagem clara: *"Sem conexão com o servidor do Kit de Boas-Vindas (VPN ligada?)"*.
- Teste com a mesma restrição do claude.ai: cadastro de um município, fila com as 4 peças, verificação e download. O .zip saiu com os 4 PDFs, uma página cada, com o logo da Gove.
- Ficou registrada a regra para os outros apps do Design System, para o mesmo problema não se repetir em outro lugar.

## O que a analista precisa fazer
1. **Recarregar a página** do Design System no claude.ai (F5 ou Ctrl+R), para pegar a versão corrigida.
2. Abrir o Kit de Boas-Vindas, ir à **Fila de exportação** e clicar em **Verificar e exportar** de novo.
3. Confirmar o download do .zip quando o claude.ai perguntar.

Os municípios e a fila não se perdem ao recarregar.

## Se voltar a acontecer
Abra uma solicitação pelo botão amarelo no canto inferior da tela e inclua:
- o print da mensagem de erro;
- o município e as peças que estavam na fila;
- o navegador usado (Chrome, Edge, Safari…);
- se estava no Design System do claude.ai ou no endereço interno da Gove (VPN).
