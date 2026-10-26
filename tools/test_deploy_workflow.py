from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW_PATH = ROOT / ".github" / "workflows" / "deploy.yml"
PULL_DEPLOY_PATH = ROOT / "deploy" / "pull-deploy.sh"
INSTALL_PULL_DEPLOY_PATH = ROOT / "deploy" / "install-pull-deploy.sh"
PULL_SERVICE_PATH = ROOT / "deploy" / "taozhiyy-pull-deploy.service"
PULL_TIMER_PATH = ROOT / "deploy" / "taozhiyy-pull-deploy.timer"
PULL_DOC_PATH = ROOT / "deploy" / "PULL_BASED_DEPLOY.md"


class DeployWorkflowTests(unittest.TestCase):
    def test_workflow_is_public_repo_safe_ci_only(self):
        text = WORKFLOW_PATH.read_text(encoding="utf-8")

        self.assertIn("name: Validate Taozhiyy", text)
        self.assertIn("runs-on: ubuntu-latest", text)
        self.assertIn("pull_request:", text)
        self.assertNotIn("self-hosted", text)
        self.assertNotIn("Deploy on UCloud host", text)
        self.assertNotIn("deploy/self-hosted-deploy.sh", text)

    def test_workflow_does_not_use_server_access_or_production_secrets(self):
        text = WORKFLOW_PATH.read_text(encoding="utf-8")

        forbidden = [
            "UCLOUD_HOST",
            "UCLOUD_PORT",
            "UCLOUD_USER",
            "UCLOUD_SSH_KEY",
            "UCLOUD_SUDO_PASSWORD",
            "AUTH_OWNER_PASSWORD",
            "AUTH_OWNER_SECURITY_ANSWER",
            "AGNES_API_KEY",
            "DASHSCOPE_API_KEY",
            "TENCENT_COS_SECRET",
            "OWNER_PUBLISH_GITHUB_TOKEN",
            "SMTP_PASS",
            "SYNC_TRIGGER_TOKEN",
            "ssh-keyscan",
            "scp ",
            "ssh -p",
        ]
        for value in forbidden:
            self.assertNotIn(value, text)

    def test_workflow_still_builds_all_projects(self):
        text = WORKFLOW_PATH.read_text(encoding="utf-8")

        self.assertIn("go test ./...", text)
        self.assertIn("CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o acg-api .", text)
        self.assertIn("cd main", text)
        self.assertIn("npm run build", text)
        self.assertIn("cd blog", text)
        self.assertIn("npm run clean", text)
        self.assertIn("cd build", text)

    def test_pull_deploy_assets_exist(self):
        for path in (
            PULL_DEPLOY_PATH,
            INSTALL_PULL_DEPLOY_PATH,
            PULL_SERVICE_PATH,
            PULL_TIMER_PATH,
            PULL_DOC_PATH,
        ):
            self.assertTrue(path.exists(), f"missing {path.relative_to(ROOT)}")

    def test_pull_deploy_script_is_server_local_and_preserves_secrets(self):
        text = PULL_DEPLOY_PATH.read_text(encoding="utf-8")

        self.assertIn('REPO_DIR="${REPO_DIR:-/opt/taozhiyy-source}"', text)
        self.assertIn('BRANCH="${BRANCH:-master}"', text)
        self.assertIn('DEPLOY_USER="${DEPLOY_USER:-taozhiyy-deploy}"', text)
        self.assertIn("run_as_deploy_user()", text)
        self.assertIn('run_as_deploy_user git -C "$REPO_DIR" fetch --prune origin "$BRANCH"', text)
        self.assertIn('run_as_deploy_user git -C "$REPO_DIR" checkout -B "$BRANCH" "$remote_ref"', text)
        self.assertIn('run_sudo chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_HOME" "$REPO_DIR"', text)
        self.assertIn('run_as_deploy_user env REPO_DIR="$REPO_DIR" VITE_API_BASE="$VITE_API_BASE" bash "$build_script"', text)
        self.assertIn("ensure_env_file_permissions", text)
        self.assertIn("keeping existing server env file", text)
        self.assertNotIn("remote-install-acg-api.sh", text)
        self.assertNotIn("sync-auth-env.sh", text)
        self.assertNotIn("SYNC_TRIGGER_TOKEN", text)
        self.assertNotIn("read_env_value", text)
        self.assertNotIn("secrets.", text)

    def test_pull_deploy_resets_dirty_tree_before_switching_branch(self):
        text = PULL_DEPLOY_PATH.read_text(encoding="utf-8")
        reset_at = text.find('run_as_deploy_user git -C "$REPO_DIR" reset --hard "$remote_ref"')
        checkout_at = text.find('run_as_deploy_user git -C "$REPO_DIR" checkout -B "$BRANCH" "$remote_ref"')

        self.assertNotEqual(reset_at, -1, "pull deploy must reset the work tree")
        self.assertNotEqual(checkout_at, -1, "pull deploy must switch branch")
        self.assertLess(
            reset_at,
            checkout_at,
            "reset --hard must run before checkout so generated artifacts cannot block the pull",
        )

    def test_pull_deploy_installer_resets_dirty_tree_before_switching_branch(self):
        installer = INSTALL_PULL_DEPLOY_PATH.read_text(encoding="utf-8")
        reset_at = installer.find('reset --hard "origin/$BRANCH"')
        checkout_at = installer.find('checkout -B "$BRANCH" "origin/$BRANCH"')

        self.assertNotEqual(reset_at, -1, "installer must reset the work tree")
        self.assertNotEqual(checkout_at, -1, "installer must switch branch")
        self.assertLess(
            reset_at,
            checkout_at,
            "installer must reset --hard before checkout so a dirty tree cannot block installation",
        )

    def test_pull_deploy_installer_installs_systemd_timer(self):
        installer = INSTALL_PULL_DEPLOY_PATH.read_text(encoding="utf-8")
        service = PULL_SERVICE_PATH.read_text(encoding="utf-8")
        timer = PULL_TIMER_PATH.read_text(encoding="utf-8")

        self.assertIn('DEPLOY_USER="${DEPLOY_USER:-taozhiyy-deploy}"', installer)
        self.assertIn('useradd --system --create-home --home-dir "$DEPLOY_HOME" --shell /usr/sbin/nologin "$DEPLOY_USER"', installer)
        self.assertIn("git clone --branch", installer)
        self.assertIn('chown -R "$DEPLOY_USER:$DEPLOY_USER" "$REPO_DIR"', installer)
        self.assertIn("chown root:root /opt/acg-api/.env", installer)
        self.assertIn("chmod 600 /opt/acg-api/.env", installer)
        self.assertIn("install -m 0755", installer)
        self.assertIn("/usr/local/sbin/taozhiyy-pull-deploy.sh", installer)
        self.assertIn("systemctl enable --now taozhiyy-pull-deploy.timer", installer)
        self.assertIn("systemctl start taozhiyy-pull-deploy.service", installer)
        self.assertIn("ExecStart=/usr/local/sbin/taozhiyy-pull-deploy.sh", service)
        self.assertIn("OnBootSec=2min", timer)
        self.assertIn("OnUnitActiveSec=5min", timer)

    def test_self_hosted_runner_files_are_removed(self):
        removed = [
            ROOT / "deploy" / "self-hosted-deploy.sh",
            ROOT / "deploy" / "install-github-runner.sh",
            ROOT / "deploy" / "SELF_HOSTED_RUNNER.md",
        ]
        for path in removed:
            self.assertFalse(path.exists(), f"remove obsolete {path.relative_to(ROOT)}")


if __name__ == "__main__":
    unittest.main()
