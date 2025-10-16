# GitHub Actions Workflows for FoundryVTT Deployment

This directory contains automated deployment workflows for deploying and managing FoundryVTT on Oracle Cloud.

## Quick Start

1. **Complete manual setup** (Oracle Cloud VM creation)
2. **Configure GitHub Secrets** (see `SECRETS_TEMPLATE.md`)
3. **Run Initial Deployment** workflow
4. **Access your server** at `http://YOUR_IP:30000`

## Workflows Overview

| Workflow                | Purpose                  | When to Use                  |
| ----------------------- | ------------------------ | ---------------------------- |
| `deploy-initial.yml`    | First-time deployment    | Setting up fresh server      |
| `deploy-update.yml`     | Update application code  | After code changes           |
| `deploy-rollback.yml`   | Restore from backup      | After bad update             |
| `server-management.yml` | Common server operations | Restart, logs, status checks |

## Prerequisites

Before running any workflow:

- ✅ Oracle Cloud account created
- ✅ VM instance created and running
- ✅ GitHub Secrets configured (see `SECRETS_TEMPLATE.md`)
- ✅ FoundryVTT license available

## Running a Workflow

1. Go to **Actions** tab in your GitHub repository
2. Select the workflow you want to run
3. Click **Run workflow** button
4. Fill in any required inputs
5. Click **Run workflow** to start

## Workflow Details

### Initial Deployment

**File:** `deploy-initial.yml`

**Inputs:**

- `confirm_initial_setup` - Type "INITIAL" to confirm

**What it does:**

- Installs system dependencies
- Creates FoundryVTT user
- Uploads and installs application
- Configures firewall
- Creates systemd service
- Starts FoundryVTT

**Duration:** ~5-10 minutes

### Update/Redeploy

**File:** `deploy-update.yml`

**Inputs:**

- `backup_data` (boolean) - Backup user data before update
- `restart_service` (boolean) - Restart service after update

**What it does:**

- Creates backup (optional)
- Stops service
- Updates application files
- Preserves user data
- Reinstalls dependencies
- Restarts service (optional)

**Duration:** ~3-5 minutes

### Rollback

**File:** `deploy-rollback.yml`

**Inputs:**

- `backup_timestamp` (string) - Timestamp of backup to restore (leave empty to list)

**What it does:**

- Lists available backups OR
- Restores specified backup
- Backs up current data before rollback
- Restarts service

**Duration:** ~2-3 minutes

### Server Management

**File:** `server-management.yml`

**Inputs:**

- `action` (choice) - Action to perform:
  - `status` - Check service and system status
  - `restart` - Restart FoundryVTT service
  - `stop` - Stop service
  - `start` - Start service
  - `logs` - View last 100 log lines
  - `disk-usage` - Check disk space

**Duration:** ~30 seconds - 1 minute

## Common Workflows

### First Time Deployment

```
1. Create Oracle Cloud VM (manual)
2. Configure GitHub Secrets
3. Run: deploy-initial.yml
4. Access: http://YOUR_IP:30000
5. Complete FoundryVTT setup wizard
```

### Regular Update

```
1. Push code changes to GitHub
2. Run: deploy-update.yml
   - ✅ backup_data: true
   - ✅ restart_service: true
3. Verify deployment successful
```

### Emergency Rollback

```
1. Run: deploy-rollback.yml (no timestamp) to list backups
2. Note the timestamp you want to restore
3. Run: deploy-rollback.yml with timestamp
4. Verify service is running
```

### Quick Restart

```
1. Run: server-management.yml
2. Select action: restart
3. Wait for completion
```

## Monitoring Your Deployment

### View Workflow Logs

- Go to **Actions** tab
- Click on the workflow run
- Click on the job to see detailed logs
- Look for ✅ success or ❌ error indicators

### Check Server Status

Run `server-management.yml` with action `status` to see:

- Service status
- Memory usage
- CPU load
- Disk usage
- Network listeners

### View Application Logs

Run `server-management.yml` with action `logs` to see recent FoundryVTT logs

## Troubleshooting

### Workflow fails immediately

**Check:**

- Are GitHub Secrets configured correctly?
- Is the VM running?
- Can GitHub Actions reach your server?

**Test:** Run `server-management.yml` with action `status`

### Deployment succeeds but can't access FoundryVTT

**Check:**

1. Oracle Cloud Security List allows port 30000
2. Ubuntu firewall allows port 30000: `sudo ufw status`
3. Service is running: Check workflow logs or run status check
4. Correct URL: `http://YOUR_IP:30000` (not https)

### Service fails to start

**Check logs:**

- Run `server-management.yml` with action `logs`
- Look for error messages

**Common causes:**

- Port already in use
- Insufficient memory
- Missing dependencies
- File permissions

### Deployment is slow

**Possible causes:**

- Large file transfers
- Slow npm install
- Network issues

**Solutions:**

- Be patient (first deployment takes longer)
- Check workflow logs for progress
- Consider pre-caching dependencies

## Best Practices

### 🔒 Security

- Never commit SSH keys to repository
- Use GitHub Secrets for all sensitive data
- Rotate SSH keys periodically
- Keep system updated

### 💾 Backups

- Always backup before updates (enabled by default)
- Keep at least 3-5 backups
- Test backup restoration periodically
- Monitor backup disk usage

### 🚀 Deployment

- Test in development first
- Deploy during low-traffic times
- Monitor logs after deployment
- Keep rollback option ready

### 📊 Monitoring

- Check server status regularly
- Monitor disk usage
- Review logs for errors
- Watch system resources

## File Structure

```
.github/
├── workflows/
│   ├── deploy-initial.yml      # Initial deployment
│   ├── deploy-update.yml       # Updates/redeployment
│   ├── deploy-rollback.yml     # Backup restoration
│   └── server-management.yml   # Server operations
├── README.md                   # This file
└── SECRETS_TEMPLATE.md        # Secrets configuration guide
```

## Additional Resources

- **Main Documentation:** `../DEPLOYMENT.md`
- **Secrets Setup:** `SECRETS_TEMPLATE.md`
- **Oracle Cloud:** https://docs.oracle.com/en-us/iaas/
- **GitHub Actions:** https://docs.github.com/en/actions
- **FoundryVTT:** https://foundryvtt.com/kb/

## Support

For issues with:

- **Workflows:** Check workflow logs and `DEPLOYMENT.md`
- **Oracle Cloud:** Oracle Cloud documentation
- **FoundryVTT:** FoundryVTT community forums/Discord
- **GitHub Actions:** GitHub Actions documentation

## License

These workflows are provided as-is for deploying FoundryVTT. FoundryVTT itself requires a valid license from Foundry Gaming LLC.
