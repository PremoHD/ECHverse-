/**
 * Complete Google Docs and Sheets Data Copy
 * Bound to the destination spreadsheet.
 * Source files are read only; no source file is edited, moved, or deleted.
 */
const CONFIG = {
  docsSheet: 'DOCS_TEXT',
  sheetsSheet: 'SHEETS_DATA',
  indexSheet: 'FILE_INDEX',
  errorsSheet: 'ERRORS',
  chunkSize: 200,
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Data Copy')
    .addItem('Copy all Docs and Sheets', 'copyAllDocsAndSheets')
    .addItem('Clear copied data', 'clearCopiedData')
    .addToUi();
}

function copyAllDocsAndSheets() {
  const ss = SpreadsheetApp.getActive();
  const index = ss.getSheetByName(CONFIG.indexSheet);
  const docsOut = ss.getSheetByName(CONFIG.docsSheet);
  const sheetsOut = ss.getSheetByName(CONFIG.sheetsSheet);
  const errorsOut = ss.getSheetByName(CONFIG.errorsSheet);
  const errors = [];
  const indexRows = [['id', 'name', 'mimeType', 'url', 'modifiedTime', 'status']];
  const docRows = [['id', 'name', 'url', 'text']];
  const sheetRows = [['id', 'name', 'url', 'tab', 'rowNumber', 'values', 'formulas']];

  clearCopiedData();
  const docFiles = DriveApp.searchFiles("mimeType = 'application/vnd.google-apps.document' and trashed = false");
  while (docFiles.hasNext()) {
    const file = docFiles.next();
    try {
      const doc = DocumentApp.openById(file.getId());
      docRows.push([file.getId(), file.getName(), file.getUrl(), doc.getBody().getText()]);
      indexRows.push([file.getId(), file.getName(), file.getMimeType(), file.getUrl(), file.getLastUpdated(), 'OK']);
    } catch (e) {
      errors.push([new Date(), file.getId(), file.getName(), 'DOC', String(e)]);
      indexRows.push([file.getId(), file.getName(), file.getMimeType(), file.getUrl(), file.getLastUpdated(), 'ERROR']);
    }
  }

  const sheetFiles = DriveApp.searchFiles("mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  while (sheetFiles.hasNext()) {
    const file = sheetFiles.next();
    try {
      const source = SpreadsheetApp.openById(file.getId());
      source.getSheets().forEach(tab => {
        const range = tab.getDataRange();
        const values = range.getDisplayValues();
        const formulas = range.getFormulas();
        values.forEach((row, r) => {
          if (row.some(v => v !== '') || formulas[r].some(v => v !== '')) {
            sheetRows.push([
              file.getId(), file.getName(), file.getUrl(), tab.getName(), r + 1,
              JSON.stringify(row), JSON.stringify(formulas[r])
            ]);
          }
        });
      });
      indexRows.push([file.getId(), file.getName(), file.getMimeType(), file.getUrl(), file.getLastUpdated(), 'OK']);
    } catch (e) {
      errors.push([new Date(), file.getId(), file.getName(), 'SHEET', String(e)]);
      indexRows.push([file.getId(), file.getName(), file.getMimeType(), file.getUrl(), file.getLastUpdated(), 'ERROR']);
    }
  }

  writeRows(index, indexRows);
  writeRows(docsOut, docRows);
  writeRows(sheetsOut, sheetRows);
  writeRows(errorsOut, [['timestamp', 'id', 'name', 'type', 'error']].concat(errors));
  [index, docsOut, sheetsOut, errorsOut].forEach(s => s.autoResizeColumns(1, Math.min(s.getMaxColumns(), 7)));
  ss.toast(`Copied ${docRows.length - 1} Docs and ${indexRows.length - docRows.length} Sheets.`, 'Data Copy', 8);
}

function writeRows(sheet, rows) {
  if (!rows.length) return;
  const width = Math.max(...rows.map(r => r.length));
  const normalized = rows.map(r => r.concat(Array(width - r.length).fill('')));
  for (let start = 0; start < normalized.length; start += CONFIG.chunkSize) {
    const chunk = normalized.slice(start, start + CONFIG.chunkSize);
    sheet.getRange(start + 1, 1, chunk.length, width).setValues(chunk);
  }
  sheet.setFrozenRows(1);
}

function clearCopiedData() {
  const ss = SpreadsheetApp.getActive();
  [CONFIG.indexSheet, CONFIG.docsSheet, CONFIG.sheetsSheet, CONFIG.errorsSheet].forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) sheet.clearContents();
  });
}
