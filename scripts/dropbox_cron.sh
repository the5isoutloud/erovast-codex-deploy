#!/usr/bin/env bash
# Dropbox Craig monitor cron wrapper — sets env and runs the monitor.
# Output is JSON consumed by the scribe agent.
set -euo pipefail

REPO="/opt/data/profiles/erovast-scribe/erovast-codex-deploy"
VENV="/opt/data/profiles/erovast-scribe/venv"
TOKEN_FILE="/opt/data/profiles/erovast-scribe/cache/scratch/dropbox_refresh_token.txt"

if [ ! -f "$TOKEN_FILE" ]; then
  echo '{"error": "Dropbox refresh token file not found"}'
  exit 1
fi

export DROPBOX_APP_KEY="wjmn0lpjrm7k9w4"
export DROPBOX_APP_SECRET="p9quc4t3hzqga9n"
export DROPBOX_REFRESH_TOKEN="$(cat "$TOKEN_FILE")"

cd "$REPO"
source "$VENV/bin/activate"
exec python3 scripts/dropbox_monitor.py
