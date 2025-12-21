#!/bin/sh
set -e

echo "=== Foundry VTT Startup Script ==="
echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# Clean up any stale lock files before starting Foundry VTT
# This prevents "already locked by another process" errors when instances restart
# GCS FUSE can have latency issues with lock files, so we clean them aggressively
echo "Cleaning up stale lock files..."

# Clean all lock files in the data directory
if [ -d "/data" ]; then
  echo "Cleaning lock files in /data..."
  find /data -name "*.lock" -type f -delete 2>/dev/null || true
  find /data -name "*.lock" -type d -exec rm -rf {} + 2>/dev/null || true
fi

# Clean all lock files in the packages directory  
if [ -d "/packages" ]; then
  echo "Cleaning lock files in /packages..."
  find /packages -name "*.lock" -type f -delete 2>/dev/null || true
  find /packages -name "*.lock" -type d -exec rm -rf {} + 2>/dev/null || true
fi

# Wait briefly for GCS FUSE to stabilize after cleanup
echo "Waiting for filesystem to stabilize..."
sleep 2

# Verify mount points are accessible
echo "Verifying mount points..."
if [ -d "/data" ] && [ -d "/packages" ]; then
  echo "Mount points accessible: /data and /packages"
else
  echo "WARNING: Mount points may not be ready"
fi

# Sync bundled modules to the data directory
# This copies modules that are bundled with the Docker image to persistent storage
if [ -d "/app/bundled-modules" ]; then
  echo "Syncing bundled modules to /data/Data/modules..."
  mkdir -p /data/Data/modules
  
  for module_dir in /app/bundled-modules/*/; do
    if [ -d "$module_dir" ]; then
      module_name=$(basename "$module_dir")
      target_dir="/data/Data/modules/$module_name"
      
      # Always sync to ensure latest version
      echo "  Syncing module: $module_name"
      rm -rf "$target_dir"
      cp -r "$module_dir" "$target_dir"
    fi
  done
  
  echo "Bundled modules synced successfully"
fi

echo "Starting Foundry VTT..."

# Start Foundry VTT with node
# Using exec to replace shell process with node for proper signal handling
exec node main.js "$@"

