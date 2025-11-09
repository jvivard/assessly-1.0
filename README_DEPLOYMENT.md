# Google Cloud Run Deployment

This project is configured for deployment to Google Cloud Run. The application consists of two services:

- **Frontend**: Next.js application
- **Backend**: FastAPI Python application

## Quick Start

### Prerequisites

1. Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. Install [Docker](https://docs.docker.com/get-docker/)
3. Authenticate with Google Cloud: `gcloud auth login`
4. Set your project: `gcloud config set project YOUR_PROJECT_ID`

### Windows Users

Use the PowerShell scripts:
```powershell
# Set environment variables
$env:GCP_PROJECT_ID = "your-project-id"
$env:GCP_REGION = "us-central1"
$env:DATABASE_URL = "postgresql://..."
$env:OPENAI_API_KEY = "sk-..."
$env:NOVITA_API_KEY = "your-key"

# Deploy backend
.\deploy-backend.ps1

# Set backend URL
$env:BACKEND_URL = "https://assessly-backend-xxx.a.run.app"

# Deploy frontend
.\deploy-frontend.ps1
```

### Linux/Mac Users

Use the bash scripts:
```bash
# Set environment variables
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
export DATABASE_URL="postgresql://..."
export OPENAI_API_KEY="sk-..."
export NOVITA_API_KEY="your-key"

# Deploy backend
chmod +x deploy-backend.sh
./deploy-backend.sh

# Set backend URL
export BACKEND_URL="https://assessly-backend-xxx.a.run.app"

# Deploy frontend
chmod +x deploy-frontend.sh
./deploy-frontend.sh
```

## Files Created

- `Dockerfile` - Frontend container configuration
- `backend/Dockerfile` - Backend container configuration (updated)
- `.dockerignore` - Frontend build exclusions
- `deploy-backend.sh` / `deploy-backend.ps1` - Backend deployment scripts
- `deploy-frontend.sh` / `deploy-frontend.ps1` - Frontend deployment scripts
- `cloud-run-deploy.sh` - Combined deployment script
- `cloudbuild.yaml` - CI/CD configuration for Cloud Build
- `DEPLOYMENT.md` - Detailed deployment guide
- `QUICK_DEPLOY.md` - Quick reference guide

## Configuration Changes

### Frontend (`next.config.mjs`)
- Added `output: 'standalone'` for optimized Cloud Run deployment

### Backend (`backend/Dockerfile`)
- Updated to use `PORT` environment variable (required by Cloud Run)
- Default port set to 8000 for local development

## Environment Variables

### Backend Required
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key
- `NOVITA_API_KEY` - Novita API key

### Backend Optional
- `REDIS_URL` - Redis connection string (default: redis://localhost:6379/0)
- `GEMINI_API_KEY` - Google Gemini API key
- `DEBUG` - Debug mode (default: false)
- `ALLOWED_ORIGINS` - CORS allowed origins

### Frontend Required
- `NEXT_PUBLIC_API_URL` - Backend service URL
- `NEXT_PUBLIC_WS_URL` - WebSocket URL (usually backend URL with ws:// or wss://)

## Deployment Steps

1. **Set up GCP project and enable APIs**
2. **Set up Cloud SQL database** (if using managed database)
3. **Set up Redis** (Cloud Memorystore or managed service)
4. **Deploy backend** with environment variables
5. **Deploy frontend** with backend URL
6. **Update CORS** settings in backend with frontend URL

## Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Comprehensive deployment guide
- [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) - Quick start guide

## Support

For issues or questions, refer to the troubleshooting section in [DEPLOYMENT.md](./DEPLOYMENT.md).

