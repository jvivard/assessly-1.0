# Google Cloud Run Deployment Guide

This guide will walk you through deploying the Assessly Dashboard to Google Cloud Run.

## Prerequisites

1. **Google Cloud Account**: Sign up at [cloud.google.com](https://cloud.google.com)
2. **Google Cloud SDK**: Install the [gcloud CLI](https://cloud.google.com/sdk/docs/install)
3. **Docker**: Install [Docker](https://docs.docker.com/get-docker/)
4. **Billing Enabled**: Enable billing for your GCP project

## Architecture

This application consists of two services:
- **Frontend**: Next.js application (served on port 3000)
- **Backend**: FastAPI application (served on port 8000)

Both services will be deployed as separate Cloud Run services.

## Step 1: Initial Setup

### 1.1 Create a GCP Project

```bash
# Set your project ID
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"  # or your preferred region

# Create a new project (or use existing)
gcloud projects create ${GCP_PROJECT_ID}

# Set as default project
gcloud config set project ${GCP_PROJECT_ID}

# Enable billing (replace BILLING_ACCOUNT_ID with your billing account)
gcloud beta billing projects link ${GCP_PROJECT_ID} --billing-account=BILLING_ACCOUNT_ID
```

### 1.2 Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable sqladmin.googleapis.com  # For Cloud SQL if needed
```

### 1.3 Authenticate Docker

```bash
gcloud auth configure-docker
```

## Step 2: Set Up Cloud SQL Database (PostgreSQL)

### 2.1 Create Cloud SQL Instance

```bash
gcloud sql instances create assessly-db \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=${GCP_REGION} \
    --root-password=YOUR_ROOT_PASSWORD
```

### 2.2 Create Database

```bash
gcloud sql databases create assessly \
    --instance=assessly-db
```

### 2.3 Get Connection String

```bash
# Get the connection name
gcloud sql instances describe assessly-db --format="value(connectionName)"

# The connection string will be:
# PROJECT_ID:REGION:assessly-db
```

### 2.4 Create Database User

```bash
gcloud sql users create assessly-user \
    --instance=assessly-db \
    --password=YOUR_USER_PASSWORD
```

Your `DATABASE_URL` will be:
```
postgresql://assessly-user:YOUR_USER_PASSWORD@/assessly?host=/cloudsql/PROJECT_ID:REGION:assessly-db
```

## Step 3: Set Up Redis (Optional - Use Cloud Memorystore)

### Option A: Use Cloud Memorystore (Recommended)

```bash
# Create Redis instance
gcloud redis instances create assessly-redis \
    --size=1 \
    --region=${GCP_REGION} \
    --redis-version=redis_7_0
```

### Option B: Use Managed Redis Service

You can also use services like:
- [Redis Cloud](https://redis.com/cloud/)
- [Upstash Redis](https://upstash.com/)
- [Memorystore](https://cloud.google.com/memorystore/docs/redis)

## Step 4: Configure Environment Variables

### 4.1 Backend Environment Variables

Create a file `backend/.env.cloudrun` with the following variables:

```env
# Database
DATABASE_URL=postgresql://assessly-user:PASSWORD@/assessly?host=/cloudsql/PROJECT_ID:REGION:assessly-db

# Redis
REDIS_URL=redis://YOUR_REDIS_HOST:6379/0

# API Keys
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key  # Optional
NOVITA_API_KEY=your_novita_api_key
NOVITA_BASE_URL=https://api.novita.ai/openai

# Application Settings
DEBUG=false
UPLOAD_DIR=/tmp/uploads
MAX_FILE_SIZE=10485760

# CORS (will be set to frontend URL after deployment)
ALLOWED_ORIGINS=https://assessly-frontend-PROJECT_ID.a.run.app
```

### 4.2 Frontend Environment Variables

The frontend will need:
- `NEXT_PUBLIC_API_URL`: Backend service URL (set after backend deployment)
- `NEXT_PUBLIC_WS_URL`: WebSocket URL (set after backend deployment)

## Step 5: Deploy Backend

### 5.1 Build and Push Backend Image

```bash
cd backend

# Build and push to Container Registry
gcloud builds submit --tag gcr.io/${GCP_PROJECT_ID}/assessly-backend
```

### 5.2 Deploy Backend to Cloud Run

```bash
gcloud run deploy assessly-backend \
    --image gcr.io/${GCP_PROJECT_ID}/assessly-backend \
    --platform managed \
    --region ${GCP_REGION} \
    --allow-unauthenticated \
    --add-cloudsql-instances ${GCP_PROJECT_ID}:${GCP_REGION}:assessly-db \
    --set-env-vars DATABASE_URL="postgresql://assessly-user:PASSWORD@/assessly?host=/cloudsql/${GCP_PROJECT_ID}:${GCP_REGION}:assessly-db" \
    --set-env-vars REDIS_URL="redis://YOUR_REDIS_HOST:6379/0" \
    --set-env-vars OPENAI_API_KEY="your_openai_api_key" \
    --set-env-vars NOVITA_API_KEY="your_novita_api_key" \
    --set-env-vars DEBUG="false" \
    --set-env-vars UPLOAD_DIR="/tmp/uploads" \
    --memory=2Gi \
    --cpu=2 \
    --timeout=300 \
    --max-instances=10 \
    --min-instances=0
```

### 5.3 Get Backend URL

```bash
BACKEND_URL=$(gcloud run services describe assessly-backend \
    --platform managed \
    --region ${GCP_REGION} \
    --format 'value(status.url)')

echo "Backend URL: ${BACKEND_URL}"
```

## Step 6: Deploy Frontend

### 6.1 Update Frontend Configuration

Update `lib/api-config.ts` or set environment variables to point to your backend URL.

### 6.2 Build and Push Frontend Image

```bash
# From project root
gcloud builds submit --tag gcr.io/${GCP_PROJECT_ID}/assessly-frontend
```

### 6.3 Deploy Frontend to Cloud Run

```bash
gcloud run deploy assessly-frontend \
    --image gcr.io/${GCP_PROJECT_ID}/assessly-frontend \
    --platform managed \
    --region ${GCP_REGION} \
    --allow-unauthenticated \
    --set-env-vars NEXT_PUBLIC_API_URL="${BACKEND_URL}" \
    --set-env-vars NEXT_PUBLIC_WS_URL="${BACKEND_URL/https/ws}" \
    --memory=1Gi \
    --cpu=1 \
    --timeout=60 \
    --max-instances=10 \
    --min-instances=0
```

### 6.4 Get Frontend URL

```bash
FRONTEND_URL=$(gcloud run services describe assessly-frontend \
    --platform managed \
    --region ${GCP_REGION} \
    --format 'value(status.url)')

echo "Frontend URL: ${FRONTEND_URL}"
```

## Step 7: Update CORS Settings

After deploying the frontend, update the backend's CORS settings:

```bash
gcloud run services update assessly-backend \
    --platform managed \
    --region ${GCP_REGION} \
    --update-env-vars ALLOWED_ORIGINS="${FRONTEND_URL}"
```

## Step 8: Set Up File Storage (Optional)

For persistent file storage, consider using:

1. **Cloud Storage**: For file uploads
2. **Cloud SQL**: For database
3. **Persistent Volumes**: For temporary files (not recommended for Cloud Run)

### Using Cloud Storage

```bash
# Create a bucket
gsutil mb -p ${GCP_PROJECT_ID} -l ${GCP_REGION} gs://assessly-uploads

# Update your backend to use Cloud Storage instead of local storage
```

## Step 9: Run Database Migrations

```bash
# Connect to Cloud Run service and run migrations
gcloud run services update assessly-backend \
    --platform managed \
    --region ${GCP_REGION} \
    --command "alembic" \
    --args "upgrade head"
```

Or create a migration job:

```bash
gcloud run jobs create assessly-migrate \
    --image gcr.io/${GCP_PROJECT_ID}/assessly-backend \
    --region ${GCP_REGION} \
    --set-env-vars DATABASE_URL="..." \
    --command "alembic" \
    --args "upgrade head"
```

## Step 10: Monitor and Debug

### View Logs

```bash
# Backend logs
gcloud run services logs read assessly-backend --region ${GCP_REGION}

# Frontend logs
gcloud run services logs read assessly-frontend --region ${GCP_REGION}
```

### Monitor Services

```bash
# List services
gcloud run services list --region ${GCP_REGION}

# Describe service
gcloud run services describe assessly-backend --region ${GCP_REGION}
```

## Using the Deployment Script

For convenience, you can use the provided deployment script:

```bash
# Set environment variables
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
export DATABASE_URL="..."
export REDIS_URL="..."
export OPENAI_API_KEY="..."
export NOVITA_API_KEY="..."

# Make script executable
chmod +x cloud-run-deploy.sh

# Run deployment
./cloud-run-deploy.sh
```

## Troubleshooting

### Common Issues

1. **Port Not Listening**: Ensure your application listens on `0.0.0.0` and uses the `PORT` environment variable
2. **Database Connection**: Verify Cloud SQL proxy connection string format
3. **CORS Errors**: Check that `ALLOWED_ORIGINS` includes your frontend URL
4. **Memory Issues**: Increase memory allocation if you see OOM errors
5. **Timeout Issues**: Increase timeout for long-running requests

### Debugging

```bash
# Check service status
gcloud run services describe SERVICE_NAME --region ${GCP_REGION}

# View recent logs
gcloud run services logs read SERVICE_NAME --region ${GCP_REGION} --limit 50

# Test locally with Cloud SQL proxy
cloud-sql-proxy PROJECT_ID:REGION:INSTANCE_NAME
```

## Cost Optimization

1. **Set min-instances to 0**: Services scale to zero when not in use
2. **Use appropriate instance sizes**: Start with smaller instances and scale up as needed
3. **Enable request-based pricing**: Pay only for requests processed
4. **Use Cloud SQL with appropriate tier**: Choose the right database instance size

## Security Best Practices

1. **Use Secret Manager**: Store sensitive data in [Secret Manager](https://cloud.google.com/secret-manager)
2. **Enable IAM**: Restrict access to services using IAM roles
3. **Use VPC**: Connect services through VPC for better security
4. **Enable SSL**: Cloud Run automatically provides SSL certificates

## Next Steps

1. Set up custom domain mapping
2. Configure CDN for static assets
3. Set up monitoring and alerting
4. Configure auto-scaling policies
5. Set up CI/CD pipeline

## Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)
- [Container Registry Documentation](https://cloud.google.com/container-registry/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)

