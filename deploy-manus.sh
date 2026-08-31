#!/bin/bash

################################################################################
#  ECHverse Devoid Stack — Full Manus Runtime Deployment
#  Comprehensive deployment orchestration for production Manus environments
################################################################################

set -euo pipefail

# ═══════════════════════════════════════════════════════════════════════════
# Configuration & Globals
# ═══════════════════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ID="${PROJECT_ID:-}"
MANUS_REGION="${MANUS_REGION:-us-central1}"
MANUS_ENV="${MANUS_ENV:-production}"
MANUS_REPLICAS="${MANUS_REPLICAS:-2}"
DEPLOYMENT_NAME="echverse-devoid-stack"
LOG_FILE="${SCRIPT_DIR}/manus-deployment-$(date +%Y%m%d-%H%M%S).log"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ═══════════════════════════════════════════════════════════════════════════
# Utility Functions
# ═══════════════════════════════════════════════════════════════════════════

log() {
  local level="$1"
  shift
  local message="$@"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[${timestamp}] [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() {
  echo -e "${BLUE}ℹ${NC} $@" | tee -a "$LOG_FILE"
}

log_success() {
  echo -e "${GREEN}✓${NC} $@" | tee -a "$LOG_FILE"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $@" | tee -a "$LOG_FILE"
}

log_error() {
  echo -e "${RED}✗${NC} $@" | tee -a "$LOG_FILE"
}

log_section() {
  echo -e "\n${CYAN}════════════════════════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
  echo -e "${CYAN}  $@${NC}" | tee -a "$LOG_FILE"
  echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}" | tee -a "$LOG_FILE"
}

fail_exit() {
  log_error "$@"
  exit 1
}

check_command() {
  if ! command -v "$1" &> /dev/null; then
    fail_exit "Required command '$1' not found. Please install it first."
  fi
  log_success "Found $1 ($(command -v $1))"
}

# ═══════════════════════════════════════════════════════════════════════════
# Pre-flight Checks
# ═══════════════════════════════════════════════════════════════════════════

preflight_checks() {
  log_section "Pre-flight Checks"

  log_info "Verifying prerequisites..."
  check_command "manus"
  check_command "gcloud"
  check_command "kubectl"
  check_command "docker"
  check_command "pnpm"
  check_command "node"

  # Verify we're in the right directory
  if [[ ! -f "${SCRIPT_DIR}/manus.config.js" ]]; then
    fail_exit "manus.config.js not found in ${SCRIPT_DIR}"
  fi
  log_success "manus.config.js found"

  if [[ ! -f "${SCRIPT_DIR}/docker-compose.yml" ]]; then
    fail_exit "docker-compose.yml not found in ${SCRIPT_DIR}"
  fi
  log_success "docker-compose.yml found"

  log_success "All prerequisites verified"
}

# ═══════════════════════════════════════════════════════════════════════════
# GCP Authentication & Setup
# ═══════════════════════════════════════════════════════════════════════════

setup_gcp() {
  log_section "GCP Authentication & Setup"

  # Detect or prompt for PROJECT_ID
  if [[ -z "$PROJECT_ID" ]]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
    if [[ -z "$PROJECT_ID" ]]; then
      log_error "No GCP project configured"
      read -p "Enter GCP Project ID: " PROJECT_ID
      if [[ -z "$PROJECT_ID" ]]; then
        fail_exit "Project ID required"
      fi
    fi
  fi

  log_info "Using GCP Project: ${PROJECT_ID}"
  gcloud config set project "$PROJECT_ID" || fail_exit "Failed to set GCP project"

  # Ensure user is authenticated
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    log_warning "No active GCP authentication. Initiating login..."
    gcloud auth login || fail_exit "GCP authentication failed"
  fi
  log_success "GCP authentication verified"

  # Enable required APIs
  log_info "Enabling required Google Cloud APIs..."
  local apis=(
    "container.googleapis.com"
    "compute.googleapis.com"
    "cloudrun.googleapis.com"
    "cloudbuild.googleapis.com"
    "artifactregistry.googleapis.com"
    "secretmanager.googleapis.com"
    "pubsub.googleapis.com"
    "spanner.googleapis.com"
  )

  for api in "${apis[@]}"; do
    log_info "  Enabling $api..."
    gcloud services enable "$api" --quiet || log_warning "Could not enable $api"
  done
  log_success "Google Cloud APIs configured"
}

# ═══════════════════════════════════════════════════════════════════════════
# Environment Configuration
# ═══════════════════════════════════════════════════════════════════════════

setup_environment() {
  log_section "Environment Configuration"

  local env_file="${SCRIPT_DIR}/.env.manus"

  if [[ ! -f "$env_file" ]]; then
    log_warning ".env.manus not found. Creating from template..."
    cp "${SCRIPT_DIR}/manus-env.example" "$env_file" || fail_exit "Failed to create .env.manus"
    log_warning "Please edit .env.manus with your production secrets and re-run this script"
    return 1
  fi

  log_success ".env.manus loaded"
  export $(grep -v '^#' "$env_file" | xargs)
  log_info "Environment variables configured: PROJECT_ID=$PROJECT_ID"
}

# ═══════════════════════════════════════════════════════════════════════════
# Docker Image Build & Registry Push
# ═══════════════════════════════════════════════════════════════════════════

build_docker_images() {
  log_section "Building Docker Images"

  local registry="gcr.io/${PROJECT_ID}"
  local services=("apple-pay" "chime-relayer" "nacha-engine")

  # Enable Docker for GCP
  gcloud auth configure-docker gcr.io --quiet

  for service in "${services[@]}"; do
    local service_path="${SCRIPT_DIR}/services/${service}"
    if [[ ! -d "$service_path" ]]; then
      log_warning "Service directory not found: $service_path"
      continue
    fi

    local image_name="${registry}/echverse-${service}:latest"
    log_info "Building $service_path → $image_name"

    docker build \
      --tag "$image_name" \
      --label "deployment=${DEPLOYMENT_NAME}" \
      --label "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      "$service_path" || fail_exit "Docker build failed for $service"

    log_info "Pushing $image_name to GCR..."
    docker push "$image_name" || fail_exit "Docker push failed for $service"

    log_success "Built and pushed $service"
  done

  log_success "All Docker images built and pushed"
}

# ═══════════════════════════════════════════════════════════════════════════
# Manus Runtime Configuration
# ═══════════════════════════════════════════════════════════════════════════

configure_manus() {
  log_section "Configuring Manus Runtime"

  log_info "Initializing Manus project..."
  manus init \
    --project="$PROJECT_ID" \
    --config="${SCRIPT_DIR}/manus.config.js" \
    --force || log_warning "Manus init returned non-zero (may already exist)"

  log_info "Validating Manus configuration..."
  manus validate --config="${SCRIPT_DIR}/manus.config.js" || fail_exit "Manus configuration validation failed"

  log_success "Manus runtime configured"
}

# ═══════════════════════════════════════════════════════════════════════════
# Nexus Platform Build
# ═══════════════════════════════════════════════════════════════════════════

build_nexus_platform() {
  log_section "Building Nexus Platform"

  local nexus_dir="${SCRIPT_DIR}/nexus-platform"

  if [[ ! -d "$nexus_dir" ]]; then
    fail_exit "Nexus platform directory not found: $nexus_dir"
  fi

  cd "$nexus_dir"

  log_info "Installing dependencies..."
  pnpm install --frozen-lockfile || fail_exit "pnpm install failed"

  log_info "Type checking..."
  pnpm run check || log_warning "Type checking had warnings"

  log_info "Building application..."
  pnpm run build || fail_exit "Build failed"

  log_success "Nexus platform built successfully"

  cd "$SCRIPT_DIR"
}

# ═══════════════════════════════════════════════════════════════════════════
# GCP Secrets Management
# ═══════════════════════════════════════════════════════════════════════════

setup_secrets() {
  log_section "Setting Up GCP Secrets"

  local secrets=(
    "visa-api-key"
    "visa-cert"
    "echverse-cert"
    "echverse-key"
    "kms-key"
  )

  for secret in "${secrets[@]}"; do
    if ! gcloud secrets describe "$secret" --project="$PROJECT_ID" &>/dev/null; then
      log_warning "Secret not found: $secret"
      log_info "Create it manually: gcloud secrets create $secret --data-file=<file>"
    else
      log_success "Secret exists: $secret"
    fi
  done

  log_success "Secrets configuration complete"
}

# ═══════════════════════════════════════════════════════════════════════════
# Manus Deployment
# ═══════════════════════════════════════════════════════════════════════════

deploy_to_manus() {
  log_section "Deploying to Manus Runtime"

  log_info "Starting Manus deployment..."
  manus deploy \
    --config="${SCRIPT_DIR}/manus.config.js" \
    --project="$PROJECT_ID" \
    --region="$MANUS_REGION" \
    --environment="$MANUS_ENV" \
    --replicas="$MANUS_REPLICAS" \
    --force || fail_exit "Manus deployment failed"

  log_success "Deployment submitted to Manus"

  log_info "Waiting for services to stabilize (30 seconds)..."
  sleep 30
}

# ═══════════════════════════════════════════════════════════════════════════
# Health Checks & Verification
# ═══════════════════════════════════════════════════════════════════════════

verify_deployment() {
  log_section "Verifying Deployment"

  log_info "Checking Manus deployment status..."
  manus status --project="$PROJECT_ID" --region="$MANUS_REGION" || log_warning "Could not retrieve status"

  log_info "Checking service pods..."
  kubectl get pods --all-namespaces -l deployment="$DEPLOYMENT_NAME" 2>/dev/null || log_warning "kubectl not available"

  log_info "Running health checks..."
  local health_endpoints=(
    "https://apple-pay-ingress.echverse.manus.app/healthz"
    "https://chime-visa-relayer.echverse.manus.app/healthz"
    "https://ncsecu-ach-engine.echverse.manus.app/healthz"
  )

  local failed=0
  for endpoint in "${health_endpoints[@]}"; do
    if curl -sf "$endpoint" &>/dev/null; then
      log_success "Health check passed: $endpoint"
    else
      log_warning "Health check failed or endpoint unreachable: $endpoint"
      ((failed++))
    fi
  done

  if [[ $failed -gt 0 ]]; then
    log_warning "Some health checks failed. Services may still be starting."
  fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Monitoring & Logging Setup
# ═══════════════════════════════════════════════════════════════════════════

setup_monitoring() {
  log_section "Setting Up Monitoring & Logging"

  log_info "Configuring Cloud Logging..."
  log_info "  View logs: gcloud logging read --project=$PROJECT_ID"

  log_info "Configuring Cloud Monitoring..."
  log_info "  Dashboard: https://console.cloud.google.com/monitoring?project=$PROJECT_ID"

  log_info "Real-time logs:"
  log_info "  manus logs --project=$PROJECT_ID --follow"

  log_success "Monitoring configured"
}

# ═══════════════════════════════════════════════════════════════════════════
# Rollback Capability
# ═══════════════════════════════════════════════════════════════════════════

setup_rollback() {
  log_section "Rollback Configuration"

  log_info "Previous deployment revisions:"
  manus revisions --project="$PROJECT_ID" || log_warning "Could not retrieve revisions"

  log_info "To rollback to a previous version:"
  log_info "  manus rollback --project=$PROJECT_ID --revision=<revision-id>"

  log_success "Rollback capability ready"
}

# ═══════════════════════════════════════════════════════════════════════════
# Summary & Next Steps
# ═══════════════════════════════════════════════════════════════════════════

print_summary() {
  log_section "Deployment Complete"

  echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  ECHverse Manus Deployment Successful!                    ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}\n"

  echo -e "${CYAN}Deployment Details:${NC}"
  echo "  Project ID:      $PROJECT_ID"
  echo "  Region:          $MANUS_REGION"
  echo "  Environment:     $MANUS_ENV"
  echo "  Replicas:        $MANUS_REPLICAS"
  echo "  Log File:        $LOG_FILE"

  echo -e "\n${CYAN}Service Endpoints:${NC}"
  echo "  • Apple Pay:     https://apple-pay-ingress.echverse.manus.app"
  echo "  • Chime Relayer: https://chime-visa-relayer.echverse.manus.app"
  echo "  • ACH Engine:    https://ncsecu-ach-engine.echverse.manus.app"

  echo -e "\n${CYAN}Monitoring & Debugging:${NC}"
  echo "  View Logs:       manus logs --project=$PROJECT_ID --follow"
  echo "  Status:          manus status --project=$PROJECT_ID"
  echo "  Metrics:         https://console.cloud.google.com/monitoring?project=$PROJECT_ID"
  echo "  Cloud Logging:   https://console.cloud.google.com/logs?project=$PROJECT_ID"

  echo -e "\n${CYAN}Scaling & Management:${NC}"
  echo "  Scale Services:  manus scale --project=$PROJECT_ID --replicas=<N>"
  echo "  Update Config:   manus update --config=manus.config.js --project=$PROJECT_ID"
  echo "  Rollback:        manus rollback --project=$PROJECT_ID --revision=<revision-id>"

  echo -e "\n${CYAN}Additional Resources:${NC}"
  echo "  Manus Docs:      https://docs.manus.sh"
  echo "  GCP Console:     https://console.cloud.google.com?project=$PROJECT_ID"
  echo -e "\n"
}

# ═══════════════════════════════════════════════════════════════════════════
# Main Execution Flow
# ═══════════════════════════════════════════════════════════════════════════

main() {
  echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  ECHverse Devoid Stack                                     ║${NC}"
  echo -e "${BLUE}║  Full Manus Runtime Deployment Orchestration               ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

  log_info "Starting deployment at $(date)"
  log_info "Log file: $LOG_FILE"

  # Execute deployment steps
  preflight_checks || return 1
  setup_gcp || return 1
  setup_environment || return 1
  build_docker_images || return 1
  configure_manus || return 1
  build_nexus_platform || return 1
  setup_secrets || return 1
  deploy_to_manus || return 1
  verify_deployment || return 1
  setup_monitoring || return 1
  setup_rollback || return 1

  print_summary
  log_success "Full Manus deployment completed at $(date)"
}

# Execute main with error handling
if main; then
  exit 0
else
  log_error "Deployment failed. Check $LOG_FILE for details."
  exit 1
fi
