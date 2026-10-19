/**
 * Gove Design System → planilha "Larissa Andrade RAR", aba "Novo RAR".
 *
 * Dois caminhos, ambos lançam uma linha nova por solicitação (sem duplicar):
 * 1. doPost — chamado pelo servidor do projeto (TICKETS_WEBHOOK_URL). Lança a
 *    linha, envia o e-mail para a área de design e cria o evento na agenda.
 * 2. lerCaixaDeEntrada — gatilho de tempo (a cada 5 min). Lê os e-mails
 *    "[Design] …" com o marcador gove-ticket (enviados pelo artefato no
 *    claude.ai ou pelo servidor via SMTP) e lança a linha; cria o evento só se
 *    quem enviou ainda não criou.
 *
 * Instalação: ver README.md desta pasta.
 */

var PADRAO = {
  RAR_SPREADSHEET_ID: '1gtVN6m1Z0aPyNTVuLNJptKn8_TGrjN2yYymwy2c6QOY',
  RAR_SHEET: 'Novo RAR',
  LABEL: 'Design/RAR lançado',
};
var MARCADOR = 'gove-ticket:';
var COLUNAS_CHECKBOX = ['Prioridade', 'Destaque positivo', 'Destaque negativo'];

function prop_(nome) {
  return PropertiesService.getScriptProperties().getProperty(nome) || PADRAO[nome] || '';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Lança a linha na aba "Novo RAR" pelo nome das colunas. Devolve o número da linha. */
function lancarNoRar_(ticket, row) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = SpreadsheetApp.openById(prop_('RAR_SPREADSHEET_ID')).getSheetByName(prop_('RAR_SHEET'));
    if (!sh) throw new Error('Aba "' + prop_('RAR_SHEET') + '" não encontrada.');
    var achou = sh.createTextFinder('[' + ticket.id + ']').matchEntireCell(false).findNext();
    if (achou) return achou.getRow(); // já lançado

    var n = sh.getLastColumn();
    var cabecalho = sh.getRange(1, 1, 1, n).getValues()[0].map(function (h) {
      return String(h).trim();
    });
    var ultima = sh.getLastRow();
    var alvo = ultima + 1;
    if (alvo > sh.getMaxRows()) sh.insertRowAfter(sh.getMaxRows());
    var faixa = sh.getRange(alvo, 1, 1, n);
    if (ultima > 1) sh.getRange(ultima, 1, 1, n).copyTo(faixa, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    faixa.breakApart();

    var valores = cabecalho.map(function (h) {
      return Object.prototype.hasOwnProperty.call(row, h) ? row[h] : '';
    });
    faixa.setValues([valores]);
    COLUNAS_CHECKBOX.forEach(function (h) {
      var i = cabecalho.indexOf(h);
      if (i >= 0) sh.getRange(alvo, i + 1).insertCheckboxes().setValue(row[h] === true);
    });
    return alvo;
  } finally {
    lock.releaseLock();
  }
}

function criarEvento_(ticket, ev) {
  var inicio = new Date(ev.startTime + '-03:00');
  var fim = new Date(ev.endTime + '-03:00');
  var evento = CalendarApp.getDefaultCalendar().createEvent(ev.summary, inicio, fim, {
    description: ev.description,
    guests: ticket.requesterEmail,
    sendInvites: true,
  });
  evento.removeAllReminders();
  evento.addPopupReminder(24 * 60);
  evento.addEmailReminder(24 * 60);
  evento.addPopupReminder(60);
  return evento.getId();
}

/** Chamado pelo servidor do projeto. */
function doPost(e) {
  var corpo;
  try {
    corpo = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ error: 'JSON inválido.' });
  }
  var token = prop_('TICKETS_TOKEN');
  if (!token || corpo.token !== token) return json_({ error: 'Token inválido.' });

  var t = corpo.ticket;
  var r = { rar: false, email: false, calendar: false };
  var erros = [];
  try {
    r.row = lancarNoRar_(t, corpo.row);
    r.rar = true;
  } catch (err) {
    erros.push('RAR: ' + err.message);
  }
  try {
    MailApp.sendEmail({
      to: corpo.inbox,
      cc: t.requesterEmail,
      replyTo: t.requesterEmail,
      name: 'Gove Design System',
      subject: corpo.email.subject,
      body: corpo.email.text,
      htmlBody: corpo.email.html,
    });
    r.email = true;
  } catch (err) {
    erros.push('E-mail: ' + err.message);
  }
  try {
    r.eventId = criarEvento_(t, corpo.event);
    r.calendar = true;
  } catch (err) {
    erros.push('Agenda: ' + err.message);
  }
  if (erros.length) r.warnings = erros;
  return json_(r);
}

function decodificar_(texto) {
  var i = texto.indexOf(MARCADOR);
  if (i < 0) return null;
  var b64 = texto.slice(i + MARCADOR.length).match(/^[A-Za-z0-9+/=\s]+/); // tolera quebra de linha do cliente de e-mail
  if (!b64) return null;
  try {
    return JSON.parse(Utilities.newBlob(Utilities.base64Decode(b64[0].replace(/\s+/g, ''))).getDataAsString('UTF-8'));
  } catch (err) {
    return null;
  }
}

/** Gatilho de tempo: lança no RAR os pedidos que chegaram por e-mail. */
function lerCaixaDeEntrada() {
  var label = GmailApp.getUserLabelByName(prop_('LABEL')) || GmailApp.createLabel(prop_('LABEL'));
  var threads = GmailApp.search('subject:"[Design]" "' + MARCADOR + '" -label:"' + prop_('LABEL') + '" newer_than:30d', 0, 30);
  threads.forEach(function (th) {
    var ok = true;
    th.getMessages().forEach(function (m) {
      var dado = decodificar_(m.getPlainBody());
      if (!dado || !dado.ticket || !dado.row) return;
      try {
        var novo = !SpreadsheetApp.openById(prop_('RAR_SPREADSHEET_ID'))
          .getSheetByName(prop_('RAR_SHEET'))
          .createTextFinder('[' + dado.ticket.id + ']')
          .findNext();
        lancarNoRar_(dado.ticket, dado.row);
        if (novo && dado.calendar === false) {
          var ev = {
            summary: 'Entrega design: ' + dado.ticket.title + ' (' + dado.ticket.id + ')',
            description: dado.row['Resultado / Comentários'],
            startTime: dado.ticket.dueDate + 'T17:00:00',
            endTime: dado.ticket.dueDate + 'T18:00:00',
          };
          criarEvento_(dado.ticket, ev);
        }
      } catch (err) {
        ok = false;
        console.error(dado.ticket.id + ': ' + err.message);
      }
    });
    if (ok) th.addLabel(label);
  });
}

/** Rode uma vez para criar o gatilho de 5 em 5 minutos. */
function instalarGatilho() {
  ScriptApp.getProjectTriggers().forEach(function (g) {
    if (g.getHandlerFunction() === 'lerCaixaDeEntrada') ScriptApp.deleteTrigger(g);
  });
  ScriptApp.newTrigger('lerCaixaDeEntrada').timeBased().everyMinutes(5).create();
}
