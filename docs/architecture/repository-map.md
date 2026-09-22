# ECHverse Canonical Repository Map

This map is the binding path contract for the ECH.ai application.

```text
ECHverse-/
├── apps/
│   └── transfer-portal/       # Dynamic browser gateway UI
├── config/                    # Runtime and transport configuration
├── docs/
│   └── architecture/          # Architecture and path contracts
├── services/                  # Rail adapters and backend services
├── skills/                    # Gemini CLI / ECH agent skills
├── scripts/                   # Operational tooling
├── k8s/                       # Kubernetes deployment
├── terraform/                 # Infrastructure as code
├── artifacts/                 # Immutable exports / records
└── .gemini/                   # Project-scoped Gemini CLI configuration
```

## Binding rules

- Browser UI: `apps/transfer-portal/`
- Agent skills: `skills/<skill-name>/SKILL.md`
- MCP configuration: `.gemini/settings.json`
- Financial/rail services: `services/`
- Deployment: `k8s/` and `terraform/`
- Architecture: `docs/architecture/`
- Runtime secrets: environment/secret manager only; never committed.

## Gateway boundary

`apps/transfer-portal` is presentation only. It must not contain bank credentials, private keys, direct production rail credentials, or privileged settlement logic. All real transfer execution must cross the authenticated ECH.ai gateway/MCP boundary.

## README-derived existing services

The current README describes Envoy ingress, Apple Pay ingress, Chime/Visa relaying, NCSECU ACH processing, Pub/Sub state events, and Spanner ledger state. Those existing services remain under `services/` and are not duplicated in the UI.
