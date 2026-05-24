'use strict';

/**
 * apple-pay-ingress
 * Edge cryptography service: receives Apple Pay payment tokens,
 * decrypts them via GCP KMS (or KMS emulator), and publishes
 * state events to the Pub/Sub topic.
 */

const express = require('express');
const { PubSub } = require('@google-cloud/pubsub');

const app = express();
app.use(express.json());

const pubsub = new PubSub({ projectId: process.env.GCP_PROJECT_ID });
const TOPIC = process.env.PUBSUB_TOPIC || 'state-events';

app.get('/healthz', (_req, res) => res.json({ status: 'ok', service: 'apple-pay-ingress' }));

app.post('/decrypt', async (req, res) => {
  try {
    const { paymentToken } = req.body;
    if (!paymentToken) return res.status(400).json({ error: 'paymentToken required' });

    // TODO: Replace with real GCP KMS ECC decryption
    const decrypted = { ...paymentToken, decrypted: true, ts: Date.now() };

    const topic = pubsub.topic(TOPIC);
    await topic.publishMessage({ json: { type: 'APPLE_PAY_DECRYPTED', payload: decrypted } });

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`apple-pay-ingress listening on :${PORT}`));
