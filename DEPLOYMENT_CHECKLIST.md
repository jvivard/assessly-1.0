# Deployment Checklist

Use this checklist to ensure a smooth deployment to Google Cloud Run.

## Pre-Deployment

- [ ] Google Cloud account created and billing enabled
- [ ] gcloud CLI installed and authenticated (`gcloud auth login`)
- [ ] Docker installed and running
- [ ] GCP project created
- [ ] Required APIs enabled:
  - [ ] Cloud Build API
  - [ ] Cloud Run API
  - [ ] Container Registry API
  - [ ] Cloud SQL Admin API (if using Cloud SQL)

## Environment Setup

- [ ] GCP Project ID set: `export GCP_PROJECT_ID="your-project-id"`
- [ ] GCP Region selected: `export GCP_REGION="us-central1"`
- [ ] Database URL configured: `export DATABASE_URL="postgresql://..."`
- [ ] Redis URL configured: `export REDIS_URL="redis://..."`
- [ ] API Keys obtained:
  - [ ] OpenAI API Key
  - [ ] Novita API Key
  - [ ] Gemini API Key (optional)

## Database Setup

- [ ] Cloud SQL instance created (or external database configured)
- [ ] Database created
- [ ] Database user created with appropriate permissions
- [ ] Connection string tested
- [ ] Database migrations ready (Alembic)

## Redis Setup

- [ ] Redis instance configured (Cloud Memorystore, Upstash, or other)
- [ ] Connection string obtained
- [ ] Connection tested

## Backend Deployment

- [ ] Backend Dockerfile reviewed
- [ ] Environment variables documented
- [ ] Backend built and tested locally
- [ ] Backend image built: `gcloud builds submit --tag gcr.io/$PROJECT_ID/assessly-backend`
- [ ] Backend deployed to Cloud Run
- [ ] Backend URL obtained: `BACKEND_URL`
- [ ] Backend health check passed: `curl $BACKEND_URL/health`
- [ ] Backend logs reviewed

## Frontend Deployment

- [ ] Frontend Dockerfile reviewed
- [ ] Next.js config updated (standalone mode)
- [ ] Frontend built and tested locally
- [ ] Backend URL set: `export BACKEND_URL="..."`
- [ ] Frontend environment variables configured
- [ ] Frontend image built: `gcloud builds submit --tag gcr.io/$PROJECT_ID/assessly-frontend`
- [ ] Frontend deployed to Cloud Run
- [ ] Frontend URL obtained: `FRONTEND_URL`
- [ ] Frontend accessible in browser

## Post-Deployment

- [ ] Backend CORS updated with frontend URL
- [ ] Database migrations run
- [ ] API endpoints tested
- [ ] WebSocket connections tested
- [ ] File uploads tested
- [ ] Error logging configured
- [ ] Monitoring set up
- [ ] Alerts configured

## Security

- [ ] Environment variables stored securely (not in code)
- [ ] CORS settings configured correctly
- [ ] API keys rotated if needed
- [ ] IAM roles configured
- [ ] Service account permissions reviewed
- [ ] SSL certificates verified (automatic with Cloud Run)

## Performance

- [ ] Memory allocation appropriate (2Gi backend, 1Gi frontend)
- [ ] CPU allocation appropriate (2 backend, 1 frontend)
- [ ] Timeout settings configured (300s backend, 60s frontend)
- [ ] Auto-scaling configured (min 0, max 10)
- [ ] Cold start optimization considered

## Testing

- [ ] Health checks working
- [ ] API endpoints responding
- [ ] Frontend loading correctly
- [ ] Database connections working
- [ ] Redis connections working
- [ ] File uploads working
- [ ] WebSocket connections working
- [ ] Error handling tested
- [ ] Logging working

## Documentation

- [ ] Deployment process documented
- [ ] Environment variables documented
- [ ] Troubleshooting guide created
- [ ] Team members informed
- [ ] Runbooks created (if needed)

## Rollback Plan

- [ ] Previous image versions tagged
- [ ] Rollback procedure documented
- [ ] Backup strategy in place
- [ ] Data migration plan (if needed)

## Monitoring

- [ ] Cloud Run metrics dashboard set up
- [ ] Error rate alerts configured
- [ ] Response time alerts configured
- [ ] Cost alerts configured
- [ ] Log aggregation set up

## Next Steps

- [ ] Custom domain configured
- [ ] CDN configured (if needed)
- [ ] CI/CD pipeline set up
- [ ] Automated testing integrated
- [ ] Performance optimization
- [ ] Cost optimization review

