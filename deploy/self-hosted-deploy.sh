#!/usr/bin/env bash
# Deploy Taozhiyy from a GitHub self-hosted runner running on the UCloud host.
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-/var/www/taozhiyy}"
TMP_DIR="${TMP_DIR:-/tmp/taozhiyy-deploy}"
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/taozhiyy-deploy-backups}"

run_sudo() {
  if [ -n "${SUDO_PASSWORD:-}" ]; then
    printf '%s\n' "$SUDO_PASSWORD" | sudo -S -p '' "$@"
  else
    sudo "$@"
  fi
}

require_file() {
  local path="${1:?path required}"
  if [ ! -f "$path" ]; then
    echo "required file not found: $path" >&2
    exit 1
  fi
}

require_dir() {
  local path="${1:?path required}"
  if [ ! -d "$path" ]; then
    echo "required directory not found: $path" >&2
    exit 1
  fi
}

write_env_fragment() {
  local frag="${1:?fragment path required}"

  : >"$frag"
  chmod 600 "$frag"

  TENCENT_COS_SECRET_ID="${TENCENT_COS_SECRET_ID:-${LEGACY_COS_SECRET_ID:-}}"
  TENCENT_COS_SECRET_KEY="${TENCENT_COS_SECRET_KEY:-${LEGACY_COS_SECRET_KEY:-}}"
  TENCENT_COS_BUCKET="${TENCENT_COS_BUCKET:-${LEGACY_COS_BUCKET:-}}"
  TENCENT_COS_REGION="${TENCENT_COS_REGION:-${LEGACY_COS_REGION:-}}"

  local keys=(
    AUTH_OWNER_PASSWORD
    AUTH_OWNER_SECURITY_ANSWER
    AGNES_API_KEY
    AGNES_BASE_URL
    AGNES_IMAGE_MODEL
    DASHSCOPE_API_KEY
    DASHSCOPE_BASE_URL
    AI_IMAGE_MODEL
    PEXELS_API_KEY
    PIXABAY_API_KEY
    TENCENT_COS_SECRET_ID
    TENCENT_COS_SECRET_KEY
    TENCENT_COS_BUCKET
    TENCENT_COS_REGION
    TENCENT_COS_BASE_URL
    OWNER_PUBLISH_GITHUB_TOKEN
    OWNER_PUBLISH_GITHUB_OWNER
    OWNER_PUBLISH_GITHUB_REPO
    OWNER_PUBLISH_GITHUB_BRANCH
    SMTP_HOST
    SMTP_PORT
    SMTP_USER
    SMTP_PASS
    SMTP_FROM_NAME
    MAIL_NOTIFY_TO
    SYNC_TRIGGER_TOKEN
  )

  local key value
  for key in "${keys[@]}"; do
    value="${!key:-}"
    if [ -n "$value" ]; then
      printf '%s=%s\n' "$key" "$value" >>"$frag"
    fi
  done
}

backup_current_release() {
  if [ ! -d "$ROOT_DIR" ]; then
    echo "No existing release at $ROOT_DIR; skipping backup"
    return 0
  fi

  local stamp
  stamp="$(date +%Y%m%d-%H%M%S)"
  run_sudo mkdir -p "$BACKUP_DIR"
  run_sudo tar -C "$(dirname "$ROOT_DIR")" -czf "$BACKUP_DIR/taozhiyy-www-$stamp-before-self-hosted-deploy.tar.gz" "$(basename "$ROOT_DIR")"
}

switch_release_dirs() {
  run_sudo mkdir -p "$ROOT_DIR" "$ROOT_DIR/blog" "$ROOT_DIR/build" "$ROOT_DIR/ai-assistant"
  run_sudo rsync -a --delete "$TMP_DIR/main/" "$ROOT_DIR/"
  run_sudo rsync -a --delete "$TMP_DIR/blog/" "$ROOT_DIR/blog/"
  run_sudo rsync -a --delete "$TMP_DIR/build/" "$ROOT_DIR/build/"
  run_sudo rsync -a "$TMP_DIR/ai-assistant/" "$ROOT_DIR/ai-assistant/"
  run_sudo nginx -t
  run_sudo systemctl reload-or-restart nginx
}

main() {
  require_file acg-api/acg-api
  require_file deploy/acg-api.service
  require_file deploy/remote-install-acg-api.sh
  require_file deploy/sync-auth-env.sh
  require_dir main/dist
  require_dir blog/public
  require_dir build/dist
  require_dir shared/ai-assistant

  rm -rf "$TMP_DIR"
  mkdir -p "$TMP_DIR/main" "$TMP_DIR/blog" "$TMP_DIR/build" "$TMP_DIR/acg-api" "$TMP_DIR/ai-assistant"
  rsync -a --delete main/dist/ "$TMP_DIR/main/"
  rsync -a --delete blog/public/ "$TMP_DIR/blog/"
  rsync -a --delete build/dist/ "$TMP_DIR/build/"
  rsync -a shared/ai-assistant/ "$TMP_DIR/ai-assistant/"
  cp acg-api/acg-api deploy/remote-install-acg-api.sh deploy/acg-api.service "$TMP_DIR/acg-api/"

  chmod +x "$TMP_DIR/acg-api/remote-install-acg-api.sh" deploy/sync-auth-env.sh
  sed -i 's/\r$//' "$TMP_DIR/acg-api/remote-install-acg-api.sh" "$TMP_DIR/acg-api/acg-api.service" deploy/sync-auth-env.sh

  bash "$TMP_DIR/acg-api/remote-install-acg-api.sh" \
    "$TMP_DIR/acg-api/acg-api" \
    "$TMP_DIR/acg-api/acg-api.service"

  local frag
  frag="$(mktemp)"
  trap 'rm -f "$frag"; rm -rf "$TMP_DIR"' EXIT
  write_env_fragment "$frag"
  bash deploy/sync-auth-env.sh "$frag"

  backup_current_release
  switch_release_dirs
}

main "$@"
