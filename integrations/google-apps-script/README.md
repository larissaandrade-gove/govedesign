# Solicitações de design → planilha RAR, e-mail e agenda

O `rar-tickets.gs` liga as solicitações abertas no Gove Design System à planilha
**Larissa Andrade RAR**, aba **Novo RAR**. Ele lança uma linha nova por pedido,
lendo as colunas pelo nome do cabeçalho e sem duplicar o mesmo código `DS-…`.

| Coluna do RAR | Valor |
| --- | --- |
| Trimestre | `4T26` (data do pedido) |
| Data | `19/10/2026` |
| Frente | Redesign · Edição de vídeo · Documentação impressa · Brindes e outros materiais |
| Atividades previstas | `[DS-XXXXXX] Título — Tipo de peça (Formato)` |
| Prioridade | caixa marcada quando é alta urgência |
| Status | `Não iniciado` |
| Resultado / Comentários | entrega, prioridade, blocos de produção, descrição, detalhes e links |
| Comentários gerais | quem pediu (nome e e-mail do login) |

**Prazos e produção.** As horas úteis seguem o expediente da responsável pelas
solicitações, Larissa Andrade (larissa.andrade@gove.digital), sem feriados
nacionais. O padrão é segunda a sexta, 8h–12h e 13h–17h, e a entrega acontece no
fim do expediente do dia escolhido. Ela altera o expediente no card **Horário de
trabalho** da página Solicitações; os pedidos seguintes passam a usar o novo
horário, e cada pedido guarda o expediente em que foi feito. Os números ficam em
`shared/tickets.js` (`DEFAULT_SCHEDULE`, `LEAD_HOURS`, `EFFORT_HOURS` e `factor`
de cada frente).

> A agenda consultada e onde a produção é marcada é a da conta que instalou o
> script (`CalendarApp.getDefaultCalendar()`). Para valer a agenda da Larissa,
> instale e publique o script com a conta dela.

| Frente | Alta urgência | Normal | Produção reservada |
| --- | --- | --- | --- |
| Redesign, Documentação impressa, Brindes | 24 h | 48 h | 8 h |
| Edição de vídeo (dobro) | 48 h | 96 h | 16 h |

A produção é distribuída **por igual** entre os dias úteis até a entrega, apenas
nos horários livres da agenda do design. Reuniões, ausências e produções já
marcadas ficam de fora. Se não houver espaço até a data pedida, o pedido é recusado
e o formulário mostra a primeira data com espaço.

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
   TICKETS_INBOX=larissa.andrade@gove.digital
   ```

## Como cada caminho funciona

- **Servidor do projeto** (`/design-system/#solicitacoes`): quem pede vem do
  login. O servidor consulta os horários ocupados da agenda (`action: "ocupado"`)
  e distribui a produção. Depois chama o App da Web, que lança a linha, envia o
  e-mail para `TICKETS_INBOX` com cópia para quem pediu, cria o evento de
  entrega (última hora do expediente, com convite e lembretes) e os blocos "Produção n/N". Sem o App da
  Web, mas com SMTP configurado, o servidor envia o e-mail com o convite `.ics`,
  e o gatilho do passo 3 lança a linha.
- **Artefato no claude.ai**: quem pede vem da conta do claude.ai. A página consulta
  os horários livres da agenda do design pelo Google Agenda de quem pede
  (`suggest_time`) e distribui a produção. Depois envia o e-mail e cria o evento
  de entrega pelo Gmail e pelo Google Agenda dessa pessoa. O gatilho do passo 3
  lança a linha no RAR e cria os blocos de produção na agenda do design. Se a
  agenda de quem pede não estiver conectada, o script também cria o evento de entrega.
