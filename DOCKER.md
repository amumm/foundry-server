# Docker Deployment Guide for FoundryVTT

This guide explains how to run FoundryVTT using Docker.

## Prerequisites

- Docker and Docker Compose installed
- FoundryVTT application files (this repository)
- Valid FoundryVTT license

## Quick Start

### Using Docker Compose (Recommended)

1. **Build and start the container:**

   ```bash
   docker-compose up -d
   ```

2. **Access FoundryVTT:**
   Open your browser to: `http://localhost:30000`

3. **View logs:**

   ```bash
   docker-compose logs -f
   ```

4. **Stop the container:**
   ```bash
   docker-compose down
   ```

### Using Docker CLI

1. **Build the image:**

   ```bash
   docker build -t foundryvtt:latest .
   ```

2. **Run the container:**

   ```bash
   docker run -d \
     --name foundryvtt \
     -p 30000:30000 \
     -v foundryvtt-data:/data \
     foundryvtt:latest
   ```

3. **Access FoundryVTT:**
   Open your browser to: `http://localhost:30000`

## Configuration

### Ports

- **Default Port:** 30000
- **Change Port:** Modify the port mapping in `docker-compose.yml` or use `-p YOUR_PORT:30000`

### Data Persistence

All FoundryVTT user data (worlds, modules, systems, etc.) is stored in a Docker volume:

- **Volume name:** `foundryvtt-data`
- **Mount point:** `/data` inside the container

To backup your data:

```bash
docker run --rm -v foundryvtt-data:/data -v $(pwd):/backup ubuntu tar czf /backup/foundryvtt-backup.tar.gz /data
```

To restore from backup:

```bash
docker run --rm -v foundryvtt-data:/data -v $(pwd):/backup ubuntu tar xzf /backup/foundryvtt-backup.tar.gz -C /
```

## Deploying to Google Cloud

### Using Google Cloud Run

1. **Tag the image for Google Container Registry:**

   ```bash
   docker tag foundryvtt:latest gcr.io/YOUR_PROJECT_ID/foundryvtt:latest
   ```

2. **Push to GCR:**

   ```bash
   docker push gcr.io/YOUR_PROJECT_ID/foundryvtt:latest
   ```

3. **Deploy to Cloud Run:**

   ```bash
   gcloud run deploy foundryvtt \
     --image gcr.io/YOUR_PROJECT_ID/foundryvtt:latest \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 30000 \
     --memory 2Gi \
     --cpu 2
   ```

   Note: Cloud Run has limitations with persistent storage. Consider using Google Compute Engine for production.

### Using Google Compute Engine with Docker

1. **Create a VM instance:**

   ```bash
   gcloud compute instances create foundryvtt-server \
     --zone=us-central1-a \
     --machine-type=e2-medium \
     --image-family=cos-stable \
     --image-project=cos-cloud \
     --boot-disk-size=50GB \
     --tags=http-server,https-server
   ```

2. **SSH into the instance:**

   ```bash
   gcloud compute ssh foundryvtt-server --zone=us-central1-a
   ```

3. **Copy your Docker files to the instance** (or clone from git)

4. **Run Docker Compose:**

   ```bash
   docker-compose up -d
   ```

5. **Configure firewall rules:**
   ```bash
   gcloud compute firewall-rules create foundryvtt-allow \
     --allow tcp:30000 \
     --source-ranges 0.0.0.0/0 \
     --description "Allow FoundryVTT traffic"
   ```

### Using Google Kubernetes Engine (GKE)

For large-scale or high-availability deployments:

1. **Create a GKE cluster:**

   ```bash
   gcloud container clusters create foundryvtt-cluster \
     --num-nodes=3 \
     --machine-type=e2-medium
   ```

2. **Deploy using kubectl:**
   ```bash
   kubectl create deployment foundryvtt --image=gcr.io/YOUR_PROJECT_ID/foundryvtt:latest
   kubectl expose deployment foundryvtt --type=LoadBalancer --port=30000
   ```

## Environment Variables

- `NODE_ENV` - Set to `production` (default in Dockerfile)
- `FOUNDRY_DATA_PATH` - Automatically set to `/data` via command-line arg

## Troubleshooting

### Container won't start

Check logs:

```bash
docker logs foundryvtt
```

Common issues:

- Port 30000 already in use
- Insufficient memory (recommend at least 2GB)
- File permissions on data volume

### Cannot access the application

1. **Check container is running:**

   ```bash
   docker ps
   ```

2. **Check port binding:**

   ```bash
   docker port foundryvtt
   ```

3. **Test connectivity:**
   ```bash
   curl http://localhost:30000
   ```

### Performance issues

- Increase memory allocation: Add `--memory 4g` to docker run command
- Use faster storage: Consider using a bind mount instead of volume for better I/O performance
- Allocate more CPU: Add `--cpus 2` to docker run command

## Health Checks

The Docker image includes a health check that verifies the web server is responding:

- Interval: 30 seconds
- Timeout: 10 seconds
- Start period: 60 seconds (allows time for startup)
- Retries: 3

Check health status:

```bash
docker inspect foundryvtt | grep -A 10 Health
```

## Updates

To update to a new version:

1. **Pull the latest code:**

   ```bash
   git pull
   ```

2. **Rebuild the image:**

   ```bash
   docker-compose build
   ```

3. **Recreate the container:**
   ```bash
   docker-compose up -d
   ```

Your data will be preserved in the `foundryvtt-data` volume.

## Security Considerations

1. **Use HTTPS:** In production, put FoundryVTT behind a reverse proxy (nginx, Caddy, or Cloud Load Balancer) with SSL/TLS
2. **Set Admin Password:** Configure admin password in FoundryVTT setup
3. **Firewall:** Only expose port 30000 to trusted IP ranges if possible
4. **Regular Backups:** Set up automated backups of the data volume
5. **Keep Updated:** Regularly update the base Node.js image and rebuild

## Support

For issues specific to this Docker setup, check the logs and review the Dockerfile.
For FoundryVTT-specific issues, visit https://foundryvtt.com/

## License

FoundryVTT requires a valid license. The Docker container does not include a license - you must provide your own during initial setup.
