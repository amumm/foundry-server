# FoundryVTT Deployment Guide - Oracle Cloud

This guide explains how to deploy FoundryVTT to Oracle Cloud using GitHub Actions for automated deployment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [GitHub Secrets Configuration](#github-secrets-configuration)
- [Available Workflows](#available-workflows)
- [Manual Server Access](#manual-server-access)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before using these GitHub Actions workflows, you need to:

1. **Oracle Cloud Account** - Create a free account at https://www.oracle.com/cloud/free/
2. **Oracle Cloud VM Instance** - Set up a compute instance (see Oracle Cloud Setup below)
3. **FoundryVTT License** - Valid license from https://foundryvtt.com
4. **GitHub Repository** - This code pushed to a GitHub repository

## Initial Setup

### 1. Oracle Cloud VM Setup (Manual)

Follow these steps in Oracle Cloud Console:

1. **Create Compute Instance:**

   - Go to **Menu → Compute → Instances → Create Instance**
   - **Name:** `foundryvtt-server`
   - **Image:** Ubuntu 22.04 (Always Free eligible)
   - **Shape:**
     - `VM.Standard.E2.1.Micro` (1GB RAM - good for 2-4 players)
     - OR `VM.Standard.A1.Flex` (Up to 24GB RAM - better for larger groups)
   - **Networking:** Assign public IPv4 address
   - **SSH Keys:** Download the private key (you'll need this!)

2. **Configure Security List (Firewall):**

   - Go to **Networking → Virtual Cloud Networks**
   - Select your VCN → **Security Lists → Default Security List**
   - Click **Add Ingress Rules** and add:
     ```
     Source CIDR: 0.0.0.0/0
     IP Protocol: TCP
     Destination Port: 30000
     Description: FoundryVTT
     ```

3. **Note your public IP address** - You'll need this for GitHub Secrets

### 2. Configure GitHub Secrets

Go to your GitHub repository: **Settings → Secrets and variables → Actions → New repository secret**

Add these secrets:

| Secret Name              | Description                                     | Example                                    |
| ------------------------ | ----------------------------------------------- | ------------------------------------------ |
| `ORACLE_SSH_PRIVATE_KEY` | Your Oracle Cloud VM SSH private key            | Contents of the `.key` file you downloaded |
| `ORACLE_HOST`            | Public IP address of your VM                    | `123.45.67.89`                             |
| `ORACLE_USER`            | SSH user (typically `ubuntu` for Ubuntu images) | `ubuntu`                                   |

### 3. Configure GitHub Variables (Optional)

Go to **Settings → Secrets and variables → Actions → Variables**

| Variable Name       | Description                | Default                |
| ------------------- | -------------------------- | ---------------------- |
| `FOUNDRY_PORT`      | Port FoundryVTT listens on | `30000`                |
| `FOUNDRY_DATA_PATH` | Path for user data         | `/opt/foundryvtt/data` |

## Available Workflows

### 1. Initial Deployment (`deploy-initial.yml`)

**Purpose:** First-time deployment to a fresh Oracle Cloud VM

**What it does:**

- Installs Node.js 20
- Creates FoundryVTT user and directories
- Uploads and installs your application
- Configures firewall rules
- Creates and starts systemd service

**How to run:**

1. Go to **Actions → Initial Deployment to Oracle Cloud**
2. Click **Run workflow**
3. Type `INITIAL` in the confirmation field
4. Click **Run workflow**

**When to use:**

- First deployment to new VM
- Complete server rebuild

### 2. Update/Redeploy (`deploy-update.yml`)

**Purpose:** Update application code while preserving user data

**What it does:**

- Optionally backs up user data
- Stops service
- Updates application files
- Preserves `/opt/foundryvtt/data` directory
- Reinstalls dependencies
- Restarts service

**How to run:**

1. Go to **Actions → Update/Redeploy to Oracle Cloud**
2. Click **Run workflow**
3. Choose options:
   - **Backup user data:** ✅ Recommended
   - **Restart service:** ✅ Usually yes
4. Click **Run workflow**

**When to use:**

- Deploying code updates
- Updating dependencies
- Regular maintenance updates

### 3. Rollback Deployment (`deploy-rollback.yml`)

**Purpose:** Restore data from a previous backup

**What it does:**

- Lists available backups (if no timestamp provided)
- Restores data from specified backup
- Creates backup of current data before rollback

**How to run:**

**To list backups:**

1. Go to **Actions → Rollback Deployment**
2. Click **Run workflow**
3. Leave timestamp empty
4. Click **Run workflow**

**To restore a backup:**

1. Go to **Actions → Rollback Deployment**
2. Click **Run workflow**
3. Enter timestamp (e.g., `20241016-143022`)
4. Click **Run workflow**

**When to use:**

- After a bad update
- Data corruption issues
- User requests to restore previous state

### 4. Server Management (`server-management.yml`)

**Purpose:** Common server operations

**Available actions:**

- **status** - View service status and system resources
- **restart** - Restart FoundryVTT service
- **stop** - Stop FoundryVTT service
- **start** - Start FoundryVTT service
- **logs** - View last 100 log lines
- **disk-usage** - Check disk space usage

**How to run:**

1. Go to **Actions → Server Management**
2. Click **Run workflow**
3. Select action from dropdown
4. Click **Run workflow**

**When to use:**

- Quick service restarts
- Checking server health
- Debugging issues
- Monitoring disk space

## Manual Server Access

### SSH into your server:

```bash
# Make key secure (first time only)
chmod 400 /path/to/your-key.key

# Connect
ssh -i /path/to/your-key.key ubuntu@YOUR_PUBLIC_IP
```

### Useful Commands:

```bash
# View real-time logs
sudo journalctl -u foundryvtt -f

# Check service status
sudo systemctl status foundryvtt

# Restart service
sudo systemctl restart foundryvtt

# Stop service
sudo systemctl stop foundryvtt

# Start service
sudo systemctl start foundryvtt

# Check if port is listening
sudo netstat -tuln | grep 30000

# View disk usage
df -h
du -sh /opt/foundryvtt/*

# List backups
ls -lh /opt/foundryvtt/backups/

# Check system resources
free -h
top
```

## Accessing Your FoundryVTT Instance

After successful deployment:

**URL:** `http://YOUR_PUBLIC_IP:30000`

**Initial Setup:**

1. Enter your FoundryVTT license key
2. Create admin password
3. Configure worlds and modules

## Setting Up Domain & SSL (Optional)

For a custom domain with HTTPS:

1. **Point your domain to the server:**

   - Create an A record pointing to your Oracle Cloud public IP

2. **SSH into server and run:**

```bash
# Install Nginx and Certbot
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/foundryvtt
```

3. **Add this configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:30000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

4. **Enable and secure:**

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/foundryvtt /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Open ports in firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

5. **Update Oracle Cloud Security List:**
   - Add ingress rules for ports 80 and 443

## Troubleshooting

### Workflow fails with "Connection refused"

**Check:**

- Is `ORACLE_HOST` secret set correctly?
- Is the VM running in Oracle Cloud?
- Are Oracle Cloud firewall rules configured for SSH (port 22)?

### Service won't start after deployment

**Check logs:**

```bash
sudo journalctl -u foundryvtt -n 50
```

**Common issues:**

- Port 30000 already in use
- Missing dependencies
- File permission issues
- Out of memory (especially on 1GB instances)

### Out of disk space

**Check usage:**

```bash
df -h
sudo du -sh /opt/foundryvtt/*
```

**Clean up:**

```bash
# Remove old backups
sudo rm /opt/foundryvtt/backups/data-backup-OLDDATE-*.tar.gz

# Clean npm cache
sudo -u foundryvtt npm cache clean --force

# Remove old logs
sudo journalctl --vacuum-time=7d
```

### Cannot connect to FoundryVTT

**Check:**

1. Service is running: `sudo systemctl status foundryvtt`
2. Port is listening: `sudo netstat -tuln | grep 30000`
3. Oracle Cloud Security List allows port 30000
4. Ubuntu firewall allows port 30000: `sudo ufw status`

### GitHub Action timeout

**Possible causes:**

- Large file transfers
- Slow network connection
- npm install taking too long

**Solutions:**

- Increase workflow timeout
- Use `--prefer-offline` for npm
- Pre-cache dependencies

## Resource Limits

### Free Tier Limits:

**VM.Standard.E2.1.Micro:**

- 1GB RAM - Good for 2-4 players
- 1/8 OCPU
- 50GB boot volume

**VM.Standard.A1.Flex (Ampere/ARM):**

- 24GB RAM total (distributed across instances)
- 4 OCPUs total
- Better performance for larger groups

**Storage:**

- 200GB total across all instances
- Consider regular backup cleanup

**Bandwidth:**

- 10TB outbound per month
- Usually sufficient for most groups

## Security Best Practices

1. **Keep your SSH key secure:**

   - Never commit to repository
   - Use GitHub Secrets for storage
   - Rotate keys periodically

2. **Regular updates:**

   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Monitor logs for suspicious activity:**

   ```bash
   sudo journalctl -u foundryvtt --since today
   ```

4. **Use strong admin password in FoundryVTT**

5. **Consider fail2ban for SSH protection:**
   ```bash
   sudo apt install fail2ban
   ```

## Support

**FoundryVTT:**

- Official: https://foundryvtt.com
- Discord: https://discord.gg/foundryvtt
- Reddit: r/FoundryVTT

**Oracle Cloud:**

- Documentation: https://docs.oracle.com/en-us/iaas/
- Support: https://www.oracle.com/cloud/free/

**GitHub Actions:**

- Documentation: https://docs.github.com/en/actions

## License

This deployment configuration is provided as-is. FoundryVTT itself requires a valid license from Foundry Gaming LLC.
