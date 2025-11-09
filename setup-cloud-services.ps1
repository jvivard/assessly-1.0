# PowerShell script to set up Cloud SQL and Redis for Cloud Run deployment

param(
    [string]$ProjectId = $env:GCP_PROJECT_ID,
    [string]$Region = $env:GCP_REGION,
    [string]$DbPassword = "",
    [string]$RedisOption = "upstash"  # Options: "upstash", "memorystore", "skip"
)

if ([string]::IsNullOrEmpty($ProjectId)) {
    $ProjectId = Read-Host "Enter your GCP Project ID"
}

if ([string]::IsNullOrEmpty($Region)) {
    $Region = Read-Host "Enter your GCP Region (e.g., us-central1)"
}

Write-Host "Setting up cloud services for project: $ProjectId" -ForegroundColor Green
Write-Host "Region: $Region" -ForegroundColor Green

# Enable required APIs
Write-Host "`nEnabling required APIs..." -ForegroundColor Yellow
gcloud services enable sqladmin.googleapis.com --project=$ProjectId
if ($RedisOption -eq "memorystore") {
    gcloud services enable redis.googleapis.com --project=$ProjectId
}

# Step 1: Create Cloud SQL instance
Write-Host "`n=== Step 1: Creating Cloud SQL PostgreSQL Instance ===" -ForegroundColor Green

if ([string]::IsNullOrEmpty($DbPassword)) {
    $DbPassword = Read-Host "Enter a secure password for the database"
}

$dbInstanceName = "assessly-db"
$dbName = "assessly"
$dbUser = "assessly-user"

Write-Host "Creating Cloud SQL instance: $dbInstanceName" -ForegroundColor Yellow
gcloud sql instances create $dbInstanceName `
    --database-version=POSTGRES_15 `
    --tier=db-f1-micro `
    --region=$Region `
    --root-password=$DbPassword `
    --project=$ProjectId

Write-Host "Creating database: $dbName" -ForegroundColor Yellow
gcloud sql databases create $dbName `
    --instance=$dbInstanceName `
    --project=$ProjectId

Write-Host "Creating database user: $dbUser" -ForegroundColor Yellow
gcloud sql users create $dbUser `
    --instance=$dbInstanceName `
    --password=$DbPassword `
    --project=$ProjectId

# Get connection name
$connName = gcloud sql instances describe $dbInstanceName --project=$ProjectId --format="value(connectionName)"
Write-Host "Connection name: $connName" -ForegroundColor Cyan

# Set DATABASE_URL for Cloud Run (Unix socket format)
$env:DATABASE_URL = "postgresql://${dbUser}:${DbPassword}@/${dbName}?host=/cloudsql/${connName}"
Write-Host "`nDATABASE_URL set to: postgresql://${dbUser}:***@/${dbName}?host=/cloudsql/${connName}" -ForegroundColor Green

# Set CLOUD_SQL_INSTANCE for deployment
$env:CLOUD_SQL_INSTANCE = $connName
Write-Host "CLOUD_SQL_INSTANCE set to: $connName" -ForegroundColor Green

# Step 2: Set up Redis
Write-Host "`n=== Step 2: Setting up Redis ===" -ForegroundColor Green

if ($RedisOption -eq "upstash") {
    Write-Host "`nUsing Upstash Redis (recommended for start):" -ForegroundColor Yellow
    Write-Host "1. Sign up at https://upstash.com/ (free tier available)" -ForegroundColor Cyan
    Write-Host "2. Create a Redis database" -ForegroundColor Cyan
    Write-Host "3. Copy the connection URL" -ForegroundColor Cyan
    $redisUrl = Read-Host "Enter your Upstash Redis URL (redis://default:PASSWORD@HOST:PORT)"
    $env:REDIS_URL = $redisUrl
    Write-Host "REDIS_URL set" -ForegroundColor Green
}
elseif ($RedisOption -eq "memorystore") {
    Write-Host "Creating Cloud Memorystore Redis instance (this may take 10-15 minutes)..." -ForegroundColor Yellow
    $redisInstanceName = "assessly-redis"
    
    gcloud redis instances create $redisInstanceName `
        --size=1 `
        --region=$Region `
        --redis-version=redis_7_0 `
        --tier=basic `
        --project=$ProjectId
    
    Write-Host "Waiting for Redis instance to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 120
    
    $redisHost = gcloud redis instances describe $redisInstanceName --region=$Region --project=$ProjectId --format="value(host)"
    $env:REDIS_URL = "redis://$redisHost:6379/0"
    Write-Host "REDIS_URL set to: redis://$redisHost:6379/0" -ForegroundColor Green
}
else {
    Write-Host "Skipping Redis setup. Set REDIS_URL manually:" -ForegroundColor Yellow
    Write-Host '$env:REDIS_URL = "redis://YOUR_REDIS_HOST:6379/0"' -ForegroundColor Cyan
}

# Summary
Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "`nEnvironment variables to use:" -ForegroundColor Yellow
Write-Host "`$env:GCP_PROJECT_ID = `"$ProjectId`"" -ForegroundColor Cyan
Write-Host "`$env:GCP_REGION = `"$Region`"" -ForegroundColor Cyan
Write-Host "`$env:DATABASE_URL = `"$env:DATABASE_URL`"" -ForegroundColor Cyan
Write-Host "`$env:CLOUD_SQL_INSTANCE = `"$connName`"" -ForegroundColor Cyan
if (-not [string]::IsNullOrEmpty($env:REDIS_URL)) {
    Write-Host "`$env:REDIS_URL = `"$env:REDIS_URL`"" -ForegroundColor Cyan
}

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Set your API keys:" -ForegroundColor Cyan
Write-Host "   `$env:OPENAI_API_KEY = `"sk-...`"" -ForegroundColor White
Write-Host "   `$env:NOVITA_API_KEY = `"your-key`"" -ForegroundColor White
Write-Host "2. Deploy backend: .\deploy-backend.ps1" -ForegroundColor Cyan
Write-Host "3. Deploy frontend: .\deploy-frontend.ps1" -ForegroundColor Cyan

