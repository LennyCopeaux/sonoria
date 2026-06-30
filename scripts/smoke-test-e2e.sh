#!/usr/bin/env bash
# Smoke test — gateway routing for social-service & playlist-service
# Usage: ./scripts/smoke-test-e2e.sh
# Pre-requisite: docker compose up -d --build

set -uo pipefail

GW="http://localhost:3010"
PASS=0
FAIL=0
FAKE_UUID="00000000-0000-0000-0000-000000000001"

ok()   { echo "  ✓ $1"; PASS=$((PASS+1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL+1)); }

expect_routed() {
  # Returns true when the gateway actually routed the request.
  # A 404 is only a routing failure when the body says "No service registered".
  # Any other status (including 404/422/400 from the upstream service) means routing worked.
  local label="$1" status="$2" body="$3"
  if [[ "$status" == "000" ]]; then
    fail "$label — gateway unreachable (curl error)"
  elif [[ "$status" == "404" ]] && echo "$body" | grep -q "No service registered"; then
    fail "$label — 404 from gateway (route not registered)"
  else
    ok "$label — routed (HTTP $status)"
  fi
}

# ─────────────────────────────────────────────
# 0. Wait for gateway
# ─────────────────────────────────────────────
echo ""
echo "Waiting for gateway on $GW ..."
for i in $(seq 1 30); do
  if curl -sf "$GW/health" -o /dev/null 2>/dev/null; then
    echo "  Gateway is up."
    break
  fi
  if [[ $i -eq 30 ]]; then
    echo "  Gateway never responded. Aborting."
    exit 1
  fi
  sleep 2
done

# ─────────────────────────────────────────────
# 1. GET /health — services registered?
# ─────────────────────────────────────────────
echo ""
echo "=== 1. GET /health ==="
HEALTH=$(curl -sf "$GW/health" 2>/dev/null || echo '{}')
echo "  $HEALTH"

for svc in social-service playlist-service; do
  if echo "$HEALTH" | grep -q "\"$svc\""; then
    ok "$svc appears in /health"
  else
    fail "$svc missing from /health (not registered yet?)"
  fi
done

# ─────────────────────────────────────────────
# 2. Register + login → get JWT
# ─────────────────────────────────────────────
echo ""
echo "=== 2. Auth — register + login ==="
EMAIL="smoketest_$(date +%s)@test.local"
PASSWORD="Smoke1234!"

REG=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$GW/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Smoke Test\"}")
if [[ "$REG" == "201" ]]; then
  ok "POST /auth/register → 201"
else
  fail "POST /auth/register → $REG (expected 201)"
fi

LOGIN_RESP=$(curl -s -c /tmp/sonoria_cookies.txt -X POST "$GW/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>/dev/null || echo '{}')
TOKEN=$(echo "$LOGIN_RESP" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [[ -n "$TOKEN" ]]; then
  ok "POST /auth/login → token obtained"
else
  fail "POST /auth/login → no token (response: $LOGIN_RESP)"
fi

AUTH_HEADER="Authorization: Bearer $TOKEN"

# ─────────────────────────────────────────────
# 3. Social — /social/* routing
# ─────────────────────────────────────────────
echo ""
echo "=== 3. social-service routing ==="

# GET /social/notifications/unread
RESP=$(curl -s -w "\n%{http_code}" -H "$AUTH_HEADER" "$GW/social/notifications/unread")
S=$(echo "$RESP" | tail -1); B=$(echo "$RESP" | head -1)
expect_routed "GET /social/notifications/unread" "$S" "$B"

# POST /social/tracks/:id/like  (track won't exist → 404 from service, not from gateway)
RESP=$(curl -s -w "\n%{http_code}" -X POST -H "$AUTH_HEADER" "$GW/social/tracks/$FAKE_UUID/like")
S=$(echo "$RESP" | tail -1); B=$(echo "$RESP" | head -1)
expect_routed "POST /social/tracks/:id/like" "$S" "$B"

# DELETE /social/tracks/:id/like
RESP=$(curl -s -w "\n%{http_code}" -X DELETE -H "$AUTH_HEADER" "$GW/social/tracks/$FAKE_UUID/like")
S=$(echo "$RESP" | tail -1); B=$(echo "$RESP" | head -1)
expect_routed "DELETE /social/tracks/:id/like" "$S" "$B"

# GET /social/tracks/:id/comments
RESP=$(curl -s -w "\n%{http_code}" -H "$AUTH_HEADER" "$GW/social/tracks/$FAKE_UUID/comments")
S=$(echo "$RESP" | tail -1); B=$(echo "$RESP" | head -1)
expect_routed "GET /social/tracks/:id/comments" "$S" "$B"

# POST /social/tracks/:id/comments
RESP=$(curl -s -w "\n%{http_code}" -X POST -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"body":"smoke test comment"}' \
  "$GW/social/tracks/$FAKE_UUID/comments")
S=$(echo "$RESP" | tail -1); B=$(echo "$RESP" | head -1)
expect_routed "POST /social/tracks/:id/comments" "$S" "$B"

# ─────────────────────────────────────────────
# 4. Playlists — /playlists/* routing
# ─────────────────────────────────────────────
echo ""
echo "=== 4. playlist-service routing ==="

# POST /playlists — create
CREATE_RESP=$(curl -s -w "\n%{http_code}" -X POST -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"title":"Smoke Test Playlist","isPublic":true}' \
  "$GW/playlists" 2>/dev/null || echo -e "\n000")
PL_STATUS=$(echo "$CREATE_RESP" | tail -1)
PL_BODY=$(echo "$CREATE_RESP" | head -1)
expect_routed "POST /playlists (create)" "$PL_STATUS" "$PL_BODY"

PL_ID=$(echo "$PL_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  # GET /playlists/public
  RESP=$(curl -s -w "\n%{http_code}" "$GW/playlists/public")
  S=$(echo "$RESP" | tail -1); B=$(echo "$RESP" | head -1)
  expect_routed "GET /playlists/public" "$S" "$B"

if [[ -n "$PL_ID" ]]; then
  # GET /playlists/:id
  RESP=$(curl -s -w "\n%{http_code}" -H "$AUTH_HEADER" "$GW/playlists/$PL_ID")
  S=$(echo "$RESP" | tail -1); B=$(echo "$RESP" | head -1)
  expect_routed "GET /playlists/:id" "$S" "$B"

  # PATCH /playlists/:id
  RESP=$(curl -s -w "\n%{http_code}" -X PATCH -H "$AUTH_HEADER" \
    -H "Content-Type: application/json" \
    -d '{"title":"Smoke Updated"}' \
    "$GW/playlists/$PL_ID")
  S=$(echo "$RESP" | tail -1); B=$(echo "$RESP" | head -1)
  expect_routed "PATCH /playlists/:id" "$S" "$B"

  # DELETE /playlists/:id
  RESP=$(curl -s -w "\n%{http_code}" -X DELETE -H "$AUTH_HEADER" "$GW/playlists/$PL_ID")
  S=$(echo "$RESP" | tail -1); B=$(echo "$RESP" | head -1)
  expect_routed "DELETE /playlists/:id" "$S" "$B"
else
  fail "Playlist CRUD skipped — could not extract playlist ID from create response"
fi

# ─────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────
echo ""
echo "========================================="
echo "  Results: $PASS passed, $FAIL failed"
echo "========================================="
echo ""

[[ $FAIL -eq 0 ]] && exit 0 || exit 1
