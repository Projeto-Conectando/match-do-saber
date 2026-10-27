const COLUNAS = ['id', 'titulo', 'descricao', 'saiba_mais', 'imagem', 'veredito',
  'explicacao', 'tecnica', 'fonte_url', 'revisado_por', 'status'];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Match do Saber')
    .addItem('Publicar no jogo', 'publicar')
    .addToUi();
}

function publicar() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GITHUB_TOKEN');
  const repo = props.getProperty('GITHUB_REPO');
  if (!token || !repo) {
    ui.alert('Publicação não configurada. Avise a equipe técnica.');
    return;
  }
  const resp = UrlFetchApp.fetch('https://api.github.com/repos/' + repo + '/dispatches', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
    payload: JSON.stringify({ event_type: 'publicar-conteudo' }),
    muteHttpExceptions: true,
  });
  if (resp.getResponseCode() === 204) {
    ui.alert('Publicação iniciada! Em alguns minutos as notícias aprovadas estarão no jogo.\n\n' +
      'Para ver o resumo (inclusive linhas não publicadas e o motivo): https://github.com/' + repo + '/actions');
  } else {
    ui.alert('Não foi possível iniciar a publicação (código ' + resp.getResponseCode() + '). Avise a equipe técnica.');
  }
}

/** Rodar uma vez pelo editor: cabeçalho, listas suspensas e destaque de campos vazios (AC-7.1). */
function configurarPlanilha() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const aba = ss.getSheetByName('noticias') || ss.insertSheet('noticias');
  aba.getRange(1, 1, 1, COLUNAS.length).setValues([COLUNAS]).setFontWeight('bold');
  aba.setFrozenRows(1);
  const max = aba.getMaxRows() - 1;
  const lista = (col, valores) => aba.getRange(2, COLUNAS.indexOf(col) + 1, max, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(false).build());
  lista('veredito', ['verdadeira', 'falsa']);
  lista('tecnica', ['fonte', 'data', 'imagem', 'contexto']);
  lista('status', ['rascunho', 'aprovada']);
  const intervalo = aba.getRange(2, 1, max, COLUNAS.length);
  const regra = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND(COUNTA($A2:$K2)>0; A2="")')
    .setBackground('#f4c7c3')
    .setRanges([intervalo])
    .build();
  aba.setConditionalFormatRules([regra]);
}
