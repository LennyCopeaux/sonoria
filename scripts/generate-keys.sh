#!/usr/bin/env bash
set -euo pipefail

# Generate RSA 2048 key pair and print base64-encoded values for .env
TMP_DIR=$(mktemp -d)
PRIV="$TMP_DIR/private.pem"
PUB="$TMP_DIR/public.pem"

openssl genrsa -out "$PRIV" 2048 2>/dev/null
openssl rsa -in "$PRIV" -pubout -out "$PUB" 2>/dev/null

b64() {
  if base64 --help 2>/dev/null | grep -q '\-w'; then
    base64 -w0 "$1"
  else
    base64 < "$1" | tr -d '\n'
  fi
}

echo "JWT_PRIVATE_KEY=$(b64 "$PRIV")"
echo "JWT_PUBLIC_KEY=$(b64 "$PUB")"

rm -rf "$TMP_DIR"
