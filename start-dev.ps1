# WebMeter Development Environment Startup Script for Windows

Write-Host "🚀 Starting WebMeter Development Environment" -ForegroundColor Blue

# Function to check if port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Function to check if PostgreSQL is running
function Test-PostgreSQL {
    try {
        # Try to connect to PostgreSQL
        $env:PGPASSWORD = "WebMeter2024!"
        $result = & psql -h localhost -p 5432 -U webmeter_app -d Webmeter_db -c "\q" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ PostgreSQL database is accessible" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "❌ Database 'Webmeter_db' is not accessible" -ForegroundColor Red
            Write-Host "  Please run the database setup scripts:" -ForegroundColor Yellow
            Write-Host "  psql -U postgres -f database/simple_user_database.sql" -ForegroundColor Yellow
            Write-Host "  psql -U postgres -f database/simple_user_data.sql" -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Host "❌ PostgreSQL is not running or not accessible" -ForegroundColor Red
        Write-Host "  Please start PostgreSQL service first" -ForegroundColor Yellow
        return $false
    }
}

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Blue

if (-not (Test-PostgreSQL)) {
    exit 1
}

# Check if ports are available
if (Test-Port 3001) {
    Write-Host "❌ Port 3001 is already in use" -ForegroundColor Red
    exit 1
}

if (Test-Port 5173) {
    Write-Host "❌ Port 5173 is already in use" -ForegroundColor Red
    exit 1
}

# Start API Server
Write-Host "🔧 Starting API Server..." -ForegroundColor Blue
Set-Location server

if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing server dependencies..." -ForegroundColor Blue
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install server dependencies" -ForegroundColor Red
        exit 1
    }
}

# Start server in background
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev
}

Write-Host "✅ API Server started (Job ID: $($serverJob.Id))" -ForegroundColor Green

# Wait for server to start
Start-Sleep 5

# Test API server
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -TimeoutSec 5
    Write-Host "✅ API Server is responding" -ForegroundColor Green
}
catch {
    Write-Host "❌ API Server is not responding" -ForegroundColor Red
    Stop-Job $serverJob
    Remove-Job $serverJob
    exit 1
}

Set-Location ..

# Start Frontend
Write-Host "🎨 Starting Frontend Development Server..." -ForegroundColor Blue

if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Blue
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
        Stop-Job $serverJob
        Remove-Job $serverJob
        exit 1
    }
}

Write-Host "🌟 WebMeter Development Environment is starting..." -ForegroundColor Green
Write-Host "📱 Frontend: http://localhost:5173" -ForegroundColor Blue
Write-Host "🔌 API Server: http://localhost:3001" -ForegroundColor Blue
Write-Host "📊 API Health: http://localhost:3001/api/health" -ForegroundColor Blue
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Blue

# Function to cleanup on exit
function Cleanup {
    Write-Host "`n🛑 Shutting down servers..." -ForegroundColor Blue
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
    Write-Host "✅ Cleanup completed" -ForegroundColor Green
}

# Register cleanup on script exit
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    Cleanup
}

try {
    # Start frontend (this will block)
    npm run dev
}
finally {
    Cleanup
}
