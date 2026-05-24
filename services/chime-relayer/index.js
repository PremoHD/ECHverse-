'use strict';

/**
 * chime-visa-relayer
 * Instant-settlement relayer: receives settlement instructions from the
 * Pub/Sub event bus and forwards pull-funds transactions to the
 * Visa Direct sandbox API.
 */

const express = require('express');
const axios = require('axios');
const { PubSub } = require('@google-cloud/pubsub');

const app = express();
app.use(express.json());

const pubsub = new PubSub({ projectId: process.env.GCP_PROJECT_ID });
const VISA_URL = process.env.VISA_DIRECT_API_URL;

app.get('/healthz', (_req, res) => res.json({ status: 'ok', service: 'chime-visa-relayer' }));

app.post('/settle', async (req, res) => {
  try {
    const { amount, senderPAN, recipientPAN } = req.body;
    if (!amount || !senderPAN || !recipientPAN)
      return res.status(400).json({ error: 'amount, senderPAN, recipientPAN required' });

    // TODO: Add mTLS cert loading from VISA_CERT_PATH
    const response = await axios.post(VISA_URL, {
      amount,
      senderPrimaryAccountNumber: senderPAN,
      recipientPrimaryAccountNumber: recipientPAN,
      localTransactionDateTime: new Date().toISOString(),
    });

    return res.json({ success: true, visaResponse: response.data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`chime-visa-relayer listening on :${PORT}`));
