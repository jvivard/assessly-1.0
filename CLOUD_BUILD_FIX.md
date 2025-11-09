# Fixing Cloud Build Dockerfile Error

## Issue

Error: `unable to evaluate symlinks in Dockerfile path: lstat /workspace/Dockerfile: no such file or directory`

## Cause

Cloud Build can't find the Dockerfile because:
1. Dockerfiles might not be committed to the GitHub repository
2. The build context or Dockerfile path is incorrect
3. The repository structure in GitHub differs from local

## Solution

### Step 1: Verify Dockerfiles Exist

Make sure these files are in your repository:
- `Dockerfile` (frontend) - in root directory
- `backend/Dockerfile` (backend) - in backend directory

### Step 2: Commit Dockerfiles to GitHub

```bash
# Make sure Dockerfiles are committed
git add Dockerfile backend/Dockerfile
git commit -m "Add Dockerfiles for Cloud Run deployment"
git push
```

### Step 3: Update Cloud Build Configuration

I've updated `cloudbuild.yaml` to explicitly specify Dockerfile paths. The key changes:

1. **Explicit Dockerfile paths** using `-f` flag:
   ```yaml
   args:
     - 'build'
     - '-f'
     - 'backend/Dockerfile'  # or 'Dockerfile' for frontend
     - '-t'
     - 'gcr.io/$PROJECT_ID/assessly-backend'
     - 'backend'  # build context
   ```

2. **Build context** is set to the directory containing the Dockerfile

### Step 4: Verify Repository Structure

Your GitHub repository should have this structure:
```
assessly-1.0/
├── Dockerfile                 # Frontend Dockerfile
├── backend/
│   ├── Dockerfile            # Backend Dockerfile
│   ├── requirements.txt
│   └── app/
├── package.json
├── next.config.mjs
└── cloudbuild.yaml
```

### Step 5: Test Build Locally

Before triggering Cloud Build, test locally:

```powershell
# Test backend build
cd backend
docker build -f Dockerfile -t test-backend .
cd ..

# Test frontend build
docker build -f Dockerfile -t test-frontend .
```

### Step 6: Create/Update Cloud Build Trigger

1. **Go to Cloud Build Console**: https://console.cloud.google.com/cloud-build/triggers
2. **Create a new trigger** or **edit existing trigger**
3. **Set configuration file**: `cloudbuild.yaml`
4. **Set build location**: Repository root
5. **Save and test**

## Alternative: Use Separate Build Files

If the combined build fails, use separate build files:

### Backend Only
```bash
gcloud builds submit --config=cloudbuild-backend.yaml
```

### Frontend Only
```bash
gcloud builds submit --config=cloudbuild-frontend.yaml
```

## Manual Deployment (Alternative)

If Cloud Build continues to fail, deploy manually:

### Deploy Backend
```powershell
cd backend
gcloud builds submit --tag gcr.io/$PROJECT_ID/assessly-backend
gcloud run deploy assessly-backend --image gcr.io/$PROJECT_ID/assessly-backend --region us-central1
```

### Deploy Frontend
```powershell
gcloud builds submit --tag gcr.io/$PROJECT_ID/assessly-frontend
gcloud run deploy assessly-frontend --image gcr.io/$PROJECT_ID/assessly-frontend --region us-central1
```

## Troubleshooting

### Error: "Dockerfile not found"
- **Solution**: Verify Dockerfiles are committed to GitHub
- **Check**: `git ls-files | grep Dockerfile`

### Error: "Build context invalid"
- **Solution**: Make sure build context directory exists
- **Check**: Repository structure matches expected paths

### Error: "Permission denied"
- **Solution**: Ensure Cloud Build has necessary permissions
- **Fix**: Grant Cloud Build Service Account proper roles

### Error: "Image push failed"
- **Solution**: Check Container Registry permissions
- **Fix**: Enable Container Registry API and grant permissions

## Recommended Approach

1. **Commit Dockerfiles** to GitHub
2. **Test builds locally** first
3. **Use separate build files** (cloudbuild-backend.yaml, cloudbuild-frontend.yaml) for easier debugging
4. **Deploy manually** if Cloud Build triggers continue to fail

## Next Steps

1. ✅ Verify Dockerfiles are in repository
2. ✅ Commit and push Dockerfiles
3. ✅ Test local builds
4. ✅ Update Cloud Build trigger
5. ✅ Monitor build logs

## Files Created

- `cloudbuild.yaml` - Updated with explicit Dockerfile paths
- `cloudbuild-backend.yaml` - Backend-only build configuration
- `cloudbuild-frontend.yaml` - Frontend-only build configuration

Use these files based on your needs!

