
#!/bin/bash
set -e

echo "[1/5] Enabling Google APIs"
gcloud services enable compute.googleapis.com
gcloud services enable container.googleapis.com
gcloud services enable secretmanager.googleapis.com

echo "[2/5] Creating GKE Cluster"
gcloud container clusters create neobank-cluster \
  --zone us-central1-a \
  --num-nodes 3

echo "[3/5] Getting credentials"
gcloud container clusters get-credentials neobank-cluster --zone us-central1-a

echo "[4/5] Deploying Kubernetes resources"
kubectl apply -f k8s/

echo "[5/5] Done"
kubectl get pods -A
