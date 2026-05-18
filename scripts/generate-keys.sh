#!/usr/bin/env bash
set -euo pipefail

# Generate RSA 2048 key pair and print base64-encoded values for .env
TMP_DIR=$(mktemp -d)
PRIV="$TMP_DIR/private.pem"
PUB="$TMP_DIR/public.pem"

openssl genrsa -out "$PRIV" 2048 2>/dev/null
openssl rsa -in "$PRIV" -pubout -out "$PUB" 2>/dev/null

echo "JWT_PRIVATE_KEY=$(base64 -w0 "$PRIV")"
echo "JWT_PUBLIC_KEY=$(base64 -w0 "$PUB")"

rm -rf "$TMP_DIR"
