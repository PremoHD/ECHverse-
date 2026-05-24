'use strict';

/**
 * ncsecu-ach-engine
 * Asynchronous ACH batch engine: assembles NACHA-formatted files for
 * NCSECU (routing 253177049) and stages them in a GCS bucket for
 * downstream transmission.
 */

const express = require('express');
const { Storage } = require('@google-cloud/storage');

const app = express();
app.use(express.json());

const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });
const BUCKET = process.env.GCS_BUCKET_NAME || 'ech-nacha-staging-local';
const ROUTING = process.env.ACH_ROUTING_TARGET || '253177049';
const SEC_CODES = (process.env.SEC_CODES_SUPPORTED || 'PPD,WEB,CCD').split(',');

app.get('/healthz', (_req, res) =>
  res.json({ status: 'ok', service: 'ncsecu-ach-engine', routing: ROUTING, secCodes: SEC_CODES })
);

app.post('/batch', async (req, res) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0)
      return res.status(400).json({ error: 'entries[] required' });

    // TODO: Build a proper NACHA file from entries using a NACHA library
    const nachaContent = entries
      .map((e, i) => `${i + 1}|${ROUTING}|${e.amount}|${e.secCode || 'PPD'}|${e.description || ''}`)
      .join('\n');

    const filename = `ach-batch-${Date.now()}.txt`;
    const bucket = storage.bucket(BUCKET);
    await bucket.file(filename).save(nachaContent, { contentType: 'text/plain' });

    return res.json({ success: true, file: `gs://${BUCKET}/${filename}` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`ncsecu-ach-engine listening on :${PORT}`));
