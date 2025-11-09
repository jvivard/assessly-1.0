# Setting Up Cloud Services for Cloud Run

This guide shows you how to set up the required cloud services (PostgreSQL and Redis) for your Cloud Run deployment.

## Overview

You need:
1. **Cloud SQL** (PostgreSQL) - For your database
2. **Redis** - For caching (Cloud Memorystore or managed service)

## Option 1: Cloud SQL + Cloud Memorystore (Fully Managed)

### Step 1: Create Cloud SQL PostgreSQL Instance

```powershell
# Set your project
$env:GCP_PROJECT_ID = "healthy-anthem-477622-k7"
$env:GCP_REGION = "us-central1"

# Create Cloud SQL instance
gcloud sql instances create assessly-db `
    --database-version=POSTGRES_15 `
    --tier=db-f1-micro `
    --region=$env:GCP_REGION `
    --root-password=YOUR_SECURE_PASSWORD

# Create database
gcloud sql databases create assessly `
    --instance=assessly-db

# Create database user
gcloud sql users create assessly-user `
    --instance=assessly-db `
    --password=YOUR_USER_PASSWORD
```

### Step 2: Get Connection String

```powershell
# Get connection name
$connName = gcloud sql instances describe assessly-db --format="value(connectionName)"
Write-Host "Connection name: $connName"

# Your DATABASE_URL will be:
# postgresql://assessly-user:PASSWORD@/assessly?host=/cloudsql/PROJECT_ID:REGION:assessly-db
```

**Important**: For Cloud Run, use Unix socket connection:
```
postgresql://assessly-user:YOUR_PASSWORD@/assessly?host=/cloudsql/healthy-anthem-477622-k7:us-central1:assessly-db
```

### Step 3: Create Cloud Memorystore Redis Instance

```powershell
# Create Redis instance
gcloud redis instances create assessly-redis `
    --size=1 `
    --region=$env:GCP_REGION `
    --redis-version=redis_7_0 `
    --tier=basic

# Get Redis host (wait a few minutes for instance to be ready)
$redisHost = gcloud redis instances describe assessly-redis --region=$env:GCP_REGION --format="value(host)"
Write-Host "Redis host: $redisHost"
```

**Note**: Cloud Memorystore Redis uses internal IP only. Your REDIS_URL will be:
```
redis://10.x.x.x:6379/0
```

## Option 2: Cloud SQL + Managed Redis Service (Easier Setup)

If Cloud Memorystore is too expensive or complex, use a managed Redis service:

### Recommended: Upstash Redis (Free Tier Available)

1. **Sign up**: https://upstash.com/
2. **Create Redis database**
3. **Get connection URL**: `redis://default:PASSWORD@HOST:PORT`

**REDIS_URL example**:
```
redis://default:abc123@usw1-xxx.upstash.io:6379/0
```

### Alternative: Redis Cloud

1. **Sign up**: https://redis.com/cloud/
2. **Create database**
3. **Get connection URL**

## Option 3: Use Existing Database/Redis

If you already have PostgreSQL and Redis:

```powershell
# For external PostgreSQL (must allow Cloud Run IPs)
$env:DATABASE_URL = "postgresql://user:password@YOUR_HOST:5432/dbname"

# For external Redis (must allow Cloud Run IPs)
$env:REDIS_URL = "redis://YOUR_REDIS_HOST:6379/0"
```

**Note**: Make sure your database/Redis allows connections from Cloud Run IPs or use a VPN.

## Complete Setup Script (PowerShell)

```powershell
# Set your project
$env:GCP_PROJECT_ID = "healthy-anthem-477622-k7"
$env:GCP_REGION = "us-central1"

# 1. Create Cloud SQL instance
Write-Host "Creating Cloud SQL instance..." -ForegroundColor Green
gcloud sql instances create assessly-db `
    --database-version=POSTGRES_15 `
    --tier=db-f1-micro `
    --region=$env:GCP_REGION `
    --root-password=CHANGE_THIS_PASSWORD

# 2. Create database
Write-Host "Creating database..." -ForegroundColor Green
gcloud sql databases create assessly `
    --instance=assessly-db

# 3. Create database user
Write-Host "Creating database user..." -ForegroundColor Green
gcloud sql users create assessly-user `
    --instance=assessly-db `
    --password=CHANGE_THIS_PASSWORD

# 4. Get connection name
$connName = gcloud sql instances describe assessly-db --format="value(connectionName)"
Write-Host "Connection name: $connName" -ForegroundColor Yellow

# 5. Set DATABASE_URL for Cloud Run (Unix socket)
$dbPassword = "CHANGE_THIS_PASSWORD"
$env:DATABASE_URL = "postgresql://assessly-user:$dbPassword@/assessly?host=/cloudsql/$connName"
Write-Host "DATABASE_URL: $env:DATABASE_URL" -ForegroundColor Green

# 6. Create Redis (Cloud Memorystore) - Optional, can use Upstash instead
Write-Host "Creating Redis instance (this may take 10-15 minutes)..." -ForegroundColor Green
gcloud redis instances create assessly-redis `
    --size=1 `
    --region=$env:GCP_REGION `
    --redis-version=redis_7_0 `
    --tier=basic

# Wait for Redis to be ready
Write-Host "Waiting for Redis instance to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# Get Redis host
$redisHost = gcloud redis instances describe assessly-redis --region=$env:GCP_REGION --format="value(host)"
$env:REDIS_URL = "redis://$redisHost:6379/0"
Write-Host "REDIS_URL: $env:REDIS_URL" -ForegroundColor Green

Write-Host "`nSetup complete! Use these environment variables:" -ForegroundColor Green
Write-Host "DATABASE_URL: $env:DATABASE_URL" -ForegroundColor Cyan
Write-Host "REDIS_URL: $env:REDIS_URL" -ForegroundColor Cyan
```

## Environment Variables for Cloud Run

After setup, your environment variables should look like:

### For Cloud SQL (Unix Socket - Recommended for Cloud Run):
```powershell
$env:DATABASE_URL = "postgresql://assessly-user:YOUR_PASSWORD@/assessly?host=/cloudsql/healthy-anthem-477622-k7:us-central1:assessly-db"
```

### For Cloud SQL (Public IP - Less Secure):
```powershell
$env:DATABASE_URL = "postgresql://assessly-user:YOUR_PASSWORD@YOUR_PUBLIC_IP:5432/assessly"
```

### For Cloud Memorystore Redis:
```powershell
$env:REDIS_URL = "redis://10.x.x.x:6379/0"
```

### For Upstash Redis (Recommended for Start):
```powershell
$env:REDIS_URL = "redis://default:YOUR_PASSWORD@usw1-xxx.upstash.io:6379/0"
```

## Quick Start: Use Upstash Redis (Easiest)

1. **Sign up for Upstash**: https://upstash.com/ (Free tier available)
2. **Create Redis database**
3. **Copy connection URL**
4. **Set REDIS_URL**:
   ```powershell
   $env:REDIS_URL = "redis://default:PASSWORD@HOST:PORT"
   ```

## Update Deployment Scripts

When deploying to Cloud Run, make sure to:

1. **Add Cloud SQL connection** to backend service:
   ```powershell
   gcloud run deploy assessly-backend `
       --add-cloudsql-instances healthy-anthem-477622-k7:us-central1:assessly-db `
       --set-env-vars DATABASE_URL="$env:DATABASE_URL" `
       ...
   ```

2. **Use Unix socket** for Cloud SQL (more secure, faster)

3. **For Redis**: 
   - Cloud Memorystore: Works automatically (same VPC)
   - Upstash/External: Use public connection URL

## Cost Comparison

### Cloud SQL (db-f1-micro):
- **Cost**: ~$7-10/month
- **Storage**: 10 GB included
- **Pros**: Fully managed, automatic backups
- **Cons**: More expensive than self-hosted

### Cloud Memorystore Redis (basic, 1GB):
- **Cost**: ~$30/month
- **Pros**: Fully managed, high availability
- **Cons**: Expensive for small projects

### Upstash Redis (Free Tier):
- **Cost**: Free (10,000 commands/day)
- **Pros**: Free tier, easy setup
- **Cons**: Limited free tier, external service

**Recommendation**: Start with Cloud SQL + Upstash Redis (free tier), then migrate to Cloud Memorystore if needed.

## Troubleshooting

### Cloud SQL Connection Issues

**Error**: "connection refused"
- **Solution**: Make sure you're using Unix socket format: `postgresql://user:pass@/db?host=/cloudsql/PROJECT:REGION:INSTANCE`
- **Solution**: Add `--add-cloudsql-instances` flag when deploying

**Error**: "authentication failed"
- **Solution**: Check username and password
- **Solution**: Verify user exists: `gcloud sql users list --instance=assessly-db`

### Redis Connection Issues

**Error**: "connection timeout" (Cloud Memorystore)
- **Solution**: Make sure Redis is in the same region as Cloud Run
- **Solution**: Cloud Memorystore uses internal IP only (no public access)

**Error**: "connection refused" (External Redis)
- **Solution**: Make sure Redis allows connections from Cloud Run IPs
- **Solution**: Use Upstash or Redis Cloud (they handle this automatically)

## Next Steps

1. **Set up Cloud SQL**: Use the script above
2. **Set up Redis**: Use Upstash (easiest) or Cloud Memorystore
3. **Update environment variables**: Set DATABASE_URL and REDIS_URL
4. **Deploy**: Run `.\deploy-backend.ps1`

## References

- [Cloud SQL Documentation](https://cloud.google.com/sql/docs/postgres)
- [Cloud Memorystore Documentation](https://cloud.google.com/memorystore/docs/redis)
- [Upstash Redis](https://upstash.com/)
- [Cloud Run Cloud SQL Connection](https://cloud.google.com/run/docs/tutorials/network-filesystems)

