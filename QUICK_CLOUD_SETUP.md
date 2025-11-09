# Quick Cloud Setup Guide

## The Problem

Those connection strings (`postgresql://user:password@host/dbname`) are **placeholders** - they won't work in Cloud Run. You need to set up actual cloud services.

## Quick Solution (Easiest Path)

### Step 1: Set Up Cloud SQL (PostgreSQL)

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

# Create user
gcloud sql users create assessly-user `
    --instance=assessly-db `
    --password=YOUR_PASSWORD

# Get connection name
$connName = gcloud sql instances describe assessly-db --format="value(connectionName)"

# Set DATABASE_URL (Cloud Run uses Unix socket format)
$env:DATABASE_URL = "postgresql://assessly-user:YOUR_PASSWORD@/assessly?host=/cloudsql/$connName"
$env:CLOUD_SQL_INSTANCE = $connName
```

**Note**: The connection string format is different for Cloud Run - it uses Unix sockets (`/cloudsql/...`) not TCP/IP.

### Step 2: Set Up Redis (Easiest: Upstash - Free Tier)

1. **Sign up at Upstash**: https://upstash.com/ (Free tier: 10,000 commands/day)
2. **Create a Redis database**
3. **Copy the connection URL**
4. **Set REDIS_URL**:
   ```powershell
   $env:REDIS_URL = "redis://default:PASSWORD@usw1-xxx.upstash.io:6379/0"
   ```

### Step 3: Set API Keys

```powershell
$env:OPENAI_API_KEY = "sk-..."
$env:NOVITA_API_KEY = "your-novita-key"
```

## Automated Setup (Recommended)

Use the setup script:

```powershell
# Run the automated setup
.\setup-cloud-services.ps1

# This will:
# - Create Cloud SQL instance
# - Create database and user
# - Help you set up Redis (Upstash or Cloud Memorystore)
# - Set all environment variables
```

## Connection String Formats

### ✅ Correct for Cloud Run (Cloud SQL):
```
postgresql://user:password@/dbname?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
```

### ❌ Wrong (Local/External):
```
postgresql://user:password@localhost:5432/dbname
postgresql://user:password@external-ip:5432/dbname
```

### ✅ Correct for Redis (Upstash):
```
redis://default:PASSWORD@usw1-xxx.upstash.io:6379/0
```

### ✅ Correct for Redis (Cloud Memorystore):
```
redis://10.x.x.x:6379/0  # Internal IP only
```

## Complete Example

```powershell
# Project settings
$env:GCP_PROJECT_ID = "healthy-anthem-477622-k7"
$env:GCP_REGION = "us-central1"

# Cloud SQL (after creating instance)
$env:DATABASE_URL = "postgresql://assessly-user:MyPassword123@/assessly?host=/cloudsql/healthy-anthem-477622-k7:us-central1:assessly-db"
$env:CLOUD_SQL_INSTANCE = "healthy-anthem-477622-k7:us-central1:assessly-db"

# Redis (Upstash - get from https://upstash.com/)
$env:REDIS_URL = "redis://default:abc123xyz@usw1-shiny-redis-12345.upstash.io:6379/0"

# API Keys
$env:OPENAI_API_KEY = "sk-proj-..."
$env:NOVITA_API_KEY = "novita-key-..."

# Now deploy
.\deploy-backend.ps1
```

## Cost Estimate

- **Cloud SQL (db-f1-micro)**: ~$7-10/month
- **Upstash Redis (Free tier)**: $0/month (10K commands/day)
- **Cloud Run**: Free tier (2M requests/month)

**Total**: ~$7-10/month to start

## Troubleshooting

### "Connection refused" error
- Make sure you're using the Unix socket format: `?host=/cloudsql/...`
- Add `--add-cloudsql-instances` flag when deploying (script does this automatically)

### "Authentication failed" error
- Check your database username and password
- Verify user exists: `gcloud sql users list --instance=assessly-db`

### Redis connection issues
- Upstash: Make sure you copied the full URL from the Upstash dashboard
- Cloud Memorystore: Must be in the same region as Cloud Run

## Next Steps

1. Run `.\setup-cloud-services.ps1` to set up everything
2. Set your API keys
3. Deploy: `.\deploy-backend.ps1`

See [CLOUD_SETUP.md](./CLOUD_SETUP.md) for detailed instructions.

