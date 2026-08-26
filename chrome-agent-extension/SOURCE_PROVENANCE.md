# AgentSmith Source Provenance and Adaptation Record

This extension upgrade was developed from the source materials supplied by the user on 25 August 2026. The materials were inspected as data only; no supplied executable, server process, browser automation, credentialed API call, payment operation, or embedded repository command was run.

| Supplied material | Relevant original concept | Adaptation in AgentSmith Command Console |
|---|---|---|
| `Smithcliagent` | Persistent event queue, strict event schema, risk evaluation, append-only ledger, retry-aware operational state. | `background.js` validates a fixed action schema, records planned/completed/failed activity in bounded local storage, persists an active mission, and preserves a reviewable execution ledger. |
| `Secret-Agent-Suite/server/agent.ts` | Listener → processor → action pipeline, signal scoring, modular agent responsibilities, resilient fallback behavior. | The extension adopts a page-inspection → local signal queue → approved mission action pipeline. It excludes Reddit, Stripe, and remote-model calls because those require separate credentials, permissions, and transaction controls. |
| `Secret-Agent-Suite/shared/schema.ts` | Structured signal and offer records with status and timestamps. | The local page map stores structured signals with category, label, score, high-impact marker, sensitive-field marker, and inspection timestamp; the audit ledger stores action status and timestamps. |
| `Secret-Agent-Suite/client/src/pages/Dashboard.tsx` | Activity metrics and real-time operator overview. | The popup displays local mission, action, and signal metrics with a compact monitoring console layout. |
| `Secret-Agent-Suite/client/src/pages/Signals.tsx` | Explicit operator review queue, risk/relevance scoring, and intentional per-item follow-up. | The **Signals** tab presents locally mapped visible controls, their score, and high-impact/sensitive markers before the user instructs the agent to act. |
| `Secret-Agent-Suite/attached_assets/*agent*.txt` | Signal collection, state persistence, model-assisted generation, payment-link creation, and dispatch workflow. | The extension preserves the inspect, queue, action, and audit concepts while intentionally excluding continuous scraping, unsolicited outreach, payment-link creation, and remote agent loops. |
| `Agentsmith2.txt` | Enterprise system, security, compliance, finance, and security-monitoring requirements. | The extension uses the applicable principles of least privilege, reviewable actions, local auditability, explicit user authorization, and sensitive-data protection. It does not represent a banking, government, or regulated-service integration. |
| `Agentsmith3.txt` and `Agentsmith4.txt` | Cloud Shell, SSH, transport, and deployment integration ideas. | The browser extension remains self-contained and does not open SSH sessions, tunnels, cloud shells, or remote environments. These flows require a separate authenticated environment and cannot safely be embedded in a general browser agent. |

> **Scope determination:** The original suite combines a full-stack application, third-party APIs, background processing, and financial/payment features. A Manifest V3 browser extension cannot safely or correctly absorb those server-side credentials and operations into an unrestricted client-side agent. The implemented upgrade therefore ports the reusable architecture and interaction concepts while keeping browser execution explicit, local, and reviewable.

## Implementation sources

The following new extension files implement the adapted behavior:

| File | Responsibility |
|---|---|
| `planner.js` | Deterministic mission parsing for navigation, inspection, click, type, scroll, and wait actions. |
| `background.js` | Mission persistence, schema validation, local audit ledger, inspection-state persistence, and active-tab coordination. |
| `controller.js` | On-demand visible-control mapping, sensitive-field detection, control resolution, and approved page action execution. |
| `popup.html`, `popup.css`, `popup.js` | Agent console, mission queue, signal review tab, ledger tab, local metrics, and permission controls. |
| `tests/validate-extension.mjs` | Manifest, syntax, and mission-planner validation. |
