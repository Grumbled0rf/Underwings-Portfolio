#!/usr/bin/env bash
# ============================================================
# provision-admin.sh
# Idempotently creates / updates the Underwings admin user from
# ADMIN_EMAIL + ADMIN_PASSWORD in the project .env file.
#
# - Creates the auth user via the Supabase Auth Admin API
#   (or updates the password if the user already exists)
# - Inserts the user id into public.admin_users so is_admin() returns true
# - Never echoes the password to stdout / logs / git
#
# Usage: bash scripts/provision-admin.sh
# ============================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
[ -f "$ENV_FILE" ] || { echo "ERR: $ENV_FILE not found" >&2; exit 1; }

# Source .env without exporting / executing values; just the keys we need.
ADMIN_EMAIL="$(grep -E '^ADMIN_EMAIL=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
ADMIN_PASSWORD="$(grep -E '^ADMIN_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
SERVICE_ROLE_KEY="$(grep -E '^SERVICE_ROLE_KEY=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
POSTGRES_USER="$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
POSTGRES_PASSWORD="$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2-)"
POSTGRES_DB="$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | head -1 | cut -d= -f2-)"

[ -n "${ADMIN_EMAIL:-}" ]      || { echo "ERR: ADMIN_EMAIL missing in .env"      >&2; exit 1; }
[ -n "${ADMIN_PASSWORD:-}" ]   || { echo "ERR: ADMIN_PASSWORD missing in .env"   >&2; exit 1; }
[ -n "${SERVICE_ROLE_KEY:-}" ] || { echo "ERR: SERVICE_ROLE_KEY missing in .env" >&2; exit 1; }

AUTH_URL="http://localhost:8000/auth/v1"   # via kong gateway exposed locally

echo "→ Provisioning admin: $ADMIN_EMAIL"

# 1. Try to create user. On 422 "already registered", look up id and patch password.
CREATE_RESP="$(curl -s -o /tmp/_admin_create.json -w '%{http_code}' \
  -X POST "$AUTH_URL/admin/users" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H 'Content-Type: application/json' \
  --data-binary @<(jq -nc --arg e "$ADMIN_EMAIL" --arg p "$ADMIN_PASSWORD" \
    '{email:$e, password:$p, email_confirm:true}'))"

if [ "$CREATE_RESP" = "200" ] || [ "$CREATE_RESP" = "201" ]; then
  USER_ID="$(jq -r '.id // .user.id' /tmp/_admin_create.json)"
  echo "  created. user_id=$USER_ID"
elif [ "$CREATE_RESP" = "422" ] || [ "$CREATE_RESP" = "409" ]; then
  echo "  user exists; updating password..."
  # Look up by email
  LIST_RESP="$(curl -s "$AUTH_URL/admin/users?email=$ADMIN_EMAIL" \
    -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY")"
  USER_ID="$(echo "$LIST_RESP" | jq -r '.users[0].id // .[0].id // empty')"
  [ -n "$USER_ID" ] || { echo "ERR: user lookup failed: $LIST_RESP" >&2; exit 1; }
  PATCH_RESP="$(curl -s -o /tmp/_admin_patch.json -w '%{http_code}' \
    -X PUT "$AUTH_URL/admin/users/$USER_ID" \
    -H "apikey: $SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H 'Content-Type: application/json' \
    --data-binary @<(jq -nc --arg p "$ADMIN_PASSWORD" '{password:$p, email_confirm:true}'))"
  [ "$PATCH_RESP" = "200" ] || { echo "ERR: password update failed (HTTP $PATCH_RESP): $(cat /tmp/_admin_patch.json)" >&2; exit 1; }
  echo "  updated. user_id=$USER_ID"
else
  echo "ERR: create returned HTTP $CREATE_RESP: $(cat /tmp/_admin_create.json)" >&2
  exit 1
fi

# 2. Ensure user is in public.admin_users
echo "→ Granting admin role in public.admin_users"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" underwings-db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "INSERT INTO public.admin_users (id, role) VALUES ('$USER_ID', 'admin') ON CONFLICT (id) DO UPDATE SET role='admin';" \
  | sed -E 's/^[A-Z]+ [0-9]+$/  inserted\/upserted/'

# Cleanup temp files (don't leak password-bearing JSON)
rm -f /tmp/_admin_create.json /tmp/_admin_patch.json

echo "✓ Done. Admin user ready: $ADMIN_EMAIL"
echo "  Login at: https://underwings.org/admin/login"
