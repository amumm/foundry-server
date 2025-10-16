# FoundryVTT Oracle Cloud Deployment - Quick Start

Get your FoundryVTT server running on Oracle Cloud in under 30 minutes!

## Prerequisites

- [ ] Oracle Cloud account (free tier)
- [ ] FoundryVTT license
- [ ] GitHub account
- [ ] This repository

## Step-by-Step Setup

### 1. Create Oracle Cloud VM (10 minutes)

1. **Sign up for Oracle Cloud**: https://www.oracle.com/cloud/free/
2. **Create Compute Instance**:

   - Click: **Menu → Compute → Instances → Create Instance**
   - Name: `foundryvtt-server`
   - Image: **Ubuntu 22.04**
   - Shape: **VM.Standard.E2.1.Micro** (Always Free)
   - **Save the SSH private key** when prompted!
   - Note the **Public IP address**

3. **Configure Firewall**:
   - Go to: **Networking → Virtual Cloud Networks**
   - Click your VCN → **Security Lists → Default Security List**
   - Add Ingress Rule:
     ```
     Source: 0.0.0.0/0
     Port: 30000
     Description: FoundryVTT
     ```

✅ **VM is ready!**

### 2. Configure GitHub Repository (5 minutes)

1. **Push this code to GitHub** (if you haven't already)

2. **Set GitHub Secrets**:

   - Go to: **Settings → Secrets and variables → Actions → New repository secret**
   - Add three secrets:

   | Name                     | Value                        | Where to get it               |
   | ------------------------ | ---------------------------- | ----------------------------- |
   | `ORACLE_SSH_PRIVATE_KEY` | Your SSH private key content | File you downloaded in step 1 |
   | `ORACLE_HOST`            | `123.45.67.89`               | Public IP from Oracle Cloud   |
   | `ORACLE_USER`            | `ubuntu`                     | Default for Ubuntu images     |

3. **Verify secrets**:
   ```bash
   # Optional: Use the validation script
   bash .github/scripts/validate-setup.sh
   ```

✅ **GitHub is configured!**

### 3. Deploy FoundryVTT (10 minutes)

1. **Go to GitHub Actions**:

   - Click **Actions** tab in your repository
   - Select **Initial Deployment to Oracle Cloud**

2. **Run the workflow**:

   - Click **Run workflow**
   - Type `INITIAL` in the confirmation field
   - Click **Run workflow** button

3. **Wait for deployment** (~5-10 minutes):
   - Watch the workflow progress
   - Look for green checkmarks ✅

✅ **Deployment complete!**

### 4. Access Your Server (2 minutes)

1. **Open in browser**: `http://YOUR_PUBLIC_IP:30000`

2. **Complete FoundryVTT setup**:
   - Enter your license key
   - Set admin password
   - Create your first world

✅ **You're ready to play!**

## What's Next?

### Add Your Players

Share this URL with your players: `http://YOUR_PUBLIC_IP:30000`

### Set Up a Custom Domain (Optional)

1. Point your domain to the server IP
2. SSH into server
3. Run SSL setup:
   ```bash
   sudo apt install -y nginx certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

See `DEPLOYMENT.md` for detailed instructions.

### Update Your Server

When you need to deploy code updates:

1. Push changes to GitHub
2. Go to **Actions → Update/Redeploy to Oracle Cloud**
3. Run workflow with backup enabled

## Common Tasks

### Restart Server

**Actions → Server Management → restart**

### View Logs

**Actions → Server Management → logs**

### Check Status

**Actions → Server Management → status**

### Rollback Update

**Actions → Rollback Deployment → list backups**

## Troubleshooting

### Can't access FoundryVTT?

**Check:**

1. VM is running in Oracle Cloud Console
2. Security List allows port 30000
3. Using `http://` not `https://`
4. Workflow completed successfully (green checkmarks)

**Test SSH connection:**

```bash
ssh -i your-key.key ubuntu@YOUR_PUBLIC_IP
```

**Check service status:**

```bash
sudo systemctl status foundryvtt
```

### Deployment failed?

1. Check workflow logs in GitHub Actions
2. Verify GitHub Secrets are correct
3. Ensure VM is running
4. Run validation script: `bash .github/scripts/validate-setup.sh`

### Need more help?

- Full documentation: `DEPLOYMENT.md`
- Secrets guide: `.github/SECRETS_TEMPLATE.md`
- Workflow details: `.github/README.md`

## Quick Reference

### Important URLs

- **FoundryVTT**: `http://YOUR_PUBLIC_IP:30000`
- **Oracle Cloud Console**: https://cloud.oracle.com/
- **GitHub Repository**: Your repo URL

### Important Commands

```bash
# SSH into server
ssh -i your-key.key ubuntu@YOUR_PUBLIC_IP

# Check service status
sudo systemctl status foundryvtt

# View logs
sudo journalctl -u foundryvtt -f

# Restart service
sudo systemctl restart foundryvtt

# Check disk space
df -h
```

### GitHub Actions Workflows

- **Initial Deployment**: First-time setup
- **Update/Redeploy**: Code updates
- **Rollback**: Restore from backup
- **Server Management**: Status, restart, logs

## Cost

Oracle Cloud Always Free Tier includes:

- 2 AMD VMs (1GB RAM each) OR
- 4 ARM VMs (24GB RAM total)
- 200GB storage
- 10TB bandwidth/month

**Cost: $0/month** (forever, not a trial!)

## Performance Tips

### For larger games (5+ players):

1. Use ARM instance (A1.Flex) instead of E2.1.Micro
2. Allocate 4GB+ RAM
3. Enable compression in FoundryVTT settings

### Optimize assets:

- Use `.webp` for images
- Compress audio files
- Use external asset hosting for large files

## Security Tips

- ✅ Keep SSH key secure (never commit to GitHub)
- ✅ Use strong admin password in FoundryVTT
- ✅ Regularly update system: `sudo apt update && sudo apt upgrade -y`
- ✅ Consider adding SSL with custom domain
- ✅ Monitor server logs for suspicious activity

## Getting Started Checklist

- [ ] Oracle Cloud account created
- [ ] VM instance created and running
- [ ] Security List configured for port 30000
- [ ] SSH key saved securely
- [ ] Public IP noted
- [ ] Code pushed to GitHub
- [ ] GitHub Secrets configured
- [ ] Initial deployment workflow run
- [ ] FoundryVTT accessible in browser
- [ ] License key entered
- [ ] Admin password set
- [ ] First world created
- [ ] Players invited

🎉 **Congratulations!** Your FoundryVTT server is running!

## Support

- **FoundryVTT**: https://foundryvtt.com/kb/
- **Oracle Cloud**: https://docs.oracle.com/en-us/iaas/
- **GitHub Actions**: https://docs.github.com/en/actions
- **This Project**: See `DEPLOYMENT.md` for full documentation

---

**Ready to play?** Share `http://YOUR_PUBLIC_IP:30000` with your party and start your adventure! 🎲
