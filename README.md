
# Sovereign Neobank Stack (Reference Architecture)

This is a production-oriented reference stack for a compliant fintech / neobank platform
deployable on Google Cloud Platform using Cloud Shell.

## Components

- API Gateway: Kong
- Identity: Keycloak
- Core Ledger: Apache Fineract
- PostgreSQL
- Redis
- Kafka
- Kubernetes (GKE)
- Terraform Infrastructure
- Observability: Prometheus + Grafana
- Secrets: Google Secret Manager
- CI/CD: GitHub Actions

## IMPORTANT

This stack is a compliant engineering reference architecture only.
Real banking operations require:
- Regulatory licensing
- KYC/AML compliance
- PCI DSS controls
- Banking sponsor agreements
- Fraud monitoring
- Legal review

## Quick Deploy (Cloud Shell)

```bash
chmod +x deploy.sh
./deploy.sh
```

## Environment Variables

Copy:
```bash
cp .env.example .env
```

## Terraform

```bash
cd terraform
terraform init
terraform apply
```

## Kubernetes

```bash
kubectl apply -f k8s/
```

## Suggested Integrations

- Card issuing: Marqeta / Lithic
- ACH/Wire: Modern Treasury
- KYC: Persona
- Plaid aggregation
- Treasury banking partner
