# ECHverse — Devoid Entity Sovereign Stack

A production-oriented reference architecture for the **Ellis Clearing House (ECH)** omni-directional payment platform, deployable locally via Docker Compose or on Google Cloud Platform via Cloud Run / GKE.

---

## Architecture Overview

```
CLIENT APPS
   |
ECH AUTH GATEWAY  (Envoy — QUIC/HTTP3 + mTLS)
   |
┌──────────────────────────────────────────┐
│  DEVOID-MESH (Docker bridge network)     │
│                                          │
│  apple-pay-ingress   :3000               │
│  chime-visa-relayer  :3001               │
│  ncsecu-ach-engine   :3002               │
└──────────────────────────────────────────┘
   |                         |
PUBSUB EMULATOR :8085   SPANNER EMULATOR :9010/9020
```

## Services

| Container | Image / Build | Purpose |
|---|---|---|
| `ech_auth_gateway` | `envoyproxy/envoy:v1.28-latest` | QUIC/HTTP3 sovereign ingress, mTLS termination |
| `apple_pay_ingress` | `./services/apple-pay` | Apple Pay ECC token decryption via GCP KMS |
| `chime_relayer` | `./services/chime-relayer` | Visa Direct instant-settlement pull-funds relay |
| `ncsecu_ach_engine` | `./services/nacha-engine` | NACHA batch ACH engine targeting NCSECU (253177049) |
| `pubsub_emulator` | `gcr.io/google.com/cloudsdktool/cloud-sdk:emulators` | GCP Pub/Sub state event bus (local emulation) |
| `spanner_emulator` | `gcr.io/cloud-spanner-emulator/emulator:latest` | GCP Spanner non-custodial ledger (local emulation) |

---

## Quick Start (Local Docker Compose)

```bash
# 1. Clone the repo
git clone https://github.com/PremoHD/ECHverse-.git && cd ECHverse-

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your real PROJECT_ID and credentials

# 3. Bring the stack online
docker compose up -d

# 4. Check health
curl http://localhost:3000/healthz   # Apple Pay ingress
curl http://localhost:3001/healthz   # Chime relayer
curl http://localhost:3002/healthz   # NCSECU ACH engine
```

---

## Google Cloud Shell Deployment

```bash
# 1. Open Cloud Shell at https://shell.cloud.google.com
# 2. Clone and enter the repo
git clone https://github.com/PremoHD/ECHverse-.git && cd ECHverse-

# 3. Set your project
export PROJECT_ID=<your-gcp-project-id>

# 4. Run the deploy script
chmod +x deploy.sh && ./deploy.sh
```

To translate to Cloud Run / GKE, prompt Gemini Assist in Cloud Shell:
> *"Gemini, parse my docker-compose.yml. Translate it into a cloudbuild.yaml for Cloud Run deployment."*

---

## Directory Structure

```
ECHverse-/
├── docker-compose.yml          # Devoid Core stack
├── .env.example                # Environment variable template
├── deploy.sh                   # Cloud Shell deploy helper
├── config/
│   └── envoy.yaml              # Envoy proxy routing config
├── certs/                      # mTLS developer certificates (gitignored)
├── services/
│   ├── apple-pay/              # Apple Pay decryption service (Node.js)
│   ├── chime-relayer/          # Chime / Visa Direct relayer (Node.js)
│   └── nacha-engine/           # NCSECU NACHA ACH engine (Node.js)
├── k8s/                        # Kubernetes manifests
│   ├── fineract.yaml
│   └── keycloak.yaml
└── terraform/                  # GCP infrastructure as code
    ├── main.tf
    └── variables.tf
```

---

## IMPORTANT

This stack is a **compliant engineering reference architecture only**. Real banking operations require:

- Regulatory licensing and banking sponsor agreements
- KYC / AML compliance programs
- PCI DSS controls and audit
- Fraud monitoring and dispute resolution
- Full legal review before any live transaction processing

---

## Terraform

```bash
cd terraform
terraform init
terraform apply -var="project_id=$PROJECT_ID"
```

## Kubernetes

```bash
kubectl apply -f k8s/
```
