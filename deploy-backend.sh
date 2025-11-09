#!/bin/bash

# Deploy Backend to Google Cloud Run

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="assessly-backend"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Deploying backend to Cloud Run...${NC}"

# Check if required environment variables are set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}Warning: DATABASE_URL is not set${NC}"
fi

if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}Warning: OPENAI_API_KEY is not set${NC}"
fi

if [ -z "$NOVITA_API_KEY" ]; then
    echo -e "${YELLOW}Warning: NOVITA_API_KEY is not set${NC}"
fi

# Navigate to backend directory
cd backend

# Build and push image
echo -e "${GREEN}Building Docker image...${NC}"
gcloud builds submit --tag ${IMAGE_NAME}

# Deploy to Cloud Run
echo -e "${GREEN}Deploying to Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
    --image ${IMAGE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --set-env-vars DATABASE_URL="${DATABASE_URL}" \
    --set-env-vars REDIS_URL="${REDIS_URL:-redis://localhost:6379/0}" \
    --set-env-vars OPENAI_API_KEY="${OPENAI_API_KEY}" \
    --set-env-vars GEMINI_API_KEY="${GEMINI_API_KEY:-}" \
    --set-env-vars NOVITA_API_KEY="${NOVITA_API_KEY}" \
    --set-env-vars NOVITA_BASE_URL="${NOVITA_BASE_URL:-https://api.novita.ai/openai}" \
    --set-env-vars DEBUG="${DEBUG:-false}" \
    --set-env-vars UPLOAD_DIR="/tmp/uploads" \
    --set-env-vars MAX_FILE_SIZE="${MAX_FILE_SIZE:-10485760}" \
    --set-env-vars ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-*}" \
    --memory=2Gi \
    --cpu=2 \
    --timeout=300 \
    --max-instances=10 \
    --min-instances=0

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --format 'value(status.url)')

echo -e "${GREEN}Backend deployed successfully!${NC}"
echo -e "${GREEN}Service URL: ${SERVICE_URL}${NC}"
echo -e "${GREEN}Export this URL for frontend deployment:${NC}"
echo "export BACKEND_URL=${SERVICE_URL}"

cd ..

