#!/bin/bash

# Deploy Frontend to Google Cloud Run

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="assessly-frontend"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Deploying frontend to Cloud Run...${NC}"

# Check if backend URL is set
if [ -z "$BACKEND_URL" ]; then
    echo -e "${YELLOW}Warning: BACKEND_URL is not set. Frontend may not be able to connect to backend.${NC}"
    echo -e "${YELLOW}Set BACKEND_URL environment variable with your backend service URL.${NC}"
fi

# Set WebSocket URL
if [ -z "$WS_URL" ]; then
    WS_URL="${BACKEND_URL/https/ws}"
fi

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
    --set-env-vars NEXT_PUBLIC_API_URL="${BACKEND_URL}" \
    --set-env-vars NEXT_PUBLIC_WS_URL="${WS_URL}" \
    --memory=1Gi \
    --cpu=1 \
    --timeout=60 \
    --max-instances=10 \
    --min-instances=0

# Get service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --format 'value(status.url)')

echo -e "${GREEN}Frontend deployed successfully!${NC}"
echo -e "${GREEN}Service URL: ${SERVICE_URL}${NC}"
echo -e "${GREEN}Update backend CORS settings with this URL:${NC}"
echo "gcloud run services update assessly-backend --update-env-vars ALLOWED_ORIGINS=${SERVICE_URL}"

