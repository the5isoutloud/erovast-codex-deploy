#!/bin/sh
# Build the site, commit and push main, then publish two subtree branches:
#   do-deploy  ← site/public       (DigitalOcean serves this)
#   obsidian   ← the Obsidian vault
#
# Run from the project root:   docker compose run --rm publish "Commit message"
set -eu

VAULT_DIR="Erovast Vault"
SITE_BRANCH="do-deploy"
VAULT_BRANCH="obsidian"
MSG="${1:-Publish $(date '+%Y-%m-%d %H:%M')}"

: "${GITHUB_TOKEN:?GITHUB_TOKEN is not set. Add it to .env in the project root (see README).}"

# Git settings for this run only: trust the mounted repo, and log in to GitHub
# with the token instead of the host's credential helper (not available here).
export GIT_CONFIG_COUNT=3
export GIT_CONFIG_KEY_0=safe.directory     GIT_CONFIG_VALUE_0=/project
export GIT_CONFIG_KEY_1=credential.helper  GIT_CONFIG_VALUE_1=
export GIT_CONFIG_KEY_2=credential.helper  GIT_CONFIG_VALUE_2='!f() { echo username=x-access-token; echo "password=$GITHUB_TOKEN"; }; f'

cd /project

branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "main" ]; then
  echo "error: you are on '$branch'. Switch to main first (git checkout main)." >&2
  exit 1
fi

echo "==> Building the site"
(cd site && hugo --gc --minify --cleanDestinationDir)

echo "==> Committing main"
git add -A
if git diff --cached --quiet; then
  echo "    nothing to commit"
else
  git commit -m "$MSG"
fi

echo "==> Pushing main"
git push origin main

echo "==> Splitting site/public -> $SITE_BRANCH"
git subtree split --prefix site/public -b "$SITE_BRANCH"

echo "==> Splitting $VAULT_DIR -> $VAULT_BRANCH"
git subtree split --prefix "$VAULT_DIR" -b "$VAULT_BRANCH"

echo "==> Pushing $SITE_BRANCH and $VAULT_BRANCH"
if ! git push origin "$SITE_BRANCH" "$VAULT_BRANCH"; then
  cat >&2 <<MSG

error: GitHub rejected the branch push. This usually means a branch on GitHub
was changed some other way and no longer matches. Both branches are generated
from main, so it is normally safe to overwrite them:

  git push --force origin $SITE_BRANCH $VAULT_BRANCH
MSG
  exit 1
fi

echo "==> Done"
