#!/bin/bash

# ===========================================
# Supabase JWT Key Generator
# Generates secure keys for self-hosted Supabase
# ===========================================

set -e

echo "🔐 Generating Supabase Keys..."
echo ""

# Generate JWT Secret
JWT_SECRET=$(openssl rand -base64 32 | tr -d '\n')

# Generate ANON key (for public/anonymous access)
# Payload: {"role":"anon","iss":"supabase","iat":1609459200,"exp":1893456000}
ANON_PAYLOAD=$(echo -n '{"role":"anon","iss":"supabase","iat":1609459200,"exp":1893456000}' | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
ANON_HEADER=$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
ANON_SIGNATURE=$(echo -n "${ANON_HEADER}.${ANON_PAYLOAD}" | openssl dgst -sha256 -hmac "${JWT_SECRET}" -binary | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
ANON_KEY="${ANON_HEADER}.${ANON_PAYLOAD}.${ANON_SIGNATURE}"

# Generate SERVICE_ROLE key (for admin/backend access)
# Payload: {"role":"service_role","iss":"supabase","iat":1609459200,"exp":1893456000}
SERVICE_PAYLOAD=$(echo -n '{"role":"service_role","iss":"supabase","iat":1609459200,"exp":1893456000}' | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
SERVICE_HEADER=$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
SERVICE_SIGNATURE=$(echo -n "${SERVICE_HEADER}.${SERVICE_PAYLOAD}" | openssl dgst -sha256 -hmac "${JWT_SECRET}" -binary | base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n')
SERVICE_ROLE_KEY="${SERVICE_HEADER}.${SERVICE_PAYLOAD}.${SERVICE_SIGNATURE}"

# Generate Postgres password
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '\n')

echo "======================================"
echo "Generated Keys (save these securely!)"
echo "======================================"
echo ""
echo "JWT_SECRET=${JWT_SECRET}"
echo ""
echo "ANON_KEY=${ANON_KEY}"
echo ""
echo "SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}"
echo ""
echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}"
echo ""
echo "======================================"
echo ""
echo "📝 Add these to your .env file"
echo ""

# Optionally update .env file
read -p "Update .env file automatically? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ENV_FILE="../.env"
    if [ -f "$ENV_FILE" ]; then
        # Backup existing .env
        cp "$ENV_FILE" "${ENV_FILE}.backup"

        # Update values
        sed -i '' "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "$ENV_FILE" 2>/dev/null || \
        sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "$ENV_FILE"

        sed -i '' "s|^ANON_KEY=.*|ANON_KEY=${ANON_KEY}|" "$ENV_FILE" 2>/dev/null || \
        sed -i "s|^ANON_KEY=.*|ANON_KEY=${ANON_KEY}|" "$ENV_FILE"

        sed -i '' "s|^SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}|" "$ENV_FILE" 2>/dev/null || \
        sed -i "s|^SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}|" "$ENV_FILE"

        sed -i '' "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" "$ENV_FILE" 2>/dev/null || \
        sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${POSTGRES_PASSWORD}|" "$ENV_FILE"

        echo "✅ .env file updated! (backup saved as .env.backup)"
    else
        echo "⚠️  .env file not found. Please copy .env.example first."
    fi
fi

echo ""
echo "🚀 Done! You can now run: docker-compose up -d"
