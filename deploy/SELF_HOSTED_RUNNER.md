# Taozhiyy self-hosted deployment

This deployment mode removes the public SSH hop from GitHub-hosted runners. GitHub only sends jobs to a runner that is already running on the UCloud host over outbound HTTPS.

## One-time runner setup

1. In GitHub, open `bistutzyy/taozhiyy` > Settings > Actions > Runners > New self-hosted runner.
2. Copy the temporary registration token.
3. On the UCloud host console or your private SSH session, run:

```bash
cd /tmp
curl -fsSL https://raw.githubusercontent.com/bistutzyy/taozhiyy/master/deploy/install-github-runner.sh -o install-github-runner.sh
sudo RUNNER_TOKEN='PASTE_TOKEN_HERE' bash install-github-runner.sh
```

The runner registers with labels `self-hosted`, `taozhiyy`, and `linux`, matching `.github/workflows/deploy.yml`.
By default the runner service runs as the existing `ubuntu` user so the current `UCLOUD_SUDO_PASSWORD` secret can still authorize deployment tasks. If you later move to passwordless limited sudo, set `RUNNER_USER` before running the installer.

## Deployment flow

1. Push to `master` or run `workflow_dispatch`.
2. GitHub schedules the deploy job on the UCloud runner.
3. The runner checks out the repo, builds `acg-api`, `main`, `blog`, and `build` locally.
4. `deploy/self-hosted-deploy.sh` installs `acg-api`, syncs `/opt/acg-api/.env`, backs up `/var/www/taozhiyy`, switches production directories, reloads Nginx, and runs health checks.

## Firewall stance

After the runner is online, GitHub Actions no longer needs inbound SSH access. Keep SSH restricted to your own management IP or UCloud console access. The server only needs outbound HTTPS to GitHub and package registries.

## Secrets still used

The workflow still reads the existing GitHub secrets for service configuration, including `UCLOUD_SUDO_PASSWORD`, owner auth, GitHub publish token, COS, SMTP, and sync trigger values. `UCLOUD_HOST`, `UCLOUD_PORT`, `UCLOUD_USER`, and `UCLOUD_SSH_KEY` are no longer used by deployment.

## Recovery

Each deploy creates a tarball backup under `/home/ubuntu/taozhiyy-deploy-backups` before switching `/var/www/taozhiyy`. To roll back, extract the chosen backup over `/var/www/taozhiyy` and reload Nginx.
