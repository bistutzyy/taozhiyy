#!/usr/bin/env bash
# Pull, build, and deploy Taozhiyy from the UCloud host itself.
set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/taozhiyy-source}"
BRANCH="${BRANCH:-master}"
DEPLOY_USER="${DEPLOY_USER:-taozhiyy-deploy}"
DEPLOY_HOME="${DEPLOY_HOME:-/var/lib/taozhiyy-deploy}"
ROOT_DIR="${ROOT_DIR:-/var/www/taozhiyy}"
TMP_DIR="${TMP_DIR:-/tmp/taozhiyy-pull-deploy}"
BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/taozhiyy-deploy-backups}"
STATE_DIR="${STATE_DIR:-/var/lib/taozhiyy-pull-deploy}"
LOCK_FILE="${LOCK_FILE:-/tmp/taozhiyy-pull-deploy.lock}"
VITE_API_BASE="${VITE_API_BASE:-https://taozhiyy.top}"
FORCE_DEPLOY="${FORCE_DEPLOY:-}"

run_sudo() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif [ -n "${SUDO_PASSWORD:-}" ]; then
    printf '%s\n' "$SUDO_PASSWORD" | sudo -S -p '' "$@"
  else
    sudo "$@"
  fi
}

run_as_deploy_user() {
  if [ "$(id -un)" = "$DEPLOY_USER" ]; then
    "$@"
  else
    run_sudo runuser -u "$DEPLOY_USER" -- env HOME="$DEPLOY_HOME" PATH="$PATH" "$@"
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

log_service_diagnostics() {
  local service="${1:?service required}"

  echo "=== $service status ===" >&2
  run_sudo systemctl --no-pager --full status "$service" >&2 || true
  echo "=== $service journal ===" >&2
  run_sudo journalctl -u "$service" -n 80 --no-pager >&2 || true
}

log_nginx_diagnostics() {
  echo "=== nginx status ===" >&2
  run_sudo systemctl --no-pager --full status nginx >&2 || true
  echo "=== nginx journal ===" >&2
  run_sudo journalctl -u nginx -n 200 --no-pager >&2 || true
  echo "=== nginx processes ===" >&2
  ps aux | grep '[n]ginx' >&2 || true
  echo "=== listening ports ===" >&2
  run_sudo sh -c 'if command -v ss >/dev/null 2>&1; then ss -tlnp; else netstat -tlnp; fi' | grep -E ':(80|443|8787)[[:space:]]' >&2 || true
}

wait_for_service_active() {
  local service="${1:?service required}"
  local attempts="${2:-30}"
  local delay="${3:-1}"
  local state=""
  local i

  for i in $(seq 1 "$attempts"); do
    state="$(run_sudo systemctl is-active "$service" || true)"
    if [ "$state" = "active" ]; then
      echo "$service is active"
      return 0
    fi
    if [ "$state" = "failed" ]; then
      log_service_diagnostics "$service"
      return 1
    fi
    sleep "$delay"
  done

  log_service_diagnostics "$service"
  return 1
}

wait_for_http_ready() {
  local url="${1:?url required}"
  local attempts="${2:-30}"
  local delay="${3:-1}"
  local i

  for i in $(seq 1 "$attempts"); do
    if curl -fsS --max-time 2 "$url" >/dev/null; then
      echo "$url is ready"
      return 0
    fi
    sleep "$delay"
  done

  log_service_diagnostics acg-api
  return 1
}

ensure_env_file_permissions() {
  run_sudo mkdir -p /opt/acg-api
  run_sudo touch /opt/acg-api/.env
  run_sudo chown root:root /opt/acg-api/.env
  run_sudo chmod 600 /opt/acg-api/.env
}

ensure_repo_ownership() {
  run_sudo mkdir -p "$DEPLOY_HOME" "$REPO_DIR"
  run_sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME" "$REPO_DIR"
}

backup_current_release() {
  if [ ! -d "$ROOT_DIR" ]; then
    echo "No existing release at $ROOT_DIR; skipping backup"
    return 0
  fi

  local stamp
  stamp="$(date +%Y%m%d-%H%M%S)"
  run_sudo mkdir -p "$BACKUP_DIR"
  run_sudo tar -C "$(dirname "$ROOT_DIR")" -czf "$BACKUP_DIR/taozhiyy-www-$stamp-before-pull-deploy.tar.gz" "$(basename "$ROOT_DIR")"
}

install_backend() {
  local unit_tmp
  unit_tmp="$(mktemp)"
  cat >"$unit_tmp" <<'UNIT'
[Unit]
Description=Taozhiyy API (acg-api + blog AI chat)
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/acg-api
Environment=ACG_API_ADDR=127.0.0.1:8787
Environment=ACG_DATA_DIR=/var/lib/acg-api
ExecStart=/opt/acg-api/acg-api
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

  echo "keeping existing server env file at /opt/acg-api/.env"
  ensure_env_file_permissions
  run_sudo mkdir -p /opt/acg-api /var/lib/acg-api
  run_sudo install -m 0755 "$TMP_DIR/acg-api/acg-api" /opt/acg-api/acg-api
  run_sudo install -m 0644 "$unit_tmp" /etc/systemd/system/acg-api.service
  rm -f "$unit_tmp"

  run_sudo systemctl daemon-reload
  run_sudo systemctl enable acg-api
  if ! run_sudo systemctl restart acg-api; then
    log_service_diagnostics acg-api
    exit 1
  fi
  wait_for_service_active acg-api 30 1
  wait_for_http_ready http://127.0.0.1:8787/api/v1/health 30 1
}

switch_release_dirs() {
  run_sudo mkdir -p "$ROOT_DIR" "$ROOT_DIR/blog" "$ROOT_DIR/build" "$ROOT_DIR/ai-assistant"
  run_sudo rsync -a --delete "$TMP_DIR/main/" "$ROOT_DIR/"
  run_sudo rsync -a --delete "$TMP_DIR/blog/" "$ROOT_DIR/blog/"
  run_sudo rsync -a --delete "$TMP_DIR/build/" "$ROOT_DIR/build/"
  run_sudo rsync -a "$TMP_DIR/ai-assistant/" "$ROOT_DIR/ai-assistant/"
  run_sudo nginx -t
  if ! run_sudo systemctl reload-or-restart nginx; then
    echo "ERROR: nginx reload-or-restart failed" >&2
    log_nginx_diagnostics
    exit 1
  fi
}

post_deploy_checks() {
  curl -sf --max-time 20 http://127.0.0.1:8787/api/v1/health | grep -q '"status":"ok"'
  curl -sf --max-time 20 https://taozhiyy.top/api/v1/wallpapers/draw | grep -q '"item"'
  curl -sf --max-time 20 'https://taozhiyy.top/api/v1/wallpapers/draw?source=api' | grep -q '"apiOnly":true'
  curl -sf --max-time 20 https://taozhiyy.top/api/chat | grep -q '"remaining"'
  curl -fL --max-time 20 https://taozhiyy.top/ >/dev/null
  curl -fL --max-time 20 https://taozhiyy.top/blog/ >/dev/null
  curl -fL --max-time 20 https://taozhiyy.top/build/ >/dev/null
  curl -fL --max-time 20 https://taozhiyy.top/gallery >/dev/null
  curl -fL --max-time 20 https://taozhiyy.top/gallery/misaka >/dev/null
  curl -fL --max-time 20 https://taozhiyy.top/bili >/dev/null
}

build_project() {
  local build_script
  build_script="$(mktemp)"
  cat >"$build_script" <<'BUILD'
set -euo pipefail

cd "$REPO_DIR/acg-api"
go mod download
go mod verify
go test ./...
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o acg-api .

cd "$REPO_DIR/main"
npm ci
VITE_API_BASE="$VITE_API_BASE" npm run build

cd "$REPO_DIR/blog"
npm ci
npm run clean
npm run build

cd "$REPO_DIR/build"
npm ci
npm run build
BUILD
  chmod 0755 "$build_script"
  run_as_deploy_user env REPO_DIR="$REPO_DIR" VITE_API_BASE="$VITE_API_BASE" bash "$build_script"
  rm -f "$build_script"
}

stage_release() {
  rm -rf "$TMP_DIR"
  mkdir -p "$TMP_DIR/main" "$TMP_DIR/blog" "$TMP_DIR/build" "$TMP_DIR/acg-api" "$TMP_DIR/ai-assistant"
  rsync -a --delete "$REPO_DIR/main/dist/" "$TMP_DIR/main/"
  rsync -a --delete "$REPO_DIR/blog/public/" "$TMP_DIR/blog/"
  rsync -a --delete "$REPO_DIR/build/dist/" "$TMP_DIR/build/"
  rsync -a "$REPO_DIR/shared/ai-assistant/" "$TMP_DIR/ai-assistant/"
  cp "$REPO_DIR/acg-api/acg-api" "$TMP_DIR/acg-api/"
}

main() {
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    echo "Another pull deploy is already running"
    exit 0
  fi

  require_dir "$REPO_DIR/.git"
  ensure_env_file_permissions
  ensure_repo_ownership

  run_as_deploy_user git -C "$REPO_DIR" fetch --prune origin "$BRANCH"

  local remote_ref remote_sha last_sha last_file
  remote_ref="origin/$BRANCH"
  remote_sha="$(run_as_deploy_user git -C "$REPO_DIR" rev-parse "$remote_ref")"
  last_file="$STATE_DIR/last-deployed-sha"
  last_sha=""
  if [ -f "$last_file" ]; then
    last_sha="$(cat "$last_file")"
  fi

  if [ "$last_sha" = "$remote_sha" ] && [ -z "$FORCE_DEPLOY" ]; then
    echo "No new deployment needed for $remote_sha"
    exit 0
  fi

  # Build steps (content:build) rewrite tracked artifacts such as
  # build/src/data/content.json, which leaves the work tree dirty. Reset
  # first so branch switching never aborts on local changes.
  run_as_deploy_user git -C "$REPO_DIR" reset --hard "$remote_ref"
  run_as_deploy_user git -C "$REPO_DIR" checkout -B "$BRANCH" "$remote_ref"
  run_as_deploy_user git -C "$REPO_DIR" reset --hard "$remote_ref"
  run_as_deploy_user git -C "$REPO_DIR" clean -fdx

  require_file "$REPO_DIR/acg-api/go.mod"
  require_dir "$REPO_DIR/main"
  require_dir "$REPO_DIR/blog"
  require_dir "$REPO_DIR/build"
  require_dir "$REPO_DIR/shared/ai-assistant"

  trap 'rm -rf "$TMP_DIR"' EXIT

  build_project
  stage_release
  install_backend
  backup_current_release
  switch_release_dirs
  post_deploy_checks

  run_sudo mkdir -p "$STATE_DIR"
  printf '%s\n' "$remote_sha" | run_sudo tee "$last_file" >/dev/null
  echo "Deployed $remote_sha"
}

main "$@"
