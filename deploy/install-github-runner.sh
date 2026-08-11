#!/usr/bin/env bash
# Install the Taozhiyy GitHub Actions self-hosted runner on Ubuntu.
set -euo pipefail

RUNNER_VERSION="${RUNNER_VERSION:-2.328.0}"
RUNNER_ROOT="${RUNNER_ROOT:-/opt/actions-runner/taozhiyy}"
RUNNER_USER="${RUNNER_USER:-ubuntu}"
RUNNER_NAME="${RUNNER_NAME:-taozhiyy-ucloud}"
RUNNER_LABELS="${RUNNER_LABELS:-taozhiyy,linux}"
REPO_URL="${REPO_URL:-https://github.com/bistutzyy/taozhiyy}"
RUNNER_TOKEN="${RUNNER_TOKEN:?set RUNNER_TOKEN from GitHub repo Settings > Actions > Runners}"

if [ "$(id -u)" -ne 0 ]; then
  echo "run this installer with sudo/root" >&2
  exit 1
fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y curl tar sudo git rsync

if ! id "$RUNNER_USER" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "$RUNNER_USER"
fi

mkdir -p "$RUNNER_ROOT"
chown "$RUNNER_USER:$RUNNER_USER" "$RUNNER_ROOT"

archive="/tmp/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
curl -fsSL "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" -o "$archive"

sudo -u "$RUNNER_USER" tar -xzf "$archive" -C "$RUNNER_ROOT"
rm -f "$archive"

sudo -u "$RUNNER_USER" "$RUNNER_ROOT/config.sh" \
  --url "$REPO_URL" \
  --token "$RUNNER_TOKEN" \
  --name "$RUNNER_NAME" \
  --labels "$RUNNER_LABELS" \
  --unattended \
  --replace

"$RUNNER_ROOT/svc.sh" install "$RUNNER_USER"
"$RUNNER_ROOT/svc.sh" start
"$RUNNER_ROOT/svc.sh" status
