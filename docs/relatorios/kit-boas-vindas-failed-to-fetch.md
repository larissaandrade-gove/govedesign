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

---

# Parte 2: o .zip não chegava ao computador

**Data:** 23/11/2026 · **Status:** corrigido (falta a confirmação da analista no claude.ai)

## O que aconteceu
Depois da primeira correção, a exportação terminava e o app mostrava **"4 PDF(s) exportado(s)"**, mas o .zip **não aparecia nos downloads** do computador.

## Causa
No claude.ai, o download passa por uma **janela de confirmação do claude.ai**. O arquivo só é salvo quando a pessoa clica em aceitar. Três falhas no app escondiam o problema:
- **Falso sucesso:** quando essa janela não estava disponível, o app tentava um download "comum" do navegador. Dentro do claude.ai, o navegador **descarta esse download em silêncio**, e o app mostrava "exportado" mesmo assim.
- **Falha que ficava presa:** se o claude.ai demorasse a responder na primeira vez, o app desistia do download pelo resto da sessão, até recarregar a página.
- **Sem segunda chance:** se a janela fosse recusada, expirasse ou não aparecesse, era preciso gerar tudo de novo, e as mensagens não diziam o que fazer.

## O que foi corrigido
- Dentro do claude.ai, o app **não usa mais o download "comum"**. Se a janela do claude.ai não estiver disponível, ele avisa em vez de fingir que baixou.
- **"Exportado" só aparece quando a pessoa aceita** a janela do claude.ai. Antes, um aviso pede: *"Confirme o download na janela do claude.ai"*.
- Uma lentidão do claude.ai **não desliga mais** o download: o app pergunta de novo na tentativa seguinte.
- Depois de gerar, os arquivos **ficam guardados na página**, num quadro **"Arquivos prontos"**, com dois botões:
  - **Baixar .zip**: baixa de novo, sem gerar tudo outra vez;
  - **Baixar PDFs separados**: baixa os PDFs um por um, caso o navegador ou a empresa bloqueie arquivos .zip.
- Cada resultado tem uma mensagem própria em português: download recusado, janela já aberta, download indisponível ou arquivo grande demais.
- Um item **"Detalhes"** mostra o código do resultado e a forma usada, para enviar ao suporte.
- Os outros apps do Design System (Gerador de cases, Landing Pages, Gove Links e Criativos) também deixaram de mostrar falso sucesso no download.
- Testes: o download foi simulado com a janela do claude.ai aceita, recusada, ocupada e indisponível, e também fora do claude.ai. Em todos os casos o app mostrou o resultado certo. O .zip saiu com os 4 PDFs.

## Passo a passo da analista
1. **Recarregue a página** do Design System no claude.ai (F5 ou Ctrl+R).
2. No Kit de Boas-Vindas, vá à **Fila de exportação**, clique em **Verificar e exportar** e depois em **Baixar .zip**.
3. Quando aparecer a **janela de download do claude.ai**, clique em **aceitar**.
4. Se a janela não aparecer ou for fechada, use o botão **Baixar .zip** do quadro "Arquivos prontos". Não é preciso gerar de novo.
5. Se o .zip continuar sem chegar, use **Baixar PDFs separados** e aceite a janela de cada PDF.

## Se falhar de novo
Abra uma solicitação pelo botão amarelo no canto inferior da tela e inclua:
- o print do quadro "Arquivos prontos" com **"Detalhes" aberto** (código, resultado e forma);
- a mensagem que apareceu;
- o navegador usado e se estava no computador ou no celular;
- se a janela de download do claude.ai apareceu ou não.

**Limite:** não temos como abrir o claude.ai com a conta da analista. A confirmação final é ela baixar de novo depois de recarregar a página.
