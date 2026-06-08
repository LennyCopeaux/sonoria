#!/usr/bin/env bash
set -euo pipefail

# Test manuel des endpoints feat/social via le gateway.
# Prérequis : postgres + redis + gateway (3010) + user-service (3001)

API="${API:-http://localhost:3010}"
EMAIL="${EMAIL:-social-demo@sonoria.dev}"
PASSWORD="${PASSWORD:-password123}"
NAME="${NAME:-Demo User}"

echo "=== SONORIA — test social ==="
echo "API: $API"
echo

# --- Auth ---
echo "→ Register / login"
REGISTER=$(curl -sf -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"$NAME\"}" 2>/dev/null || true)

if [ -n "$REGISTER" ]; then
  TOKEN=$(echo "$REGISTER" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
  USER_ID=$(echo "$REGISTER" | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['id'])")
else
  TOKEN=$(curl -sf -X POST "$API/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
  USER_ID=$(curl -sf -X POST "$API/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['user']['id'])")
fi

AUTH="Authorization: Bearer $TOKEN"
echo "   userId: $USER_ID"
echo

# --- Seed DB (artiste + track READY) ---
echo "→ Seed artiste + track en base"
docker exec -i sonoria-postgres psql -U sonoria -d sonoria >/dev/null <<'SQL'
DELETE FROM "PlaylistTrack" WHERE "trackId" IN (SELECT id FROM "Track" WHERE slug = 'track-test');
DELETE FROM "Like" WHERE "trackId" IN (SELECT id FROM "Track" WHERE slug = 'track-test');
DELETE FROM "Comment" WHERE "trackId" IN (SELECT id FROM "Track" WHERE slug = 'track-test');
DELETE FROM "Track" WHERE slug = 'track-test';
DELETE FROM "Follow" WHERE "artistId" IN (SELECT id FROM "ArtistProfile" WHERE slug = 'artiste-demo');
DELETE FROM "ArtistProfile" WHERE slug = 'artiste-demo';
DELETE FROM "User" WHERE email = 'artist@sonoria.dev';

INSERT INTO "User" (id, email, "passwordHash", name, role, "updatedAt")
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'artist@sonoria.dev', 'hash', 'Artiste Demo', 'ARTIST', NOW());

INSERT INTO "ArtistProfile" (id, "userId", slug, "updatedAt")
VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'artiste-demo', NOW());

INSERT INTO "Track" (id, title, slug, tags, status, "uploaderId", "artistProfileId", "updatedAt")
VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Track Test', 'track-test', '{}', 'READY', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', NOW());
SQL
echo "   artistId: bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
echo "   trackId:  cccccccc-cccc-4ccc-8ccc-cccccccccccc"
echo

TRACK_ID=cccccccc-cccc-4ccc-8ccc-cccccccccccc
ARTIST_ID=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb

# --- Social ---
echo "→ POST /tracks/:id/like"
curl -sf -X POST "$API/tracks/$TRACK_ID/like" -H "$AUTH" | python3 -m json.tool
echo

echo "→ GET /tracks (liste)"
curl -sf "$API/tracks" -H "$AUTH" | python3 -m json.tool | head -30
echo

echo "→ POST /artists/:id/follow"
curl -sf -X POST "$API/artists/$ARTIST_ID/follow" -H "$AUTH" | python3 -m json.tool
echo

echo "→ POST /tracks/:id/comments"
curl -sf -X POST "$API/tracks/$TRACK_ID/comments" -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d '{"body":"Super morceau !"}' | python3 -m json.tool
echo

echo "→ GET /tracks/:id/comments"
curl -sf "$API/tracks/$TRACK_ID/comments" -H "$AUTH" | python3 -m json.tool
echo

echo "→ GET /notifications/unread"
curl -sf "$API/notifications/unread" -H "$AUTH" | python3 -m json.tool
echo

echo "→ POST /playlists"
PLAYLIST=$(curl -sf -X POST "$API/playlists" -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d '{"title":"Ma playlist test","isPublic":true}')
echo "$PLAYLIST" | python3 -m json.tool
PLAYLIST_ID=$(echo "$PLAYLIST" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo

echo "→ POST /playlists/:id/tracks"
curl -sf -X POST "$API/playlists/$PLAYLIST_ID/tracks" -H "$AUTH" \
  -H 'Content-Type: application/json' \
  -d "{\"trackId\":\"$TRACK_ID\",\"position\":0}" | python3 -m json.tool
echo

echo "→ GET /playlists/public"
curl -sf "$API/playlists/public" -H "$AUTH" | python3 -m json.tool
echo

echo "→ GET /search?q=track&type=track"
curl -sf "$API/search?q=track&type=track" -H "$AUTH" | python3 -m json.tool
echo

echo "✓ Tests terminés"
