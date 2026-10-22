#!/bin/bash
# One-time setup of the Foundry VM, its start schedule, and the Discord bot.
# Safe to re-run: existing resources are left alone.
#
# Required environment variables:
#   FOUNDRY_HOSTNAME     Public hostname routed by the Cloudflare Tunnel (e.g. foundry.example.com)
#   DISCORD_PUBLIC_KEY   From the Discord Developer Portal > General Information
#   DISCORD_GUILD_ID     Your Discord server's ID
set -euo pipefail
cd "$(dirname "$0")/.."

: "${FOUNDRY_HOSTNAME:?Set FOUNDRY_HOSTNAME}"
: "${DISCORD_PUBLIC_KEY:?Set DISCORD_PUBLIC_KEY}"
: "${DISCORD_GUILD_ID:?Set DISCORD_GUILD_ID}"

PROJECT_ID=${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
REGION=${REGION:-us-central1}
ZONE=${ZONE:-us-central1-a}

VM_NAME=foundry-vm
MACHINE_TYPE=${MACHINE_TYPE:-e2-medium}
DATA_DISK=foundry-data
DATA_DISK_SIZE_GB=${DATA_DISK_SIZE_GB:-10}
FOUNDRY_IMAGE="gcr.io/$PROJECT_ID/github.com/amumm/foundry-server:latest"
DATA_BUCKET=gs://foundry-server-data-476001

TUNNEL_SECRET=cloudflare-tunnel-token
SCHEDULE_NAME=foundry-session-start
SCHEDULE_CRON=${SCHEDULE_CRON:-"0 19 * * 3"}  # Wednesdays 7:00 PM
SCHEDULE_TIMEZONE=America/Chicago

VM_SA_NAME=foundry-vm
VM_SA="$VM_SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"
BOT_SA_NAME=foundry-discord-bot
BOT_SA="$BOT_SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"
BOT_ROLE=foundryVmController
BOT_SERVICE=foundry-discord-bot

step() { echo; echo "=== $* ==="; }
exists() { "$@" >/dev/null 2>&1; }

step "Enabling APIs"
gcloud services enable \
  compute.googleapis.com run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com iam.googleapis.com \
  --project "$PROJECT_ID"

step "Creating service accounts"
exists gcloud iam service-accounts describe "$VM_SA" --project "$PROJECT_ID" ||
  gcloud iam service-accounts create "$VM_SA_NAME" --project "$PROJECT_ID" \
    --display-name "Foundry VM"
exists gcloud iam service-accounts describe "$BOT_SA" --project "$PROJECT_ID" ||
  gcloud iam service-accounts create "$BOT_SA_NAME" --project "$PROJECT_ID" \
    --display-name "Foundry Discord bot"

step "Granting the VM access to images, logs, and the data bucket"
for role in roles/artifactregistry.reader roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member "serviceAccount:$VM_SA" --role "$role" --condition=None --quiet >/dev/null
done
for role in roles/storage.objectViewer roles/storage.legacyBucketReader; do
  gcloud storage buckets add-iam-policy-binding "$DATA_BUCKET" \
    --member "serviceAccount:$VM_SA" --role "$role" >/dev/null
done

step "Storing the Cloudflare Tunnel token"
if ! exists gcloud secrets describe "$TUNNEL_SECRET" --project "$PROJECT_ID"; then
  read -rsp "Paste the Cloudflare Tunnel token: " TUNNEL_TOKEN; echo
  printf '%s' "$TUNNEL_TOKEN" | gcloud secrets create "$TUNNEL_SECRET" \
    --project "$PROJECT_ID" --replication-policy automatic --data-file=-
fi
gcloud secrets add-iam-policy-binding "$TUNNEL_SECRET" --project "$PROJECT_ID" \
  --member "serviceAccount:$VM_SA" --role roles/secretmanager.secretAccessor >/dev/null

step "Creating the data disk"
exists gcloud compute disks describe "$DATA_DISK" --zone "$ZONE" --project "$PROJECT_ID" ||
  gcloud compute disks create "$DATA_DISK" --zone "$ZONE" --project "$PROJECT_ID" \
    --size "${DATA_DISK_SIZE_GB}GB" --type pd-balanced

step "Creating the VM"
if ! exists gcloud compute instances describe "$VM_NAME" --zone "$ZONE" --project "$PROJECT_ID"; then
  gcloud compute instances create "$VM_NAME" --zone "$ZONE" --project "$PROJECT_ID" \
    --machine-type "$MACHINE_TYPE" \
    --image-family debian-12 --image-project debian-cloud \
    --boot-disk-size 10GB --boot-disk-type pd-standard \
    --disk "name=$DATA_DISK,device-name=$DATA_DISK,mode=rw,auto-delete=no" \
    --service-account "$VM_SA" --scopes cloud-platform \
    --shielded-secure-boot --shielded-vtpm --shielded-integrity-monitoring \
    --metadata "foundry-hostname=$FOUNDRY_HOSTNAME,foundry-image=$FOUNDRY_IMAGE,tunnel-token-secret=$TUNNEL_SECRET,idle-minutes=30,boot-grace-minutes=90,max-uptime-hours=12" \
    --metadata-from-file "startup-script=deploy/vm/startup.sh,compose-file=deploy/vm/compose.yml,idle-check-script=deploy/vm/idle-check.sh"
fi

step "Scheduling the weekly start"
exists gcloud compute resource-policies describe "$SCHEDULE_NAME" --region "$REGION" --project "$PROJECT_ID" ||
  gcloud compute resource-policies create instance-schedule "$SCHEDULE_NAME" \
    --region "$REGION" --project "$PROJECT_ID" \
    --vm-start-schedule "$SCHEDULE_CRON" --timezone "$SCHEDULE_TIMEZONE" \
    --description "Boot Foundry before the weekly session"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:service-$PROJECT_NUMBER@compute-system.iam.gserviceaccount.com" \
  --role roles/compute.instanceAdmin.v1 --condition=None --quiet >/dev/null
gcloud compute instances add-resource-policies "$VM_NAME" --zone "$ZONE" --project "$PROJECT_ID" \
  --resource-policies "$SCHEDULE_NAME" 2>/dev/null || echo "Schedule already attached"

step "Letting the bot start and stop only this VM"
exists gcloud iam roles describe "$BOT_ROLE" --project "$PROJECT_ID" ||
  gcloud iam roles create "$BOT_ROLE" --project "$PROJECT_ID" \
    --title "Foundry VM controller" \
    --permissions compute.instances.get,compute.instances.start,compute.instances.stop,compute.instances.resume
gcloud compute instances add-iam-policy-binding "$VM_NAME" --zone "$ZONE" --project "$PROJECT_ID" \
  --member "serviceAccount:$BOT_SA" --role "projects/$PROJECT_ID/roles/$BOT_ROLE" >/dev/null
# Starting a VM that runs as a service account requires permission to act as that account.
gcloud iam service-accounts add-iam-policy-binding "$VM_SA" --project "$PROJECT_ID" \
  --member "serviceAccount:$BOT_SA" --role roles/iam.serviceAccountUser >/dev/null

step "Deploying the Discord bot"
gcloud run deploy "$BOT_SERVICE" --source discord-bot \
  --region "$REGION" --project "$PROJECT_ID" \
  --service-account "$BOT_SA" \
  --allow-unauthenticated \
  --no-cpu-throttling --cpu-boost --cpu 1 --memory 512Mi \
  --min-instances 0 --max-instances 1 \
  --set-env-vars "DISCORD_PUBLIC_KEY=$DISCORD_PUBLIC_KEY,DISCORD_GUILD_ID=$DISCORD_GUILD_ID,GCP_PROJECT=$PROJECT_ID,GCP_ZONE=$ZONE,GCP_INSTANCE=$VM_NAME,FOUNDRY_URL=https://$FOUNDRY_HOSTNAME"

BOT_URL=$(gcloud run services describe "$BOT_SERVICE" --region "$REGION" --project "$PROJECT_ID" \
  --format 'value(status.url)')

step "Done"
echo "Set the Discord Interactions Endpoint URL to: $BOT_URL"
echo "Foundry will be served at: https://$FOUNDRY_HOSTNAME"
