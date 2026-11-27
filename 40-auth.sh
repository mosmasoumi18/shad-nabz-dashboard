#!/bin/sh
set -eu

: "${DASHBOARD_USER:?DASHBOARD_USER must be configured in Railway variables}"
: "${DASHBOARD_PASSWORD:?DASHBOARD_PASSWORD must be configured in Railway variables}"

if [ "${#DASHBOARD_PASSWORD}" -lt 16 ]; then
  echo "DASHBOARD_PASSWORD must contain at least 16 characters." >&2
  exit 1
fi

htpasswd -Bbc /etc/nginx/.htpasswd "$DASHBOARD_USER" "$DASHBOARD_PASSWORD" >/dev/null
chmod 0600 /etc/nginx/.htpasswd
