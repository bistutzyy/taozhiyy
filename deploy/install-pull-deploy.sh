#!/usr/bin/env bash
# Install pull-based Taozhiyy deployment on the UCloud host.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/bistutzyy/taozhiyy.git}"
REPO_DIR="${REPO_DIR:-/opt/taozhiyy-source}"
BRANCH="${BRANCH:-master}"
DEPLOY_USER="${DEPLOY_USER:-taozhiyy-deploy}"
DEPLOY_SCRIPT="${DEPLOY_SCRIPT:-/usr/local/sbin/taozhiyy-pull-deploy.sh}"
DEPLOY_HOME="${DEPLOY_HOME:-/var/lib/taozhiyy-deploy}"
GO_VERSION="${GO_VERSION:-1.22.12}"

if [ "$(id -u)" -ne 0 ]; then
  echo "run this installer with sudo/root" >&2
  exit 1
fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl git rsync tar xz-utils python3 build-essential util-linux

if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  useradd --system --create-home --home-dir "$DEPLOY_HOME" --shell /usr/sbin/nologin "$DEPLOY_USER"
fi
mkdir -p "$DEPLOY_HOME" /opt/acg-api
chown "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME"
touch /opt/acg-api/.env
chown root:root /opt/acg-api/.env
chmod 600 /opt/acg-api/.env

install_node20() {
  if command -v node >/dev/null 2>&1 && node --version | grep -Eq '^v20\.'; then
    return 0
  fi
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
}

install_go122() {
  if command -v go >/dev/null 2>&1 && go version | grep -Eq 'go1\.22\.'; then
    return 0
  fi
  local archive="/tmp/go${GO_VERSION}.linux-amd64.tar.gz"
  curl -fsSL "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz" -o "$archive"
  rm -rf /usr/local/go
  tar -C /usr/local -xzf "$archive"
  ln -sf /usr/local/go/bin/go /usr/local/bin/go
  rm -f "$archive"
}

install_node20
install_go122

if [ ! -d "$REPO_DIR/.git" ]; then
  mkdir -p "$(dirname "$REPO_DIR")"
  git clone --branch "$BRANCH" "$REPO_URL" "$REPO_DIR"
fi
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$REPO_DIR"

runuser -u "$DEPLOY_USER" -- git -C "$REPO_DIR" fetch --prune origin "$BRANCH"
# Generated build artifacts dirty the work tree; reset before switching branches.
runuser -u "$DEPLOY_USER" -- git -C "$REPO_DIR" reset --hard "origin/$BRANCH"
runuser -u "$DEPLOY_USER" -- git -C "$REPO_DIR" checkout -B "$BRANCH" "origin/$BRANCH"

install -m 0755 "$REPO_DIR/deploy/pull-deploy.sh" "$DEPLOY_SCRIPT"
install -m 0644 "$REPO_DIR/deploy/taozhiyy-pull-deploy.service" /etc/systemd/system/taozhiyy-pull-deploy.service
install -m 0644 "$REPO_DIR/deploy/taozhiyy-pull-deploy.timer" /etc/systemd/system/taozhiyy-pull-deploy.timer

systemctl daemon-reload
systemctl enable --now taozhiyy-pull-deploy.timer
systemctl start taozhiyy-pull-deploy.service
systemctl status taozhiyy-pull-deploy.timer --no-pager
