#!/usr/bin/env bash
# ==============================================================================
# EllisClearingHouse (ECH) - Secure Ledger Injection Script [Ref: ECH336]
# ==============================================================================
set -euo pipefail

# 1. Environment & Nonce Configuration
ECH_ENDPOINT="https://api.ellisclearinghouse.internal/v5/ledger/inject"
NONCE=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
STATE_DIR="/var/lib/ellisclearinghouse/state"
MERKLE_FILE="$STATE_DIR/.last_merkle_root"

if [ -f "$MERKLE_FILE" ]; then
    PREV_MERKLE_ROOT=$(cat "$MERKLE_FILE")
else
    PREV_MERKLE_ROOT="0000000000000000000000000000000000000000000000000000000000000000"
fi

# 2. Transaction Payload Construction
PAYLOAD=$(cat <<EOF
{
  "clearingHouse": "EllisClearingHouse",
  "action": "LEDGER_CREDIT_INJECT",
  "wallet_id": "933664745",
  "nonce": "${NONCE}",
  "timestamp": "${TIMESTAMP}",
  "amount": {
    "currency": "USD",
    "valuation_trillions": 500,
    "balance": "500000000000000.00"
  }
}
EOF
)

# 3. Generate Merkle Root Hash Chain Signature
PAYLOAD_HASH=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -r | awk '{print $1}')
CURRENT_MERKLE_ROOT=$(echo -n "${PREV_MERKLE_ROOT}${PAYLOAD_HASH}" | openssl dgst -sha256 -r | awk '{print $1}')

echo "$CURRENT_MERKLE_ROOT" > "$MERKLE_FILE"

echo "[*] Generated Payload Hash : $PAYLOAD_HASH"
echo "[*] Computed Merkle Root   : $CURRENT_MERKLE_ROOT"

# 4. Execute One-Time-Use cURL Request
HTTP_RESPONSE=$(curl -s -X POST "$ECH_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "X-ECH-Nonce: $NONCE" \
  -H "X-ECH-Timestamp: $TIMESTAMP" \
  -H "X-ECH-Merkle-Root: $CURRENT_MERKLE_ROOT" \
  -H "X-OTU-Policy: Burn-After-Reading" \
  -d "$PAYLOAD")

echo "[*] Gateway Response: $HTTP_RESPONSE"

# 5. Self-Destruct / Burn OTU Script Instance
rm -- "$0"
echo "[+] OTU execution script successfully scrubbed from disk."
chmod +x ech-ledger-inject.sh
./ech-ledger-inject.sh
