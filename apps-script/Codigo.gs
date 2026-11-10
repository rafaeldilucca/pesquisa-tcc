/**
 * Pesquisa do TCC: recebe as respostas do site e grava nesta planilha.
 * Também faz o sorteio equilibrado da peça (A ou B) dentro de cada grupo.
 *
 * Como instalar: Extensões > Apps Script, cole este código, salve e
 * Implantar > Nova implantação > App da Web
 *   Executar como: Eu
 *   Quem pode acessar: Qualquer pessoa
 * Copie o endereço que termina em /exec.
 */

var ABA = 'Respostas';
var COLUNAS = [
  'data_hora_servidor', 'id_resposta', 'status', 'teste', 'versao', 'inicio_cliente', 'tempo_total_s',
  'dispositivo', 'largura_tela', 'consentimento', 'idade', 'local', 'sexo', 'time', 'time_outro',
  'grupo', 'peca', 'camisa', 'sorteio_local', 'tempo_anuncio_s',
  'Q5_1_boa', 'Q5_2_util', 'Q5_3_favoravel', 'Q5_ordem', 'atitude',
  'juster', 'atencao', 'atencao_outro', 'Q8_time', 'Q9_cor', 'check_time', 'check_cor',
  'conhece_marca', 'freq_agua', 'gosta_futebol', 'intensidade', 'intensidade_sel',
  'Q15_ordem',
  'Q15A_1_representa', 'Q15A_2_usar', 'Q15A_3_impressao', 'Q15A_4_bonita', 'Q15A_5_preco', 'valor_A',
  'Q15B_1_representa', 'Q15B_2_usar', 'Q15B_3_impressao', 'Q15B_4_bonita', 'Q15B_5_preco', 'valor_B',
  'escolha', 'Q16_ordem', 'instrucao', 'renda',
  'escolha_hipotetica', 'Q16b_ordem'   // versão 2.2 em diante (colunas novas sempre no fim)
];
var VERSAO_SCRIPT = '2.2';
var GRUPOS = { FLA: ['FLA-A', 'FLA-B'], VAS: ['VAS-A', 'VAS-B'], SEL: ['SEL-A', 'SEL-B'] };

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var d = JSON.parse(e.postData.contents);
    var sh = abaRespostas_();
    abaDicionario_();
    var ultima = sh.getLastRow();
    if (d.id_resposta && ultima > 1) {
      var ids = sh.getRange(2, 2, ultima - 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) if (ids[i][0] === d.id_resposta) return saida_({ ok: true, repetida: true });
    }
    d.data_hora_servidor = new Date();
    sh.appendRow(COLUNAS.map(function (c) {
      var v = d[c];
      if (v === undefined || v === null) return '';
      if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;   // texto livre nunca vira fórmula
      return v;
    }));
    return saida_({ ok: true });
  } catch (err) {
    return saida_({ ok: false, erro: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  var versao = versaoCurta_(p.versao);
  if (p.acao === 'sortear' && GRUPOS[p.grupo]) {
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var props = PropertiesService.getScriptProperties();
      var duas = GRUPOS[p.grupo];
      var a = Number(props.getProperty(chave_(versao, duas[0])) || 0);
      var b = Number(props.getProperty(chave_(versao, duas[1])) || 0);
      var peca = a < b ? duas[0] : b < a ? duas[1] : duas[Math.random() < 0.5 ? 0 : 1];
      props.setProperty(chave_(versao, peca), String((peca === duas[0] ? a : b) + 1));
      props.setProperty('versao_atual', versao);
      return saida_({ ok: true, peca: peca });
    } finally {
      lock.releaseLock();
    }
  }
  var atual = p.versao ? versao : (PropertiesService.getScriptProperties().getProperty('versao_atual') || '');
  return saida_({ ok: true, mensagem: 'Pesquisa TCC: recebendo respostas.', script: VERSAO_SCRIPT,
                  versao_questionario: atual, sorteios: contagemSorteios_(atual) });
}

// Cada versão do questionário tem a sua própria contagem: ao mudar de versão, o equilíbrio recomeça do zero.
function versaoCurta_(v) { return String(v || '').split('-')[0]; }
function chave_(versao, peca) { return 'sorteio_' + (versao ? versao + '_' : '') + peca; }

function contagemSorteios_(versao) {
  var props = PropertiesService.getScriptProperties();
  var c = {};
  Object.keys(GRUPOS).forEach(function (g) { GRUPOS[g].forEach(function (p) { c[p] = Number(props.getProperty(chave_(versao, p)) || 0); }); });
  return c;
}

/** Rode manualmente para recomeçar o equilíbrio do sorteio do zero (todas as versões). */
function zerarSorteio() {
  var props = PropertiesService.getScriptProperties();
  Object.keys(props.getProperties()).forEach(function (k) { if (k.indexOf('sorteio_') === 0) props.deleteProperty(k); });
}

function abaRespostas_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(ABA);
  if (!sh) {
    var primeira = ss.getSheets()[0];
    if (primeira && primeira.getLastRow() === 0) { sh = primeira; sh.setName(ABA); }
    else sh = ss.insertSheet(ABA, 0);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLUNAS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLUNAS.length).setFontWeight('bold');
  } else if (sh.getLastColumn() < COLUNAS.length) {
    // colunas novas de uma versão mais recente do questionário: completa o cabeçalho
    sh.getRange(1, 1, 1, COLUNAS.length).setValues([COLUNAS]).setFontWeight('bold');
  }
  return sh;
}

function abaDicionario_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var existente = ss.getSheetByName('Dicionario');
  if (existente) {
    var colA = existente.getRange(1, 1, existente.getLastRow(), 1).getValues().map(function (r) { return r[0]; });
    if (colA.indexOf('escolha_hipotetica') < 0) {
      var novas = [
        ['escolha_hipotetica', 'Q16b', 'A; B; nenhuma: escolha supondo nunca ter tido camisa do time (versão 2.2 em diante)'],
        ['Q16b_ordem', 'Q16b', 'Qual camisa apareceu primeiro'],
        ['versao', '', 'v2.2 em diante: apresentação sem o objetivo, Q5 sem "muito", Juster só com texto (sem "x em 10") e Q16b. Respostas de versões anteriores ficam fora da análise principal.']
      ];
      existente.getRange(existente.getLastRow() + 1, 1, novas.length, 3).setValues(novas);
    }
    return;
  }
  var sh = ss.insertSheet('Dicionario');
  var linhas = [
    ['Coluna', 'Pergunta', 'Codificação'],
    ['status', '', 'completo; sem_consentimento; menor_18; fora_rmrj'],
    ['teste', '', '1 = resposta de teste (link com ?teste=1); 0 = resposta válida'],
    ['grupo', 'Q4', 'FLA = Flamengo; VAS = Vasco da Gama; SEL = demais'],
    ['peca / camisa', 'Sorteio', 'Peça vista (FLA-A ... SEL-B); camisa A ou B'],
    ['sorteio_local', '', '1 = o sorteio foi feito no navegador porque a planilha não respondeu'],
    ['tempo_anuncio_s', '', 'Segundos na tela do anúncio (mínimo de 5)'],
    ['Q5_1 a Q5_3', 'Q5', '1 = discordo totalmente ... 7 = concordo totalmente; atitude = média dos 3'],
    ['Q5_ordem', 'Q5', 'Ordem em que os itens apareceram (ex.: util>boa>favoravel)'],
    ['juster', 'Q6', '10 = certamente ou praticamente certo ... 0 = nenhuma chance ou quase nenhuma chance'],
    ['check_time / check_cor', 'Q8 / Q9', '1 = acertou o time / a cor da peça vista; 0 = errou'],
    ['freq_agua', 'Q11', '1 = nunca ou quase nunca; 2 = algumas vezes por ano; 3 = algumas vezes por mês; 4 = toda semana'],
    ['gosta_futebol, intensidade, intensidade_sel', 'Q12 a Q14', '1 = discordo totalmente ... 5 = concordo totalmente; vazio = não se aplica'],
    ['Q15A_* / Q15B_*', 'Q15', 'Itens sobre a camisa A e a camisa B do grupo, 1 a 5; valor_A e valor_B = médias'],
    ['Q15_ordem / Q16_ordem', 'Q15 / Q16', 'Qual camisa apareceu primeiro'],
    ['escolha', 'Q16', 'A; B; nenhuma'],
    ['escolha_hipotetica', 'Q16b', 'A; B; nenhuma: escolha supondo nunca ter tido camisa do time (versão 2.2 em diante)'],
    ['Q16b_ordem', 'Q16b', 'Qual camisa apareceu primeiro'],
    ['instrucao', 'Q17', '1 = fundamental incompleto; 2 = fundamental completo; 3 = médio incompleto; 4 = médio completo; 5 = superior incompleto; 6 = superior completo; 7 = pós-graduação'],
    ['renda', 'Q18', '1 = até R$ 3.000; 2 = R$ 3.001 a 6.000; 3 = R$ 6.001 a 10.000; 4 = R$ 10.001 a 20.000; 5 = acima de R$ 20.000; 9 = prefiro não responder'],
    ['tempo_total_s', '', 'Segundos entre o consentimento e o envio']
  ];
  sh.getRange(1, 1, linhas.length, 3).setValues(linhas);
  sh.getRange(1, 1, 1, 3).setFontWeight('bold');
  sh.setColumnWidth(1, 260); sh.setColumnWidth(2, 110); sh.setColumnWidth(3, 620);
}

function saida_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
