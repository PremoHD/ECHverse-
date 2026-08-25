# AgentSmith Command Console

**AgentSmith Command Console** is a Manifest V3 Chrome extension for local, user-directed browser missions. It combines a deterministic instruction planner, on-demand page inspection, a reviewable signal queue, a persisted mission state, and a local execution ledger. The console is informed by the supplied AgentSmith suite’s pipeline, audit, and dashboard concepts; its specific adaptation record is available in [SOURCE_PROVENANCE.md](SOURCE_PROVENANCE.md).

> **Operating model:** A mission is always built, displayed, and deliberately run by the user. Planning never changes the page. The extension does not use a remote model, transmit page content, accept web-page commands, or run a hidden background workflow.

| Console capability | What it does |
|---|---|
| Mission planning | Converts supported instructions into visible browser actions. |
| Page signals | Inspects the current page on demand and maps visible controls and fields into a local review queue. |
| Mission queue | Persists the planned action sequence and its progress in local extension storage. |
| Execution ledger | Retains the most recent 200 planned, completed, and failed mission/action records locally. |
| High-impact guard | Separately requires acknowledgement for actions whose label or requested behavior indicates deletion, payment, transfer, publishing, access changes, or similar material impact. |
| Sensitive-field guard | Refuses to enter passwords, one-time codes, payment verification values, government identifiers, private keys, or recovery credentials. |
| Scoped site access | Starts with temporary access to the tab in which the user invokes it; all-site access remains an optional, user-enabled permission. |

## Install locally

Download and extract the extension archive, then open `chrome://extensions` in Chrome. Enable **Developer mode**, select **Load unpacked**, and choose the extracted `chrome-agent-extension` directory. Pin **AgentSmith Command Console** from Chrome’s Extensions menu if desired.

The default configuration uses `activeTab`, `scripting`, and `storage`. The first two permissions permit an extension to act on the user-invoked active tab and inject an on-demand controller; broader host access is optional. Chrome describes `activeTab` as temporary host access following a user invocation, and documents `scripting` with either `activeTab` or host permissions. [1] [2]

## Mission language

Separate actions with **then**, **and then**, **next**, a semicolon, or a new line. The console accepts the following local, deterministic patterns.

| Intent | Examples |
|---|---|
| Inspect | `Inspect this page` · `Scan page` · `Map current site` |
| Navigate | `Go to example.com` · `Open https://example.com/help` |
| Click | `Click Settings` · `Press Continue` · `Select Save changes` |
| Type | `Type hello@example.com into Email` · `Enter "Taylor" into First name` |
| Scroll | `Scroll down` · `Scroll to the bottom` · `Scroll up 800px` |
| Wait | `Wait 2 seconds` · `Wait 10` |
| Sequence | `Inspect this page, then click Settings, then scroll to the bottom` |

The console preserves the parsed action in its visible **Approved queue**. If a clause is ambiguous or outside the supported command language, it reports the clause rather than guessing an action.

## Signals and the execution ledger

The **Signals** tab is the browser-native adaptation of the supplied AgentSmith suite’s review queue. Selecting **Inspect active page** locally maps visible buttons, links, and fields. It records only the control labels, type, score, and security markers; it does **not** collect or upload the page’s body, user-entered field values, credentials, payment data, or browsing history.

The **Ledger** tab adapts the supplied append-only audit concept for the extension environment. It keeps the 200 most recent records in `chrome.storage.local`, including planned missions and completed or failed actions. It supports review of what the user directed the extension to do, not autonomous execution beyond that approval. Chrome’s security guidance recommends treating content-script communication as less trustworthy and validating inputs; AgentSmith uses a fixed message schema, no external message listener, and DOM text rendering rather than untrusted HTML. [3]

## Essential boundaries

The supplied original source combines a full-stack dashboard with remote AI, Reddit, Stripe, database, payment, and cloud/CLI components. Those capabilities cannot safely be moved wholesale into a generic browser extension: they depend on separate user accounts, service credentials, policy obligations, and transaction authorization. The upgrade adopts the reusable architecture—inspection, queueing, scoring, mission state, and auditability—while deliberately excluding continuous scraping, unsolicited messaging, financial account operations, payment-link creation, secret handling, SSH/cloud-shell control, and unapproved background work.

This is a capability and safety boundary, not an installation limitation. The extension remains fully functional for its documented browser-mission scope and makes every potentially consequential step legible and user-approved.

## Project layout

```text
chrome-agent-extension/
├── manifest.json                # Manifest V3 configuration
├── package.json                 # Local module/test metadata
├── planner.js                   # Deterministic mission parser
├── background.js                # Mission coordinator and local audit ledger
├── controller.js                # Page observer and action executor
├── popup.html                   # Agent console interface
├── popup.css                    # Console styling
├── popup.js                     # Console behavior and review workflow
├── SOURCE_PROVENANCE.md         # Mapping from supplied sources to this extension
├── README.md                    # Installation and operating guide
└── tests/validate-extension.mjs # Static and parser validation
```

## Validation

Run the following command from this directory:

```bash
node tests/validate-extension.mjs
```

The script verifies the required files, Manifest V3 structure, least-privilege defaults, JavaScript module syntax, and representative command parsing. After loading the extension, manually verify an **Inspect**, **Scroll**, **Click**, **Type**, and **high-impact** workflow on a non-sensitive test page.

## References

[1]: https://developer.chrome.com/docs/extensions/reference/api/tabs "Chrome Tabs API — activeTab permission"
[2]: https://developer.chrome.com/docs/extensions/reference/api/scripting "Chrome Scripting API"
[3]: https://developer.chrome.com/docs/extensions/develop/concepts/messaging "Chrome extension message passing and security considerations"
