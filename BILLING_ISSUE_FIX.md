# Fixing Billing Issues for Cloud Run Deployment

## Current Issue

The setup script encountered a billing issue:
```
ERROR: The billing account is not in good standing; therefore no new instance can be created.
```

## Solution Options

### Option 1: Fix Billing Account (Recommended for Cloud SQL)

1. **Go to GCP Billing Console**:
   - https://console.cloud.google.com/billing

2. **Check your billing account**:
   - Make sure billing is enabled for project `healthy-anthem-477622-k7`
   - Verify payment method is valid and up-to-date
   - Check if there are any outstanding payments

3. **Link billing account to project** (if needed):
   ```powershell
   # List billing accounts
   gcloud billing accounts list
   
   # Link billing account to project
   gcloud billing projects link healthy-anthem-477622-k7 --billing-account=BILLING_ACCOUNT_ID
   ```

4. **After fixing billing, run setup again**:
   ```powershell
   .\setup-cloud-services.ps1 -ProjectId "healthy-anthem-477622-k7" -Region "us-central1" -RedisOption "upstash"
   ```

### Option 2: Use External Database Services (No Billing Required for Setup)

If you can't fix billing immediately, use external services:

#### A. Use Supabase (Free Tier Available)

1. **Sign up**: https://supabase.com/
2. **Create a new project**
3. **Get connection string** from Project Settings > Database
4. **Set DATABASE_URL**:
   ```powershell
   $env:DATABASE_URL = "postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"
   ```
5. **Note**: This won't work with Cloud SQL Unix socket, but works with public IP

#### B. Use Neon (Free Tier Available)

1. **Sign up**: https://neon.tech/
2. **Create a database**
3. **Get connection string**
4. **Set DATABASE_URL**:
   ```powershell
   $env:DATABASE_URL = "postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb"
   ```

#### C. Use Railway (Free Trial)

1. **Sign up**: https://railway.app/
2. **Create PostgreSQL service**
3. **Get connection string**
4. **Set DATABASE_URL**

### Option 3: Use Local/Development Database

For development/testing, you can use a local database or Docker:

```powershell
# Run PostgreSQL in Docker
docker run -d --name postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=assessly -p 5432:5432 postgres:15

# Set DATABASE_URL
$env:DATABASE_URL = "postgresql://postgres:password@localhost:5432/assessly"
```

**Note**: This only works for local development, not Cloud Run deployment.

## Redis Setup (No Billing Required)

You can use Upstash Redis (free tier) regardless of GCP billing:

1. **Sign up**: https://upstash.com/
2. **Create Redis database**
3. **Copy connection URL**
4. **Set REDIS_URL**:
   ```powershell
   $env:REDIS_URL = "redis://default:PASSWORD@usw1-xxx.upstash.io:6379/0"
   ```

## Recommended Setup (After Billing is Fixed)

Once billing is fixed, use this setup:

### Cloud SQL + Upstash Redis

```powershell
# Set project
$env:GCP_PROJECT_ID = "healthy-anthem-477622-k7"
$env:GCP_REGION = "us-central1"

# Run setup (will create Cloud SQL)
.\setup-cloud-services.ps1 -ProjectId $env:GCP_PROJECT_ID -Region $env:GCP_REGION -RedisOption "upstash"

# Then set Upstash Redis URL manually
$env:REDIS_URL = "redis://default:PASSWORD@usw1-xxx.upstash.io:6379/0"
```

## Quick Setup Without Cloud SQL

If you need to deploy immediately without fixing billing:

### Step 1: Use External Database

```powershell
# Example with Supabase
$env:DATABASE_URL = "postgresql://postgres:PASSWORD@db.xxx.supabase.co:5432/postgres"
```

### Step 2: Use Upstash Redis

```powershell
$env:REDIS_URL = "redis://default:PASSWORD@usw1-xxx.upstash.io:6379/0"
```

### Step 3: Set API Keys

```powershell
$env:OPENAI_API_KEY = "sk-..."
$env:NOVITA_API_KEY = "your-key"
```

### Step 4: Deploy

```powershell
# Note: You'll need to update the deployment script to not use Cloud SQL Unix socket
# For external databases, use regular connection strings
.\deploy-backend.ps1
```

## Cost Comparison

### Cloud SQL (After Billing Fixed)
- **Cost**: ~$7-10/month (db-f1-micro)
- **Pros**: Fully managed, automatic backups, integrated with Cloud Run
- **Cons**: Requires billing

### External Services (No Billing Required)
- **Supabase**: Free tier (500 MB database, 2 GB bandwidth)
- **Neon**: Free tier (0.5 GB storage)
- **Upstash Redis**: Free tier (10K commands/day)

## Next Steps

1. **Fix billing** (Option 1) - Best for production
2. **Use external services** (Option 2) - Quick solution
3. **Set up Redis** with Upstash (always free tier available)

After choosing an option, update your environment variables and deploy!

## Troubleshooting

### "Billing account not in good standing"
- Check GCP Billing Console
- Update payment method
- Pay any outstanding invoices

### "Permission denied"
- Make sure you have Owner or Editor role on the project
- Check IAM permissions: https://console.cloud.google.com/iam-admin/iam

### "Project not found"
- Verify project ID: `gcloud projects list`
- Make sure project exists and you have access

