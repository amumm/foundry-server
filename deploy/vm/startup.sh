#!/bin/bash
# Runs as root on every boot via the VM's startup-script metadata.
set -euo pipefail

meta() {
  curl -fs -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/attributes/$1"
}

PUBLIC_HOSTNAME=$(meta foundry-hostname)
FOUNDRY_IMAGE=$(meta foundry-image)
TUNNEL_SECRET=$(meta tunnel-token-secret)

DATA_DEVICE=/dev/disk/by-id/google-foundry-data
DATA_DIR=/mnt/foundry-data
APP_DIR=/opt/foundry
OPTIONS="$DATA_DIR/Config/options.json"

echo "=== Mounting data disk ==="
if ! blkid "$DATA_DEVICE" >/dev/null 2>&1; then
  mkfs.ext4 -m 0 -E lazy_itable_init=0,lazy_journal_init=0,discard "$DATA_DEVICE"
fi
mkdir -p "$DATA_DIR"
mountpoint -q "$DATA_DIR" || mount -o discard,defaults "$DATA_DEVICE" "$DATA_DIR"

echo "=== Installing dependencies ==="
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi
if ! command -v jq >/dev/null; then
  apt-get update -q && apt-get install -y -q jq
fi
gcloud auth configure-docker "${FOUNDRY_IMAGE%%/*}" --quiet

echo "=== Writing Foundry config ==="
install -d -m 700 "$APP_DIR"
meta compose-file > "$APP_DIR/compose.yml"
printf 'FOUNDRY_IMAGE=%s\n' "$FOUNDRY_IMAGE" > "$APP_DIR/.env"
(
  umask 077
  printf 'TUNNEL_TOKEN=%s\n' "$(gcloud secrets versions access latest --secret="$TUNNEL_SECRET")" \
    > "$APP_DIR/tunnel.env"
)

meta idle-check-script > /usr/local/bin/foundry-idle-check
chmod 755 /usr/local/bin/foundry-idle-check

cat > /etc/systemd/system/foundry-idle-check.service <<'EOF'
[Unit]
Description=Shut the VM down when nobody is connected to Foundry

[Service]
Type=oneshot
ExecStart=/usr/local/bin/foundry-idle-check
EOF

cat > /etc/systemd/system/foundry-idle-check.timer <<'EOF'
[Unit]
Description=Check for Foundry inactivity every 5 minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now foundry-idle-check.timer

# Foundry must be behind Cloudflare's HTTPS for invite links and A/V to work.
options_ok() {
  jq -e --arg host "$PUBLIC_HOSTNAME" \
    '.hostname == $host and .proxySSL == true and .proxyPort == 443' "$OPTIONS" >/dev/null
}

patch_options() {
  local tmp
  tmp=$(mktemp)
  jq --arg host "$PUBLIC_HOSTNAME" \
    '.hostname = $host | .proxySSL = true | .proxyPort = 443' "$OPTIONS" > "$tmp"
  mv "$tmp" "$OPTIONS"
}

compose() {
  docker compose -f "$APP_DIR/compose.yml" "$@"
}

echo "=== Starting Foundry ==="
compose pull --quiet

# Foundry rewrites options.json while running, so only edit it while stopped.
if [ -f "$OPTIONS" ] && ! options_ok; then
  compose stop foundry
  patch_options
fi

compose up -d --remove-orphans

if [ ! -f "$OPTIONS" ]; then
  for _ in $(seq 1 60); do
    [ -f "$OPTIONS" ] && break
    sleep 2
  done
  if [ -f "$OPTIONS" ]; then
    compose stop foundry
    patch_options
    compose up -d
  else
    echo "WARNING: Foundry never created $OPTIONS; hostname/proxy settings not applied"
  fi
fi

docker image prune -f >/dev/null
echo "=== Foundry is running at https://$PUBLIC_HOSTNAME ==="
