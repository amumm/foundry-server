# Foundry VTT on Compute Engine: Setup Guide

Foundry runs on a small Compute Engine VM that is off most of the time. It boots automatically before the weekly session, can be started on demand from Discord, and shuts itself down when nobody is using it. Players always use the same URL through a Cloudflare Tunnel.

## How it works

- **VM**: `foundry-vm`, an `e2-medium` in `us-central1-a`. Foundry and `cloudflared` run in Docker (`deploy/vm/compose.yml`). World data lives on a separate 10 GB disk mounted at `/mnt/foundry-data`.
- **Updates**: each boot pulls `gcr.io/<project>/github.com/amumm/foundry-server:latest`, which Cloud Build pushes on every commit. Changes go live on the next boot.
- **URL**: `https://foundry.yourdomain.com` through a Cloudflare Tunnel. There's no static IP, and no inbound ports are opened.
- **Discord**: `/foundry start`, `/foundry status`, and `/foundry stop`, available to anyone in the Discord server. The bot runs on Cloud Run (`discord-bot/`).
- **Schedule**: the VM starts every Wednesday at 7:00 PM Central, ahead of sessions that usually start between 7:30 and 8:00.
- **Idle shutdown**: the VM shuts down after 30 minutes with nobody connected. After boot it waits 90 minutes before shutting down for inactivity, so a scheduled start stays up until at least 8:30. It also has a hard cap of 12 hours of uptime (`deploy/vm/idle-check.sh`).

| Item | Approx. monthly cost |
|---|---|
| VM (~22 hrs/month) | ~$0.75 |
| Disks (10 GB boot + 10 GB data) | ~$1.40 |
| IP while running, egress, snapshots | ~$0–2 |
| Cloudflare Tunnel, Discord bot, Secret Manager | Free |
| **Total** | **~$2–4** |

Extra on-demand hours cost about 3–4 cents each.

---

## 1. Cloudflare

### Move the domain's DNS to Cloudflare

Google Domains was sold to Squarespace, so domains bought through Google are now managed at [domains.squarespace.com](https://domains.squarespace.com). If you registered it through Google Cloud Domains instead, find it in the Cloud Console under Network services, then Cloud Domains. You can keep the domain registered where it is. Only its DNS needs to move to Cloudflare.

1. In Cloudflare, click **Add a site**, enter your domain, and choose the **Free** plan.
2. Check the records Cloudflare copied over, especially MX/TXT records if you use the domain for email.
3. If DNSSEC is on at your current provider, turn it off first.
4. At your current registrar, change the nameservers to the two Cloudflare gives you.
5. Wait for the site to show **Active** in Cloudflare.

Optionally, you can later transfer the registration to Cloudflare Registrar, which charges its cost price. Transfers aren't allowed within 60 days of registering, transferring, or changing the domain's owner.

### Create the tunnel

1. Go to **Zero Trust**, then **Networks**, then **Tunnels**, and create a tunnel. Copy its **token**.
2. Add a public hostname:
   - Hostname: `foundry.yourdomain.com`
   - Service: `http://foundry:30000`
3. Turn off **Rocket Loader** for that hostname, because it can break Foundry's JavaScript.

---

## 2. Discord

### Create the application

In the [Discord Developer Portal](https://discord.com/developers/applications), create an application and note:

- **Application ID** and **Public Key**, from General Information
- **Bot token**, from Bot (click Reset Token to see it)

Under **Installation**, make sure **Guild Install** is checked, with `applications.commands` among its scopes.

### Find your server (guild) ID

1. Go to **User Settings**, then **Advanced**, and turn on **Developer Mode**.
2. Right-click the server icon and click **Copy Server ID**.

Or open Discord in a browser: in `discord.com/channels/<guild_id>/<channel_id>`, the first number is the guild ID.

### Add the app to your server

Open this link, replacing `APP_ID`, and pick your server:

```
https://discord.com/oauth2/authorize?client_id=APP_ID&scope=applications.commands
```

You don't need to own the server, but you do need **Manage Server** or **Administrator** in it. If you don't have either, ask an admin to open the link.

### Register the command

```bash
cd discord-bot
DISCORD_APPLICATION_ID=... DISCORD_GUILD_ID=... DISCORD_BOT_TOKEN=... npm run register
```

### If registration fails

If you get **`403 Missing Access` (code 50001)**:

- The app hasn't been added to that server yet. Open the link above.
- The guild ID is wrong. It must be the server ID, not a channel or user ID.
- The application ID or bot token belongs to a different app.

---

## 3. Google Cloud

Your current data is about 1 GB, so the default 10 GB data disk is plenty. Check the size with `gcloud storage du -s gs://foundry-server-data-476001`, and set `DATA_DISK_SIZE_GB` if you need more.

```bash
FOUNDRY_HOSTNAME=foundry.yourdomain.com \
DISCORD_PUBLIC_KEY=... \
DISCORD_GUILD_ID=... \
./deploy/setup-gcp.sh
```

The script prompts for the Cloudflare Tunnel token and can be safely re-run. It creates:

- The service accounts `foundry-vm` and `foundry-discord-bot`, with minimal permissions. The bot can only get, start, stop, or resume this one VM.
- The secret `cloudflare-tunnel-token`.
- The disk `foundry-data` and the VM `foundry-vm`.
- The weekly start schedule `foundry-session-start`.
- The Cloud Run service `foundry-discord-bot`.

When it finishes, copy the printed bot URL into the Discord Developer Portal under **General Information**, then **Interactions Endpoint URL**, and save.

Optional overrides: `PROJECT_ID`, `REGION`, `ZONE`, `MACHINE_TYPE`, `DATA_DISK_SIZE_GB`, `SCHEDULE_CRON`.

---

## 4. Migrate data from Cloud Run

Do this on a day with no session:

```bash
./deploy/migrate-data.sh
```

It blocks public traffic to the old Cloud Run service, starts the VM, copies the bucket onto the VM's disk, and re-runs the startup script to apply the new hostname settings. If SSH on port 22 is blocked in your network, add `--tunnel-through-iap` to the `gcloud compute ssh` line in the script.

## 5. Clean up

After confirming everything works:

1. Delete the old service:
   ```bash
   gcloud run services delete foundry-server --region northamerica-northeast2
   ```
2. Remove the **Deploy container image to Cloud Run** step from `cloudbuild.yaml`. Keep the build and push steps, because the VM pulls the `:latest` image.
3. Once you're confident the data is safe, you can delete the old buckets (`foundry-server-data-476001`, `foundry-server-packages-476001`).

---

## Day-to-day operations

### Change idle and shutdown timing

The settings are VM metadata, so no redeploy is needed. They take effect at the next check (every 5 minutes):

```bash
gcloud compute instances add-metadata foundry-vm --zone us-central1-a \
  --metadata idle-minutes=45,boot-grace-minutes=90,max-uptime-hours=12
```

### Push changes to the VM scripts

After editing anything in `deploy/vm/`:

```bash
gcloud compute instances add-metadata foundry-vm --zone us-central1-a \
  --metadata-from-file startup-script=deploy/vm/startup.sh,compose-file=deploy/vm/compose.yml,idle-check-script=deploy/vm/idle-check.sh
```

The changes apply on the next boot.

### Change the weekly schedule

Instance schedules can't be edited in place. Detach the old one, delete it, then re-run the setup script with a new cron expression:

```bash
gcloud compute instances remove-resource-policies foundry-vm --zone us-central1-a --resource-policies foundry-session-start
gcloud compute resource-policies delete foundry-session-start --region us-central1
SCHEDULE_CRON="0 19 * * 4" FOUNDRY_HOSTNAME=... DISCORD_PUBLIC_KEY=... DISCORD_GUILD_ID=... ./deploy/setup-gcp.sh
```

### Grow the data disk

Disks can be grown but never shrunk. There's no downtime and no data loss:

```bash
gcloud compute disks resize foundry-data --zone us-central1-a --size 20GB
gcloud compute ssh foundry-vm --zone us-central1-a --command "sudo resize2fs /dev/disk/by-id/google-foundry-data"
```

Check usage with `df -h /mnt/foundry-data` on the VM.

### Logs

On the VM (`gcloud compute ssh foundry-vm --zone us-central1-a`):

```bash
sudo journalctl -u google-startup-scripts   # boot/setup
sudo journalctl -t foundry-idle             # idle checks and shutdowns
sudo docker logs foundry                    # Foundry itself
sudo docker logs cloudflared                # tunnel
```

For the bot, look under Cloud Run, then `foundry-discord-bot`, then **Logs** in the Cloud Console.

---

## Known quirks

- **"The application did not respond"** can appear on the first command after the bot has been idle, while it starts up. Running the command again works.
- **Visiting the URL while the server is off** shows a Cloudflare error page (1033). A small Cloudflare Worker could show a friendlier "use `/foundry start`" page instead.
- **Large video files**: Cloudflare's free plan isn't meant for serving large videos, so avoid big video backgrounds in scenes.
- **Forgotten browser tabs** keep a connection open, which blocks idle shutdown. The 12-hour uptime cap limits the cost.
