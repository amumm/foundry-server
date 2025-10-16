# GitHub Secrets Configuration Template

This document lists all the secrets and variables you need to configure for the GitHub Actions workflows.

## Required Secrets

Configure these in your GitHub repository: **Settings → Secrets and variables → Actions → Secrets**

### ORACLE_SSH_PRIVATE_KEY

**Description:** The private SSH key for connecting to your Oracle Cloud VM

**How to get it:**

1. When creating your Oracle Cloud compute instance, download the SSH key pair
2. Open the private key file (usually ends in `.key`)
3. Copy the entire contents (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`)
4. Paste into GitHub Secret

**Example format:**

```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdef...
[many lines of random characters]
...xyz123456789
-----END RSA PRIVATE KEY-----
```

### ORACLE_HOST

**Description:** The public IP address of your Oracle Cloud VM

**How to get it:**

1. Go to Oracle Cloud Console
2. Navigate to **Compute → Instances**
3. Click on your instance
4. Copy the **Public IP address**

**Example:**

```
123.45.67.89
```

### ORACLE_USER

**Description:** The SSH username for your Oracle Cloud VM

**Common values:**

- `ubuntu` - for Ubuntu images
- `opc` - for Oracle Linux images

**How to determine:**

- Check the instance details in Oracle Cloud Console
- Or try connecting via SSH with common usernames

**Example:**

```
ubuntu
```

## Optional Variables

Configure these in: **Settings → Secrets and variables → Actions → Variables**

### FOUNDRY_PORT

**Description:** Port FoundryVTT listens on

**Default:** `30000`

**When to change:** If you want to use a different port

### FOUNDRY_DATA_PATH

**Description:** Path where FoundryVTT stores user data

**Default:** `/opt/foundryvtt/data`

**When to change:** If you want to use a different data directory

## Security Checklist

Before deploying, ensure:

- [ ] SSH private key is stored ONLY in GitHub Secrets (never committed to code)
- [ ] Oracle Cloud Security List allows:
  - [ ] Port 22 (SSH) from GitHub Actions IPs
  - [ ] Port 30000 (or your custom port) from 0.0.0.0/0
- [ ] VM instance is running and accessible
- [ ] You have sudo access on the VM
- [ ] Repository secrets are set correctly (no typos)

## Testing Your Configuration

After setting up secrets, test with:

1. Run the **Server Management** workflow with action: `status`
2. If successful, your secrets are configured correctly
3. If it fails, check the error message for which secret is incorrect

## Rotating Secrets

To rotate your SSH key:

1. Generate new key pair in Oracle Cloud:

   ```bash
   ssh-keygen -t rsa -b 4096 -f oracle_new_key
   ```

2. Add new public key to VM:

   ```bash
   ssh -i old_key ubuntu@YOUR_IP "echo 'NEW_PUBLIC_KEY' >> ~/.ssh/authorized_keys"
   ```

3. Update `ORACLE_SSH_PRIVATE_KEY` in GitHub Secrets

4. Test connection with new key

5. Remove old public key from VM:
   ```bash
   ssh -i new_key ubuntu@YOUR_IP
   # Edit ~/.ssh/authorized_keys and remove old key
   ```

## Troubleshooting

### "Permission denied (publickey)"

**Cause:** SSH key is incorrect or malformed

**Solution:**

- Ensure you copied the ENTIRE private key including header/footer
- Check for extra spaces or line breaks
- Verify you're using the private key (not public key)

### "Connection timed out"

**Cause:** Cannot reach the server

**Solution:**

- Verify `ORACLE_HOST` is correct
- Check VM is running in Oracle Cloud Console
- Verify Oracle Cloud Security List allows SSH (port 22)

### "Host key verification failed"

**Cause:** Server host key has changed

**Solution:**

- This is rare with static IPs
- May need to update workflow to accept new host key
- Verify you're connecting to the correct server

## Need Help?

Refer to `DEPLOYMENT.md` for complete setup instructions.
