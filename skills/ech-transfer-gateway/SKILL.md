---
name: ech-transfer-gateway
description: Route and validate ECH.ai transfer intents across ACH, ISO20022, SFTP and Web3 adapters without exposing credentials.
---

# ECH Transfer Gateway

Use the ECH action model:

`ACTOR → STATE → ACTION → TARGET + TRACE/ECHO/SHIFT/RELEASE`

## Workflow

1. Parse transfer intent.
2. Validate required source, destination, amount, currency and reference.
3. Resolve the requested rail or use deterministic auto-routing.
4. Produce a preview containing route, trace ID and authorization state.
5. Send only an authorized transfer to the ECH MCP gateway.
6. Record an append-only action event and returned trace.
7. Never expose credentials, private keys, PANs, SFTP passwords or secrets in UI/logs/prompts.

## Routing

- SFTP → `sftp://` adapter
- ISO 20022 → `iso20022://` adapter
- ACH → `ach://` adapter
- Web3 → `web3://` adapter
- Unknown → preview only; require explicit authorization

## UI contract

The transfer portal lives at `apps/transfer-portal/` and must call a gateway API rather than directly connecting to financial rails.
