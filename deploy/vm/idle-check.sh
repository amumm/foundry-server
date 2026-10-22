#!/bin/bash
# Stops the VM once nobody has been connected to Foundry for a while.
# Every player's browser (and every Cloudflare Tunnel request) holds a TCP
# connection to Foundry's port, so zero connections means nobody is using it.
set -euo pipefail

meta() {
  curl -fs -H "Metadata-Flavor: Google" \
    "http://metadata.google.internal/computeMetadata/v1/instance/attributes/$1" || echo "$2"
}

IDLE_MINUTES=$(meta idle-minutes 30)
BOOT_GRACE_MINUTES=$(meta boot-grace-minutes 90)
MAX_UPTIME_HOURS=$(meta max-uptime-hours 12)

# Lives in /run so it resets on every boot.
DEADLINE_FILE=/run/foundry-idle-deadline

now=$(date +%s)

connections=0
pid=$(docker inspect -f '{{.State.Pid}}' foundry 2>/dev/null || echo 0)
if [ "$pid" -gt 0 ]; then
  connections=$(nsenter -t "$pid" -n ss -Htn state established '( sport = :30000 )' | wc -l)
fi

if [ ! -f "$DEADLINE_FILE" ]; then
  echo $((now + BOOT_GRACE_MINUTES * 60)) > "$DEADLINE_FILE"
fi
deadline=$(cat "$DEADLINE_FILE")

if [ "$connections" -gt 0 ]; then
  new_deadline=$((now + IDLE_MINUTES * 60))
  if [ "$new_deadline" -gt "$deadline" ]; then
    deadline=$new_deadline
    echo "$deadline" > "$DEADLINE_FILE"
  fi
fi

uptime_seconds=$(cut -d. -f1 /proc/uptime)

if [ "$now" -ge "$deadline" ] || [ "$uptime_seconds" -ge $((MAX_UPTIME_HOURS * 3600)) ]; then
  logger -t foundry-idle "Shutting down: connections=$connections uptime=${uptime_seconds}s"
  docker compose -f /opt/foundry/compose.yml stop || true
  shutdown -h now
else
  logger -t foundry-idle "Active: connections=$connections, shutdown in $(((deadline - now) / 60)) min if idle"
fi
