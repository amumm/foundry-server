# 🎉 GitHub Actions Setup Complete!

Your FoundryVTT repository is now configured with automated deployment workflows for Oracle Cloud!

## 📦 What Was Created

### GitHub Actions Workflows (`.github/workflows/`)

| File                      | Purpose                     | Usage                        |
| ------------------------- | --------------------------- | ---------------------------- |
| **deploy-initial.yml**    | First-time server setup     | Run once on fresh VM         |
| **deploy-update.yml**     | Code updates & redeployment | Run after code changes       |
| **deploy-rollback.yml**   | Restore from backups        | Run when rollback needed     |
| **server-management.yml** | Server operations           | Restart, logs, status checks |

### Documentation Files

| File                                | Contents                            |
| ----------------------------------- | ----------------------------------- |
| **QUICKSTART.md**                   | 30-minute setup guide (start here!) |
| **DEPLOYMENT.md**                   | Complete deployment documentation   |
| **.github/README.md**               | Workflows overview and usage        |
| **.github/SECRETS_TEMPLATE.md**     | GitHub Secrets configuration guide  |
| **.github/DEPLOYMENT_CHANGELOG.md** | Template for tracking deployments   |

### Utility Files

| File                                  | Purpose                            |
| ------------------------------------- | ---------------------------------- |
| **.github/scripts/validate-setup.sh** | Validates GitHub Secrets setup     |
| **.gitignore**                        | Prevents committing sensitive data |

## 🚀 Next Steps

### 1. Complete Oracle Cloud Setup (if not done)

```bash
# Manual steps required:
- Create Oracle Cloud account
- Create VM instance (Ubuntu 22.04)
- Configure Security List (port 30000)
- Save SSH private key
- Note public IP address
```

See **QUICKSTART.md** for detailed instructions.

### 2. Configure GitHub Secrets

You need to add 3 secrets to your GitHub repository:

```bash
# Go to: Settings → Secrets and variables → Actions

Required Secrets:
- ORACLE_SSH_PRIVATE_KEY  (Your SSH private key content)
- ORACLE_HOST             (VM public IP address)
- ORACLE_USER             (Usually "ubuntu")
```

**Detailed guide**: `.github/SECRETS_TEMPLATE.md`

### 3. Validate Your Setup (Optional but Recommended)

```bash
# Run the validation script
bash .github/scripts/validate-setup.sh
```

This will check:

- ✅ GitHub CLI installation
- ✅ GitHub Secrets configuration
- ✅ Workflow files existence
- ✅ Documentation presence

### 4. Run Initial Deployment

1. Push this code to GitHub (if not already done):

   ```bash
   git add .
   git commit -m "Add GitHub Actions deployment workflows"
   git push origin main
   ```

2. Go to **Actions** tab in your GitHub repository

3. Select **"Initial Deployment to Oracle Cloud"**

4. Click **"Run workflow"**

5. Type `INITIAL` in the confirmation field

6. Click **"Run workflow"** button

7. Wait ~5-10 minutes for deployment to complete

### 5. Access Your Server

Once deployment succeeds:

🌐 **Open**: `http://YOUR_PUBLIC_IP:30000`

Complete the FoundryVTT setup wizard:

- Enter license key
- Set admin password
- Create your first world

## 📚 Documentation Quick Reference

**Just getting started?**
→ Read `QUICKSTART.md`

**Need detailed setup instructions?**
→ Read `DEPLOYMENT.md`

**Configuring GitHub Secrets?**
→ Read `.github/SECRETS_TEMPLATE.md`

**Using the workflows?**
→ Read `.github/README.md`

**Want to track deployments?**
→ Use `.github/DEPLOYMENT_CHANGELOG.md`

## 🔧 Common Workflows

### Deploy Code Updates

```
1. Make code changes
2. Commit and push to GitHub
3. Actions → "Update/Redeploy to Oracle Cloud"
4. Enable backup, enable restart
5. Run workflow
```

### Restart Server

```
Actions → "Server Management" → Select "restart"
```

### View Logs

```
Actions → "Server Management" → Select "logs"
```

### Check Server Status

```
Actions → "Server Management" → Select "status"
```

### Rollback Bad Update

```
1. Actions → "Rollback Deployment" (leave timestamp empty)
2. Note the backup timestamp you want
3. Run again with that timestamp
```

## ⚙️ Workflow Features

### Automatic Backups

- Created before every update
- Stored in `/opt/foundryvtt/backups/`
- Keep last 5 backups automatically
- Can restore via rollback workflow

### Zero-Downtime Updates

- Service stopped during update
- User data preserved
- Dependencies updated
- Service restarted
- Automatic verification

### Safety Features

- Confirmation required for initial deployment
- Automatic backups before updates
- Current data backed up before rollback
- Service health checks
- Detailed logging

## 🛠️ Manual Server Access

Need to SSH into your server?

```bash
# Connect
ssh -i /path/to/your-key.key ubuntu@YOUR_PUBLIC_IP

# Common commands
sudo systemctl status foundryvtt    # Check status
sudo systemctl restart foundryvtt   # Restart
sudo journalctl -u foundryvtt -f    # View logs
df -h                                # Check disk space
```

## 🔐 Security Checklist

- [ ] SSH private key stored ONLY in GitHub Secrets
- [ ] Never commit `.key` or `.pem` files to git
- [ ] Strong admin password in FoundryVTT
- [ ] Oracle Cloud Security List properly configured
- [ ] Regular system updates (`sudo apt update && sudo apt upgrade`)
- [ ] Monitor logs for suspicious activity

## 💡 Pro Tips

### Performance

- Use A1.Flex instances for better performance (more RAM)
- Enable compression in FoundryVTT settings
- Optimize assets (use .webp images)
- Monitor disk usage regularly

### Backups

- Keep at least 3-5 backups
- Test restoration occasionally
- Monitor backup disk usage
- Consider external backup storage for important campaigns

### Monitoring

- Check server status regularly
- Review logs after deployments
- Monitor memory and CPU usage
- Watch disk space trends

### Development

- Test changes locally when possible
- Deploy during low-traffic times
- Keep rollback option ready
- Document changes in changelog

## 📊 Workflow Execution Times

Typical execution times:

- **Initial Deployment**: 5-10 minutes
- **Update/Redeploy**: 3-5 minutes
- **Rollback**: 2-3 minutes
- **Server Management**: 30 seconds - 1 minute

## 🆘 Troubleshooting

### Workflow fails with "Permission denied"

→ Check `ORACLE_SSH_PRIVATE_KEY` secret is correct

### Can't access FoundryVTT after deployment

→ Verify Oracle Security List allows port 30000
→ Check Ubuntu firewall: `sudo ufw status`

### Service won't start

→ Check logs: Actions → Server Management → logs
→ Or SSH: `sudo journalctl -u foundryvtt -n 50`

### Out of disk space

→ Clean old backups
→ Check disk usage: Actions → Server Management → disk-usage

### Need more help?

→ Check `DEPLOYMENT.md` troubleshooting section
→ Review workflow logs in GitHub Actions

## 🎯 Success Criteria

You'll know everything is working when:

✅ Workflows run without errors
✅ FoundryVTT is accessible at `http://YOUR_IP:30000`
✅ Service starts automatically after server reboot
✅ Backups are created before updates
✅ Players can connect and play
✅ Updates deploy smoothly

## 📞 Support Resources

**FoundryVTT:**

- Website: https://foundryvtt.com
- Knowledge Base: https://foundryvtt.com/kb/
- Discord: https://discord.gg/foundryvtt
- Reddit: r/FoundryVTT

**Oracle Cloud:**

- Free Tier: https://www.oracle.com/cloud/free/
- Documentation: https://docs.oracle.com/en-us/iaas/
- Support: https://www.oracle.com/cloud/support/

**GitHub Actions:**

- Documentation: https://docs.github.com/en/actions
- Workflow Syntax: https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions

## 🎊 You're All Set!

Your repository is now equipped with:

- ✅ 4 automated deployment workflows
- ✅ Comprehensive documentation
- ✅ Setup validation tools
- ✅ Security best practices
- ✅ Backup and rollback capabilities

**Next**: Follow `QUICKSTART.md` to deploy your server!

---

**Questions or issues?** Check the documentation files or review the workflow logs in GitHub Actions.

**Happy Gaming!** 🎲🎭🗡️
