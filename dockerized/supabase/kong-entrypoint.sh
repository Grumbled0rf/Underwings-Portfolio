#!/bin/sh
# Replace env var placeholders in Kong config template
sed \
  -e "s/\${ANON_KEY}/$ANON_KEY/g" \
  -e "s/\${SERVICE_ROLE_KEY}/$SERVICE_ROLE_KEY/g" \
  /var/lib/kong/kong.yml.template > /tmp/kong.yml

exec /docker-entrypoint.sh kong docker-start
