#!/bin/bash

# Google Cloud Run Deployment Script for Assessly Dashboard
# This script deploys both frontend and backend services to Cloud Run

set -e

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"
BACKEND_SERVICE_NAME="assessly-backend"
FRONTEND_SERVICE_NAME="assessly-frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting deployment to Google Cloud Run...${NC}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Error: gcloud CLI is not installed. Please install it from https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed. Please install it from https://docs.docker.com/get-docker/${NC}"
    exit 1
fi

# Set the project
echo -e "${YELLOW}Setting GCP project to ${PROJECT_ID}...${NC}"
gcloud config set project ${PROJECT_ID}

# Enable required APIs
echo -e "${YELLOW}Enabling required Google Cloud APIs...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and deploy backend
echo -e "${GREEN}Building and deploying backend...${NC}"
cd backend
gcloud builds submit --tag gcr.io/${PROJECT_ID}/${BACKEND_SERVICE_NAME}
gcloud run deploy ${BACKEND_SERVICE_NAME} \
    --image gcr.io/${PROJECT_ID}/${BACKEND_SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --set-env-vars="DATABASE_URL=${DATABASE_URL},REDIS_URL=${REDIS_URL},OPENAI_API_KEY=${OPENAI_API_KEY},NOVITA_API_KEY=${NOVITA_API_KEY},ALLOWED_ORIGINS=https://${FRONTEND_SERVICE_NAME}-${PROJECT_ID}.a.run.app" \
    --memory=2Gi \
    --cpu=2 \
    --timeout=300 \
    --max-instances=10

BACKEND_URL=$(gcloud run services describe ${BACKEND_SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')
echo -e "${GREEN}Backend deployed at: ${BACKEND_URL}${NC}"

cd ..

# Build and deploy frontend
echo -e "${GREEN}Building and deploying frontend...${NC}"
gcloud builds submit --tag gcr.io/${PROJECT_ID}/${FRONTEND_SERVICE_NAME}
gcloud run deploy ${FRONTEND_SERVICE_NAME} \
    --image gcr.io/${PROJECT_ID}/${FRONTEND_SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --set-env-vars="NEXT_PUBLIC_API_URL=${BACKEND_URL},NEXT_PUBLIC_WS_URL=${BACKEND_URL/https/ws}" \
    --memory=1Gi \
    --cpu=1 \
    --timeout=60 \
    --max-instances=10

FRONTEND_URL=$(gcloud run services describe ${FRONTEND_SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')
echo -e "${GREEN}Frontend deployed at: ${FRONTEND_URL}${NC}"

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}Frontend URL: ${FRONTEND_URL}${NC}"
echo -e "${GREEN}Backend URL: ${BACKEND_URL}${NC}"

