# PowerShell script to deploy frontend to Google Cloud Run (Windows)

param(
    [string]$ProjectId = $env:GCP_PROJECT_ID,
    [string]$Region = $env:GCP_REGION,
    [string]$ServiceName = "assessly-frontend"
)

if ([string]::IsNullOrEmpty($ProjectId)) {
    $ProjectId = Read-Host "Enter your GCP Project ID"
}

if ([string]::IsNullOrEmpty($Region)) {
    $Region = Read-Host "Enter your GCP Region (e.g., us-central1)"
}

$ImageName = "gcr.io/$ProjectId/$ServiceName"

Write-Host "Deploying frontend to Cloud Run..." -ForegroundColor Green

# Check if backend URL is set
if ([string]::IsNullOrEmpty($env:BACKEND_URL)) {
    Write-Host "Warning: BACKEND_URL is not set. Frontend may not be able to connect to backend." -ForegroundColor Yellow
    Write-Host "Set BACKEND_URL environment variable with your backend service URL." -ForegroundColor Yellow
}

# Set WebSocket URL
$WsUrl = $env:WS_URL
if ([string]::IsNullOrEmpty($WsUrl)) {
    $WsUrl = $env:BACKEND_URL -replace "https://", "wss://"
    if ([string]::IsNullOrEmpty($WsUrl)) {
        $WsUrl = $env:BACKEND_URL -replace "http://", "ws://"
    }
}

# Build and push image
Write-Host "Building Docker image..." -ForegroundColor Green
gcloud builds submit --tag $ImageName

# Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..." -ForegroundColor Green
gcloud run deploy $ServiceName `
    --image $ImageName `
    --platform managed `
    --region $Region `
    --allow-unauthenticated `
    --set-env-vars "NEXT_PUBLIC_API_URL=$($env:BACKEND_URL),NEXT_PUBLIC_WS_URL=$WsUrl" `
    --memory=1Gi `
    --cpu=1 `
    --timeout=60 `
    --max-instances=10 `
    --min-instances=0

# Get service URL
$ServiceUrl = gcloud run services describe $ServiceName `
    --platform managed `
    --region $Region `
    --format 'value(status.url)'

Write-Host "Frontend deployed successfully!" -ForegroundColor Green
Write-Host "Service URL: $ServiceUrl" -ForegroundColor Green
Write-Host "Update backend CORS settings with this URL:" -ForegroundColor Green
Write-Host "gcloud run services update assessly-backend --update-env-vars ALLOWED_ORIGINS=$ServiceUrl"

