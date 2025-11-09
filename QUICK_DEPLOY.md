# Quick Start: Deploy to Google Cloud Run

This is a quick reference guide for deploying the Assessly Dashboard to Google Cloud Run.

## Prerequisites Checklist

- [ ] Google Cloud Account with billing enabled
- [ ] gcloud CLI installed and authenticated
- [ ] Docker installed
- [ ] API keys ready (OpenAI, Novita, etc.)

## Quick Deploy (5 Steps)

### 1. Set Up Cloud Services (Database & Redis)

**Option A: Automated Setup (Recommended)**
```powershell
# Run the setup script
.\setup-cloud-services.ps1

# This will:
# - Create Cloud SQL PostgreSQL instance
# - Create database and user
# - Set up Redis (Upstash or Cloud Memorystore)
# - Set all environment variables automatically
```

**Option B: Manual Setup**

See [CLOUD_SETUP.md](./CLOUD_SETUP.md) for detailed instructions.

**Quick Setup with Upstash Redis (Easiest):**
```powershell
# 1. Set project and region
$env:GCP_PROJECT_ID = "your-project-id"
$env:GCP_REGION = "us-central1"

# 2. Create Cloud SQL (see CLOUD_SETUP.md for details)
# After creating, set DATABASE_URL:
$env:DATABASE_URL = "postgresql://user:password@/dbname?host=/cloudsql/PROJECT:REGION:INSTANCE"
$env:CLOUD_SQL_INSTANCE = "PROJECT:REGION:INSTANCE"

# 3. Get Redis from Upstash (free tier at https://upstash.com/)
$env:REDIS_URL = "redis://default:PASSWORD@HOST:PORT"

# 4. Set API keys
$env:OPENAI_API_KEY = "sk-..."
$env:NOVITA_API_KEY = "your-novita-key"
```

**Important**: 
- Cloud SQL connection uses Unix socket format for Cloud Run
- Use Upstash Redis for easiest setup (free tier available)
- See [CLOUD_SETUP.md](./CLOUD_SETUP.md) for complete setup guide

**Linux/Mac (Bash):**
```bash
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
export DATABASE_URL="postgresql://user:password@host/dbname"
export REDIS_URL="redis://your-redis-host:6379/0"
export OPENAI_API_KEY="sk-..."
export NOVITA_API_KEY="your-novita-key"
```

### 2. Enable APIs

```bash
gcloud services enable cloudbuild.googleapis.com run.googleapis.com containerregistry.googleapis.com
```

### 3. Deploy Backend

**Windows PowerShell:**
```powershell
# Use the PowerShell script
.\deploy-backend.ps1

# Or manually:
cd backend
gcloud builds submit --tag gcr.io/$env:GCP_PROJECT_ID/assessly-backend
gcloud run deploy assessly-backend `
    --image gcr.io/$env:GCP_PROJECT_ID/assessly-backend `
    --platform managed `
    --region $env:GCP_REGION `
    --allow-unauthenticated `
    --set-env-vars DATABASE_URL="$env:DATABASE_URL",REDIS_URL="$env:REDIS_URL",OPENAI_API_KEY="$env:OPENAI_API_KEY",NOVITA_API_KEY="$env:NOVITA_API_KEY" `
    --memory=2Gi --cpu=2
$env:BACKEND_URL = (gcloud run services describe assessly-backend --region $env:GCP_REGION --format 'value(status.url)')
cd ..
```

**Linux/Mac (Bash):**
```bash
cd backend
chmod +x ../deploy-backend.sh
../deploy-backend.sh
cd ..

# Or manually:
cd backend
gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/assessly-backend
gcloud run deploy assessly-backend \
    --image gcr.io/$GCP_PROJECT_ID/assessly-backend \
    --platform managed \
    --region $GCP_REGION \
    --allow-unauthenticated \
    --set-env-vars DATABASE_URL="$DATABASE_URL",REDIS_URL="$REDIS_URL",OPENAI_API_KEY="$OPENAI_API_KEY",NOVITA_API_KEY="$NOVITA_API_KEY" \
    --memory=2Gi --cpu=2
export BACKEND_URL=$(gcloud run services describe assessly-backend --region $GCP_REGION --format 'value(status.url)')
cd ..
```

### 4. Deploy Frontend

**Windows PowerShell:**
```powershell
# Use the PowerShell script
.\deploy-frontend.ps1

# Or manually:
gcloud builds submit --tag gcr.io/$env:GCP_PROJECT_ID/assessly-frontend
$wsUrl = $env:BACKEND_URL -replace "https://", "wss://"
gcloud run deploy assessly-frontend `
    --image gcr.io/$env:GCP_PROJECT_ID/assessly-frontend `
    --platform managed `
    --region $env:GCP_REGION `
    --allow-unauthenticated `
    --set-env-vars "NEXT_PUBLIC_API_URL=$env:BACKEND_URL,NEXT_PUBLIC_WS_URL=$wsUrl" `
    --memory=1Gi --cpu=1
```

**Linux/Mac (Bash):**
```bash
chmod +x deploy-frontend.sh
./deploy-frontend.sh

# Or manually:
gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/assessly-frontend
gcloud run deploy assessly-frontend \
    --image gcr.io/$GCP_PROJECT_ID/assessly-frontend \
    --platform managed \
    --region $GCP_REGION \
    --allow-unauthenticated \
    --set-env-vars NEXT_PUBLIC_API_URL="$BACKEND_URL",NEXT_PUBLIC_WS_URL="${BACKEND_URL/https/ws}" \
    --memory=1Gi --cpu=1
```

### 5. Update CORS

**Windows PowerShell:**
```powershell
$env:FRONTEND_URL = (gcloud run services describe assessly-frontend --region $env:GCP_REGION --format 'value(status.url)')
gcloud run services update assessly-backend `
    --region $env:GCP_REGION `
    --update-env-vars ALLOWED_ORIGINS="$env:FRONTEND_URL"
```

**Linux/Mac (Bash):**
```bash
export FRONTEND_URL=$(gcloud run services describe assessly-frontend --region $GCP_REGION --format 'value(status.url)')
gcloud run services update assessly-backend \
    --region $GCP_REGION \
    --update-env-vars ALLOWED_ORIGINS="$FRONTEND_URL"
```

## Verify Deployment

**Windows PowerShell:**
```powershell
# Check backend
Invoke-WebRequest -Uri "$env:BACKEND_URL/health"

# Check frontend
Invoke-WebRequest -Uri "$env:FRONTEND_URL"
```

**Linux/Mac (Bash):**
```bash
# Check backend
curl $BACKEND_URL/health

# Check frontend
curl $FRONTEND_URL
```

## Access Your Application

- Frontend: Use the URL from `$env:FRONTEND_URL` (PowerShell) or `$FRONTEND_URL` (Bash)
- Backend API: Use the URL from `$env:BACKEND_URL` (PowerShell) or `$BACKEND_URL` (Bash)
- API Docs: `{BACKEND_URL}/docs`

## Troubleshooting

### View Logs

**Windows PowerShell:**
```powershell
gcloud run services logs read assessly-backend --region $env:GCP_REGION
gcloud run services logs read assessly-frontend --region $env:GCP_REGION
```

**Linux/Mac (Bash):**
```bash
gcloud run services logs read assessly-backend --region $GCP_REGION
gcloud run services logs read assessly-frontend --region $GCP_REGION
```

### Update Environment Variables

**Windows PowerShell:**
```powershell
gcloud run services update assessly-backend `
    --region $env:GCP_REGION `
    --update-env-vars KEY=value
```

**Linux/Mac (Bash):**
```bash
gcloud run services update assessly-backend \
    --region $GCP_REGION \
    --update-env-vars KEY=value
```

### Redeploy After Code Changes

**Windows PowerShell:**
```powershell
cd backend
gcloud builds submit --tag gcr.io/$env:GCP_PROJECT_ID/assessly-backend
gcloud run deploy assessly-backend --image gcr.io/$env:GCP_PROJECT_ID/assessly-backend --region $env:GCP_REGION
cd ..
```

**Linux/Mac (Bash):**
```bash
cd backend && gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/assessly-backend && \
gcloud run deploy assessly-backend --image gcr.io/$GCP_PROJECT_ID/assessly-backend --region $GCP_REGION
```

## Next Steps

- Set up Cloud SQL for database
- Configure Redis (Memorystore or managed service)
- Set up custom domain
- Configure CI/CD pipeline
- Set up monitoring and alerts

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

