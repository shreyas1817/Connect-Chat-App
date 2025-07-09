# Connect Chat App Startup Script
Write-Host "Starting Connect Chat Application..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Yellow
} catch {
    Write-Host "Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Navigate to project directory
Set-Location $PSScriptRoot

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
npm install

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install --legacy-peer-deps
Set-Location ..

# Check if .env files exist
if (-not (Test-Path ".env")) {
    Write-Host "Warning: Backend .env file not found. Please configure your environment variables." -ForegroundColor Red
}

if (-not (Test-Path "frontend\.env")) {
    Write-Host "Warning: Frontend .env file not found. Please configure your environment variables." -ForegroundColor Red
}

# Start the application
Write-Host "Starting the Connect Chat Application..." -ForegroundColor Green
Write-Host "Backend will run on http://localhost:5000" -ForegroundColor Cyan
Write-Host "Frontend will run on http://localhost:3000" -ForegroundColor Cyan

# Open two PowerShell windows - one for backend, one for frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot'; npm run server"
Start-Sleep 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend'; npm start"

Write-Host "Application started! Check the opened PowerShell windows for logs." -ForegroundColor Green
Write-Host "Visit http://localhost:3000 to access the chat application." -ForegroundColor Green
