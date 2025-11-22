#!/bin/sh
set -e

# Clean up any stale lock files before starting Foundry VTT
# This prevents "already locked by another process" errors when instances restart
echo "Checking for stale lock files..."

LOCK_FILE="/data/Config/options.json.lock"
if [ -e "$LOCK_FILE" ]; then
  echo "Removing stale lock file: $LOCK_FILE"
  rm -rf "$LOCK_FILE" || true
fi

# Also check for lock files in subdirectories (in case of different lock file patterns)
if [ -d "/data/Config" ]; then
  echo "Cleaning up any remaining lock files in Config directory..."
  find /data/Config -name "*.lock" -type f -delete 2>/dev/null || true
  find /data/Config -name "*.lock" -type d -exec rm -rf {} + 2>/dev/null || true
fi

echo "Starting Foundry VTT..."

# Start Foundry VTT
exec node main.js "$@"

