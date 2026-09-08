#!/usr/bin/env bash
set -euo pipefail

# Run as root through Azure Run Command, never through public SSH.
HOST=${1:?Usage: install.sh hostname full-commit-sha}
COMMIT=${2:?A full commit SHA is required}
[[ "$HOST" =~ ^[a-z0-9-]+\.japanwest\.cloudapp\.azure\.com$ ]] || { echo "Invalid hostname" >&2; exit 1; }
[[ "$COMMIT" =~ ^[a-f0-9]{40}$ ]] || { echo "Invalid commit SHA" >&2; exit 1; }
[[ $(id -u) == 0 ]] || { echo "Run as root" >&2; exit 1; }
exec 9>/var/lock/oxford-deploy.lock
flock -n 9 || { echo "A deployment is already running" >&2; exit 1; }
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg git git-lfs caddy
if ! command -v node >/dev/null || [[ $(node -p 'process.versions.node.split(".")[0]') != 22 ]]; then
  install -d -m 0755 /etc/apt/keyrings
  curl --fail --silent --show-error https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key |
    gpg --batch --yes --dearmor -o /etc/apt/keyrings/nodesource.gpg
  printf '%s\n' 'deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main' > /etc/apt/sources.list.d/nodesource.list
  apt-get update -qq
  apt-get install -y -qq nodejs
fi
id oxford >/dev/null 2>&1 || useradd --system --home-dir /nonexistent --shell /usr/sbin/nologin oxford
id oxford-build >/dev/null 2>&1 || useradd --system --create-home --home-dir /var/lib/oxford-build --shell /usr/sbin/nologin oxford-build
install -d -m 0755 /opt/oxford/releases
RELEASE="/opt/oxford/releases/$COMMIT"
if [[ ! -f "$RELEASE/.ready" ]]; then
  install -d -o oxford-build -g oxford-build -m 0755 "$RELEASE"
  runuser -u oxford-build -- bash -s -- "$RELEASE" "$COMMIT" <<'BUILD'
set -euo pipefail
cd "$1"
if [[ ! -d .git ]]; then
  git init -q
  git remote add origin https://github.com/ZhaoChaoqun/Oxford-Reading-Tree.git
fi
git fetch --depth 1 origin "$2"
GIT_LFS_SKIP_SMUDGE=1 git checkout --detach "$2"
test "$(git rev-parse HEAD)" = "$2"
git lfs install --local
git lfs pull
npm ci --no-audit --no-fund
OXFORD_MEDIA_DIR="$PWD" node scripts/verify-media.mjs
OXFORD_SAME_ORIGIN_MEDIA=1 npm run build
node --test --test-reporter=dot scripts/local-media.test.mjs scripts/production-media.test.mjs scripts/same-origin-sw.test.mjs src/services/resourceResolver.test.mjs src/services/createLatestRenderQueue.test.mjs src/services/pdfWorkerSetup.test.mjs
touch .ready
BUILD
fi
chown -R root:oxford "$RELEASE"
chmod -R go-w "$RELEASE"
install -m 0644 "$RELEASE/deploy/oxford-media.service" /etc/systemd/system/oxford-media.service
OXFORD_HOST="$HOST" caddy validate --config "$RELEASE/deploy/Caddyfile" --adapter caddyfile
install -m 0644 "$RELEASE/deploy/Caddyfile" /etc/caddy/Caddyfile
install -d -m 0755 /etc/systemd/system/caddy.service.d
printf '[Service]\nEnvironment=OXFORD_HOST=%s\n' "$HOST" > /etc/systemd/system/caddy.service.d/oxford.conf
PREVIOUS=$(readlink /opt/oxford/current || true)
ln -s "$RELEASE" /opt/oxford/current.next
mv -Tf /opt/oxford/current.next /opt/oxford/current
systemctl daemon-reload
systemctl enable oxford-media caddy
if ! { systemctl restart oxford-media &&
       curl --fail --silent --show-error --retry 10 --retry-connrefused --retry-delay 1 http://127.0.0.1:3000/__local-media/probe.txt &&
       systemctl restart caddy; }; then
  echo "Service activation failed; restoring previous release if available." >&2
  if [[ -n "$PREVIOUS" ]]; then
    ln -s "$PREVIOUS" /opt/oxford/current.rollback
    mv -Tf /opt/oxford/current.rollback /opt/oxford/current
    systemctl restart oxford-media
  fi
  exit 1
fi
systemctl is-enabled oxford-media caddy
systemctl is-active oxford-media caddy
printf '\nDeployed commit %s at https://%s\n' "$COMMIT" "$HOST"
