# Complete Google Docs and Sheets Copy

This Google Apps Script is intended to run from a spreadsheet-bound Apps Script project. It reads accessible, non-trashed Google Docs and Google Sheets and writes document text, spreadsheet rows, file metadata, and errors into dedicated tabs. It does not edit, move, or delete source files.

Open the destination spreadsheet, choose **Extensions → Apps Script**, add `CompleteGoogleDocsSheetsCopy.gs`, save, reload the spreadsheet, and use the **Data Copy** menu.

The script copies document body text and spreadsheet displayed values plus formulas. It does not reproduce comments, suggestions, embedded images, charts, protected ranges, or source formatting.
