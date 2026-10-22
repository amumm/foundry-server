#!/bin/bash
# Copies the Foundry user data from the Cloud Run bucket onto the VM's disk.
# Run once after setup-gcp.sh, when nobody is logged in to Foundry.
set -euo pipefail

PROJECT_ID=${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}
ZONE=${ZONE:-us-central1-a}
VM_NAME=foundry-vm
DATA_BUCKET=gs://foundry-server-data-476001
CLOUD_RUN_SERVICE=foundry-server
CLOUD_RUN_REGION=northamerica-northeast2

echo "=== Blocking public traffic to the old Cloud Run server ==="
gcloud run services update "$CLOUD_RUN_SERVICE" --region "$CLOUD_RUN_REGION" --project "$PROJECT_ID" \
  --ingress internal
read -rp "Make sure nobody is still connected to the old server, then press Enter to copy the data..."

echo "=== Starting the VM ==="
gcloud compute instances start "$VM_NAME" --zone "$ZONE" --project "$PROJECT_ID"

echo "=== Copying data (this can take a while for large asset libraries) ==="
gcloud compute ssh "$VM_NAME" --zone "$ZONE" --project "$PROJECT_ID" --command "sudo bash -s" <<EOF
set -euo pipefail
while [ "\$(systemctl show -p ActiveState --value google-startup-scripts.service)" = activating ]; do
  echo "Waiting for first-boot setup to finish..."
  sleep 10
done
docker compose -f /opt/foundry/compose.yml stop foundry
gcloud storage rsync --recursive --delete-unmatched-destination-objects "$DATA_BUCKET" /mnt/foundry-data
google_metadata_script_runner startup
EOF

echo
echo "Migration complete. Once you've confirmed everything works, delete the old service:"
echo "  gcloud run services delete $CLOUD_RUN_SERVICE --region $CLOUD_RUN_REGION"
