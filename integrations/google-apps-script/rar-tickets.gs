/**
 * Gove Design System → planilha "Larissa Andrade RAR", aba "Novo RAR".
 *
 * Dois caminhos, ambos lançam uma linha nova por solicitação (sem duplicar):
 * 1. doPost — chamado pelo servidor do projeto (TICKETS_WEBHOOK_URL).
 *    - action "ocupado": devolve os horários ocupados da agenda (reuniões,
 *      produções já marcadas, ausências) para o servidor distribuir a produção;
 *    - pedido: lança a linha, envia o e-mail (com quem pediu em cópia), cria o
 *      evento de entrega (com quem pediu convidado) e os blocos de produção.
 * 2. lerCaixaDeEntrada — gatilho de tempo (a cada 5 min). Lê os e-mails
 *    "[Design] …" com o marcador gove-ticket (enviados pelo artefato no
 *    claude.ai ou pelo servidor via SMTP), lança a linha e cria os blocos de
 *    produção; cria o evento de entrega só se quem enviou ainda não criou.
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

/** Horários ocupados da agenda (eventos com hora, não recusados; ausências de dia inteiro). */
function ocupado_(inicio, fim) {
  return CalendarApp.getDefaultCalendar()
    .getEvents(inicio, fim)
    .filter(function (ev) {
      if (ev.getMyStatus && ev.getMyStatus() === CalendarApp.GuestStatus.NO) return false;
      if (ev.isAllDayEvent()) return ev.getEventType && ev.getEventType() === CalendarApp.EventType.OUT_OF_OFFICE;
      return ev.getTransparency ? ev.getTransparency() !== CalendarApp.EventTransparency.TRANSPARENT : true;
    })
    .map(function (ev) {
      return { start: ev.getStartTime().toISOString(), end: ev.getEndTime().toISOString(), title: ev.getTitle() };
    });
}

/** Blocos de produção na agenda do design (não duplica se já existirem). */
function criarProducao_(ticket, work) {
  if (!work || !work.length) return 0;
  var cal = CalendarApp.getDefaultCalendar();
  var ini = new Date(work[0].startTime + '-03:00');
  var fim = new Date(work[work.length - 1].endTime + '-03:00');
  var jaTem = cal.getEvents(ini, fim, { search: ticket.id }).some(function (ev) {
    return ev.getTitle().indexOf('Produção') === 0;
  });
  if (jaTem) return 0;
  work.forEach(function (w) {
    var ev = cal.createEvent(w.summary, new Date(w.startTime + '-03:00'), new Date(w.endTime + '-03:00'), { description: w.description });
    ev.setColor(CalendarApp.EventColor.MAUVE);
    ev.removeAllReminders();
    ev.addPopupReminder(10);
  });
  return work.length;
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
  if (corpo.action === 'ocupado') return json_({ busy: ocupado_(new Date(corpo.start), new Date(corpo.end)) });

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
    r.producao = criarProducao_(t, corpo.work);
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
        criarProducao_(dado.ticket, dado.work);
        if (novo && dado.calendar === false) {
          var ev = {
            summary: 'Entrega design: ' + dado.ticket.title + ' (' + dado.ticket.id + ')',
            description: 'Solicitante: ' + dado.ticket.requesterName + ' (' + dado.ticket.requesterEmail + ')\n' + dado.row['Resultado / Comentários'],
            // Última hora do expediente da responsável (pedidos antigos: 17h–18h)
            startTime: dado.ticket.dueDate + 'T' + horaMenos1_(dado.ticket.dueTime || '18:00') + ':00',
            endTime: dado.ticket.dueDate + 'T' + (dado.ticket.dueTime || '18:00') + ':00',
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

/** "17:00" → "16:00". */
function horaMenos1_(hhmm) {
  var m = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5)) - 60;
  return ('0' + Math.floor(m / 60)).slice(-2) + ':' + ('0' + (m % 60)).slice(-2);
}

/** Rode uma vez para criar o gatilho de 5 em 5 minutos. */
function instalarGatilho() {
  ScriptApp.getProjectTriggers().forEach(function (g) {
    if (g.getHandlerFunction() === 'lerCaixaDeEntrada') ScriptApp.deleteTrigger(g);
  });
  ScriptApp.newTrigger('lerCaixaDeEntrada').timeBased().everyMinutes(5).create();
}
