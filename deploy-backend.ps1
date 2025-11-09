# PowerShell script to deploy backend to Google Cloud Run (Windows)

param(
    [string]$ProjectId = $env:GCP_PROJECT_ID,
    [string]$Region = $env:GCP_REGION,
    [string]$ServiceName = "assessly-backend"
)

if ([string]::IsNullOrEmpty($ProjectId)) {
    $ProjectId = Read-Host "Enter your GCP Project ID"
}

if ([string]::IsNullOrEmpty($Region)) {
    $Region = Read-Host "Enter your GCP Region (e.g., us-central1)"
}

$ImageName = "gcr.io/$ProjectId/$ServiceName"

Write-Host "Deploying backend to Cloud Run..." -ForegroundColor Green

# Check required environment variables
if ([string]::IsNullOrEmpty($env:DATABASE_URL)) {
    Write-Host "Warning: DATABASE_URL is not set" -ForegroundColor Yellow
}

if ([string]::IsNullOrEmpty($env:OPENAI_API_KEY)) {
    Write-Host "Warning: OPENAI_API_KEY is not set" -ForegroundColor Yellow
}

if ([string]::IsNullOrEmpty($env:NOVITA_API_KEY)) {
    Write-Host "Warning: NOVITA_API_KEY is not set" -ForegroundColor Yellow
}

# Navigate to backend directory
Set-Location backend

# Build and push image
Write-Host "Building Docker image..." -ForegroundColor Green
gcloud builds submit --tag $ImageName

# Check if Cloud SQL instance is specified
$cloudSqlInstance = $env:CLOUD_SQL_INSTANCE
$deployArgs = @(
    "run",
    "deploy",
    $ServiceName,
    "--image=$ImageName",
    "--platform=managed",
    "--region=$Region",
    "--allow-unauthenticated",
    "--memory=2Gi",
    "--cpu=2",
    "--timeout=300",
    "--max-instances=10",
    "--min-instances=0"
)

# Add Cloud SQL connection if specified
if (-not [string]::IsNullOrEmpty($cloudSqlInstance)) {
    Write-Host "Adding Cloud SQL connection: $cloudSqlInstance" -ForegroundColor Yellow
    $deployArgs += "--add-cloudsql-instances=$cloudSqlInstance"
}

# Build environment variables
$envVars = @(
    "DATABASE_URL=$($env:DATABASE_URL)",
    "REDIS_URL=$($env:REDIS_URL)",
    "OPENAI_API_KEY=$($env:OPENAI_API_KEY)",
    "GEMINI_API_KEY=$($env:GEMINI_API_KEY)",
    "NOVITA_API_KEY=$($env:NOVITA_API_KEY)",
    "NOVITA_BASE_URL=$($env:NOVITA_BASE_URL)",
    "DEBUG=$($env:DEBUG)",
    "UPLOAD_DIR=/tmp/uploads",
    "MAX_FILE_SIZE=$($env:MAX_FILE_SIZE)",
    "ALLOWED_ORIGINS=$($env:ALLOWED_ORIGINS)"
)

$envVarsString = $envVars -join ","
$deployArgs += "--set-env-vars=$envVarsString"

# Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..." -ForegroundColor Green
& gcloud $deployArgs

# Get service URL
$ServiceUrl = gcloud run services describe $ServiceName `
    --platform managed `
    --region $Region `
    --format 'value(status.url)'

Write-Host "Backend deployed successfully!" -ForegroundColor Green
Write-Host "Service URL: $ServiceUrl" -ForegroundColor Green
Write-Host "Export this URL for frontend deployment:" -ForegroundColor Green
Write-Host "`$env:BACKEND_URL = '$ServiceUrl'"

Set-Location ..

