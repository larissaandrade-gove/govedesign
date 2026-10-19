# Solicitações de design → planilha RAR, e-mail e agenda

O `rar-tickets.gs` liga as solicitações abertas no Gove Design System à planilha
**Larissa Andrade RAR**, aba **Novo RAR**. Ele lança uma linha nova por pedido,
lendo as colunas pelo nome do cabeçalho e sem duplicar o mesmo código `DS-…`.

| Coluna do RAR | Valor |
| --- | --- |
| Trimestre | `4T26` (data do pedido) |
| Data | `19/10/2026` |
| Frente | Redesign · Edição de vídeo · Documentação impressa · Brindes e outros materiais |
| Atividades previstas | `[DS-XXXXXX] Título` |
| Prioridade | caixa marcada quando a prioridade é alta |
| Status | `Não iniciado` |
| Resultado / Comentários | prazo, descrição, detalhes da frente e links |
| Comentários gerais | quem pediu (nome e e-mail) |

Cada frente exige no mínimo **10 h úteis** entre o pedido e a entrega. O expediente é de segunda a sexta, das 9h às 12h e das 13h às 18h, sem contar os feriados nacionais. A entrega é às 18h do dia escolhido.

## Instalação (uma vez, com a conta que recebe os pedidos)

1. Acesse [script.google.com](https://script.google.com) e crie um projeto chamado "Gove · RAR".
   Cole o conteúdo de `rar-tickets.gs`.
2. Em **Configurações do projeto → Propriedades do script**, crie:
   - `TICKETS_TOKEN`: uma frase longa e aleatória. O servidor usa a mesma em
     `TICKETS_WEBHOOK_TOKEN`.
   - Opcional: `RAR_SPREADSHEET_ID` e `RAR_SHEET`, se a planilha ou a aba mudarem.
3. Rode `instalarGatilho` uma vez e autorize o acesso a Planilhas, Gmail e Agenda.
   A partir daí, a cada 5 minutos, os e-mails `[Design] …` que chegam viram linhas no RAR.
4. Para o servidor do projeto, publique em **Implantar → Nova implantação →
   App da Web**:
   - Executar como: **eu**
   - Quem tem acesso: **qualquer pessoa**. O token protege a chamada.

   Depois copie a URL `/exec` para o `.env` do servidor. Esse arquivo fica fora do git:

   ```
   TICKETS_WEBHOOK_URL=https://script.google.com/macros/s/…/exec
   TICKETS_WEBHOOK_TOKEN=<a mesma frase de TICKETS_TOKEN>
   TICKETS_INBOX=mkt@gove.digital
   ```

## Como cada caminho funciona

- **Servidor do projeto** (`/design-system/#solicitacoes`): o servidor chama o
  App da Web. O script lança a linha, envia o e-mail para `TICKETS_INBOX`, com cópia para quem pediu,
  e cria o evento no dia do prazo, das 17h às 18h, com convite e lembretes. Sem o App da
  Web, mas com SMTP configurado, o servidor envia o e-mail com o convite `.ics`,
  e o gatilho do passo 3 lança a linha.
- **Artefato no claude.ai**: quem pede envia o e-mail e cria o evento pelo próprio
  Gmail e Google Agenda, conectados ao claude.ai. O gatilho do passo 3 lança a linha
  no RAR. Se a agenda de quem pede não estiver conectada, o script também cria o evento.
