# Deployment Changelog

Track your deployments and changes to help with troubleshooting and rollbacks.

## Template

```markdown
## [Version/Date] - YYYY-MM-DD

### Changes

- What was changed
- New features
- Bug fixes

### Deployment

- **Workflow**: Name of workflow used
- **Duration**: How long it took
- **Backup Created**: Yes/No
- **Issues**: Any problems encountered

### Performance

- **Status**: ✅ Success / ⚠️ Issues / ❌ Failed
- **Players**: Number of active players
- **Load**: Server load after deployment

### Rollback Info

- **Backup Timestamp**: YYYYMMDD-HHMMSS (if applicable)
```

---

## Example Entries

## [Initial Deployment] - 2024-10-16

### Changes

- Initial deployment of FoundryVTT v13.350.0
- Configured systemd service
- Set up automated backups

### Deployment

- **Workflow**: deploy-initial.yml
- **Duration**: 8 minutes
- **Backup Created**: N/A (initial deployment)
- **Issues**: None

### Performance

- **Status**: ✅ Success
- **Players**: 0 (setup phase)
- **Load**: 0.05

### Notes

- Server accessible at http://123.45.67.89:30000
- License key activated successfully
- First world created: "Dragon Campaign"

---

## [Update: Performance Fixes] - 2024-10-23

### Changes

- Updated Node.js dependencies
- Fixed memory leak in combat tracker
- Added compression middleware

### Deployment

- **Workflow**: deploy-update.yml
- **Duration**: 4 minutes
- **Backup Created**: Yes (backup-20241023-140522)
- **Issues**: None

### Performance

- **Status**: ✅ Success
- **Players**: 5 concurrent
- **Load**: 0.15 (improved from 0.35)

### Notes

- Noticeably faster page loads
- Memory usage reduced by ~200MB
- All players reported smooth session

---

## [Rollback: UI Update] - 2024-11-01

### Changes

- Rolled back UI update that caused display issues
- Restored from backup-20241028-183045

### Deployment

- **Workflow**: deploy-rollback.yml
- **Duration**: 3 minutes
- **Backup Created**: Yes (before-rollback-20241101-091234)
- **Issues**: UI was broken on mobile devices

### Performance

- **Status**: ✅ Success (after rollback)
- **Players**: 6 concurrent
- **Load**: 0.12

### Notes

- Original UI update broke mobile layout
- Rollback restored full functionality
- Will fix UI issues before redeploying

---

## Your Deployment History

Start tracking your deployments below:

---

## [Initial Setup] - YYYY-MM-DD

### Changes

-

### Deployment

- **Workflow**:
- **Duration**:
- **Backup Created**:
- **Issues**:

### Performance

- **Status**:
- **Players**:
- **Load**:

### Notes

- ***
