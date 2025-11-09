# Committing Dockerfiles for Cloud Build

## Issue

Cloud Build is failing because it can't find the Dockerfiles in your GitHub repository:
```
ERROR: unable to evaluate symlinks in Dockerfile path: lstat /workspace/Dockerfile: no such file or directory
```

## Solution

The Dockerfiles exist locally but need to be committed and pushed to GitHub.

## Files to Commit

The following files have been staged and need to be committed:

1. ✅ `Dockerfile` - Frontend Dockerfile (NEW)
2. ✅ `backend/Dockerfile` - Backend Dockerfile (MODIFIED)
3. ✅ `cloudbuild.yaml` - Cloud Build configuration (NEW)
4. ✅ `.dockerignore` - Docker ignore file (NEW)
5. ✅ `next.config.mjs` - Updated with standalone output (MODIFIED)

## Steps to Fix

### Step 1: Commit the Files

```powershell
# Commit all the deployment files
git commit -m "Add Dockerfiles and Cloud Build configuration for Cloud Run deployment"
```

### Step 2: Push to GitHub

```powershell
# Push to your repository
git push origin main
# or
git push origin master
```

### Step 3: Verify in GitHub

1. Go to your GitHub repository: https://github.com/jvivard/assessly-1.0
2. Verify these files exist:
   - `Dockerfile` (in root)
   - `backend/Dockerfile`
   - `cloudbuild.yaml`

### Step 4: Retry Cloud Build

After pushing, Cloud Build should be able to find the Dockerfiles. The build will:
1. Find `backend/Dockerfile` and build backend image
2. Find `Dockerfile` and build frontend image
3. Push images to Container Registry
4. Deploy to Cloud Run (if configured)

## What Was Fixed

1. **Updated `cloudbuild.yaml`**:
   - Added explicit Dockerfile paths using `-f` flag
   - Set correct build contexts
   - Added comments explaining structure

2. **Created separate build files**:
   - `cloudbuild-backend.yaml` - For backend-only builds
   - `cloudbuild-frontend.yaml` - For frontend-only builds

3. **Updated `next.config.mjs`**:
   - Added `output: 'standalone'` for Cloud Run optimization

4. **Created `.dockerignore`**:
   - Excludes unnecessary files from Docker builds

## Alternative: Manual Deployment

If Cloud Build continues to fail, you can deploy manually:

### Deploy Backend
```powershell
cd backend
gcloud builds submit --tag gcr.io/healthy-anthem-477622-k7/assessly-backend
gcloud run deploy assessly-backend --image gcr.io/healthy-anthem-477622-k7/assessly-backend --region us-central1
```

### Deploy Frontend
```powershell
gcloud builds submit --tag gcr.io/healthy-anthem-477622-k7/assessly-frontend
gcloud run deploy assessly-frontend --image gcr.io/healthy-anthem-477622-k7/assessly-frontend --region us-central1
```

## Next Steps

1. ✅ Commit the files (run the commit command above)
2. ✅ Push to GitHub
3. ✅ Verify files are in repository
4. ✅ Retry Cloud Build trigger
5. ✅ Monitor build logs

## Troubleshooting

### If build still fails:

1. **Check repository structure** in GitHub matches expected:
   ```
   assessly-1.0/
   ├── Dockerfile
   ├── backend/
   │   ├── Dockerfile
   │   └── ...
   └── cloudbuild.yaml
   ```

2. **Verify Cloud Build trigger** is pointing to correct:
   - Repository
   - Branch
   - Configuration file: `cloudbuild.yaml`

3. **Check build logs** for specific errors

4. **Try separate builds**:
   - Backend: `gcloud builds submit --config=cloudbuild-backend.yaml`
   - Frontend: `gcloud builds submit --config=cloudbuild-frontend.yaml`

