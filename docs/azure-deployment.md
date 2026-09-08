# Azure production deployment

## Instance

| Setting | Value |
| --- | --- |
| Website | https://chaoqun-oxford-f6e76fc8.japanwest.cloudapp.azure.com |
| Subscription | `f6e76fc8-e9fc-435f-982a-9007a547ea2d` |
| Resource group | `voice-agent-dev` |
| VM | `chaoqun-vm` |
| Region / zone | `japanwest` / `1` |
| Size | `Standard_D32as_v5` (32 vCPU, 128 GiB RAM) |
| OS / disk | Ubuntu 24.04 LTS, Trusted Launch, 1024 GiB `Premium_LRS` |
| Network | `chaoqun-oxford-vnet`, `chaoqun-oxford-nic`, `chaoqun-oxford-nsg` |
| Public IP resource | `chaoqun-oxford-ip` (Standard static IPv4) |

Read the deployed commit with `readlink /opt/oxford/current` through Azure Run
Command. Existing colleagues' resources are not part of this deployment.

The production build explicitly enables `OXFORD_SAME_ORIGIN_MEDIA=1`.
Without this flag the original NAS behavior is unchanged. The development
`OXFORD_MEDIA_DIR` setting also remains supported.

## Architecture and access

Caddy terminates HTTPS, renews certificates automatically, redirects HTTP to
HTTPS, and serves only `/opt/oxford/current/dist`. React uses hash routes, so
unknown asset paths correctly return 404 rather than HTML. The Node.js 22
service listens only on `127.0.0.1:3000` and exposes allowlisted catalog media
under `/__local-media`, with GET, HEAD, and byte ranges. Neither repository
source, `.git`, environment files, nor keys are web roots.

The website is intentionally accessible without a password. Learning progress
is local to each browser, not synchronized between colleagues. The 11 missing
PDFs remain genuine 404s; the reader retains audio/subtitles when available.
No new rights or licenses are granted; see the README attribution.

## Installation

Use Ubuntu 24.04 LTS. Provide a DNS hostname for the VM public IP and a full
commit SHA published to this repository. Execute `deploy/install.sh HOST SHA`
as root through Azure Run Command (not public SSH). The script installs Node 22,
Git LFS, and Caddy, downloads the pinned commit from the public repository,
hydrates LFS, verifies every available file's length and SHA-256 against
`Resource-Status.json`, builds as an unprivileged user, and starts systemd units.
Only releases that pass the build and targeted tests become `current`.

Run Command example after securely obtaining the pinned installer:

```sh
az vm run-command invoke --subscription SUBSCRIPTION --resource-group RESOURCE_GROUP \
  --name VM --command-id RunShellScript \
  --scripts "bash /var/lib/oxford-install.sh HOST FULL_COMMIT_SHA"
```

For lengthy initial installs, start the installer as a systemd oneshot with
`systemd-run --unit oxford-deploy --collect /bin/bash /var/lib/oxford-install.sh HOST SHA`.
Inspect `journalctl -u oxford-deploy` through Run Command. Do not mistake a
successful Run Command submission for a successful deployment.

The installer requires root to manage packages and services, but npm/build
scripts run as `oxford-build`, and the web media service runs as `oxford` with
read-only filesystem sandboxing. Deployment is serialized with `flock`.
Completed releases are immutable and retained for rollback. Each new release
downloads LFS files, which counts against GitHub LFS bandwidth allowances.

## Network boundary

Use a dedicated VNet, NIC, NSG, and Standard static public IPv4. Only TCP 80/443
are allowed from the Internet. Do not allow public SSH, RDP, port 3000, or Vite
5173. Preserve all enterprise-injected NRMS rules and priorities; website rules
must be lower priority than those controls. Manage through Azure Run Command.
If policy prohibits website ingress, stop rather than bypassing it with tunnels.

## Operations

- `systemctl status oxford-media caddy`: both services must be enabled and active.
- `journalctl -u oxford-media -u caddy`: server and certificate diagnostics.
- `OXFORD_MEDIA_DIR=/opt/oxford/current node /opt/oxford/current/scripts/verify-media.mjs`:
  expect 525 available, 11 missing, and 3,248,514,957 verified bytes.
- Certificates and ACME account state live in Caddy's protected
  `/var/lib/caddy/.local/share/caddy`; do not publish or copy them into Git.
- Update by running the installer with a new published SHA. To roll back, point
  `/opt/oxford/current` at a previously validated release and restart
  `oxford-media` (also restore matching Caddy/unit files if they changed).

The selected VM is continuously billed while running; its 1 TB Premium SSD
and Standard public IPv4 incur ongoing charges too. Azure Internet egress and
GitHub LFS downloads may add usage charges. Stopping the app does not stop VM
billing. Do not stop/deallocate the VM while colleagues need live access.
