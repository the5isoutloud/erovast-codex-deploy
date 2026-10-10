#!/usr/bin/env bash
# Dropbox Craig monitor cron wrapper.
# Credentials are loaded from the swiftquill-dev profile environment.
set -euo pipefail

REPO="/opt/data/workspace/erovast-codex-deploy"
VENV="/opt/data/workspace/erovast-automation/venv"
ENV_FILE="/opt/data/profiles/swiftquill-dev/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo '{"error": "swiftquill-dev environment file not found"}'
  exit 1
fi

# Profile .env files contain trusted shell-style KEY=VALUE assignments.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${DROPBOX_APP_KEY:?DROPBOX_APP_KEY is not set in the swiftquill-dev profile .env}"
: "${DROPBOX_APP_SECRET:?DROPBOX_APP_SECRET is not set in the swiftquill-dev profile .env}"
: "${DROPBOX_REFRESH_TOKEN:?DROPBOX_REFRESH_TOKEN is not set in the swiftquill-dev profile .env}"

if [ ! -x "$VENV/bin/python" ]; then
  echo '{"error": "Erovast automation virtual environment is missing"}'
  exit 1
fi

cd "$REPO"
exec "$VENV/bin/python" scripts/dropbox_monitor.py "$@"
