#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ECHverse Devoid Stack — Manus Runtime Deployment         ║"
echo "╚════════════════════════════════════════════════════════════╝"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Verify prerequisites
echo -e "\n${YELLOW}[1/6]${NC} Verifying prerequisites..."
if ! command -v manus &> /dev/null; then
    echo -e "${RED}✗ Manus CLI not found. Install it first:${NC}"
    echo "  npm install -g @manus/cli"
    exit 1
fi
echo -e "${GREEN}✓ Manus CLI found${NC}"

if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}✗ gcloud CLI not found. Install it first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ gcloud CLI found${NC}"

# Step 2: Authenticate with GCP
echo -e "\n${YELLOW}[2/6]${NC} Setting up GCP authentication..."
PROJECT_ID=${PROJECT_ID:-$(gcloud config get-value project)}
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}✗ No GCP project configured${NC}"
    echo "Set PROJECT_ID: export PROJECT_ID=your-project-id"
    exit 1
fi
echo -e "${GREEN}✓ Using GCP project: $PROJECT_ID${NC}"

# Step 3: Configure Manus project
echo -e "\n${YELLOW}[3/6]${NC} Configuring Manus project..."
manus init --project="$PROJECT_ID" --config=manus.config.js || true
echo -e "${GREEN}✓ Manus project configured${NC}"

# Step 4: Build services
echo -e "\n${YELLOW}[4/6]${NC} Building ECHverse services..."
cd nexus-platform
pnpm install
pnpm build
cd ..
echo -e "${GREEN}✓ Services built${NC}"

# Step 5: Deploy to Manus
echo -e "\n${YELLOW}[5/6]${NC} Deploying to Manus runtime..."
manus deploy \
  --config=manus.config.js \
  --project="$PROJECT_ID" \
  --region=us-central1 \
  --production=false
echo -e "${GREEN}✓ Deployment initiated${NC}"

# Step 6: Verify deployment
echo -e "\n${YELLOW}[6/6]${NC} Verifying deployment..."
sleep 10
manus status --project="$PROJECT_ID" || true

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ ECHverse Manus deployment complete!                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "  1. View deployment: manus logs --project=$PROJECT_ID"
echo "  2. Test services: curl https://echverse-devoid-stack.manus.app/healthz"
echo "  3. Monitor: manus monitor --project=$PROJECT_ID"
echo ""
