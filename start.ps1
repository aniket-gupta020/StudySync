# StudySync Quick Start Script

Write-Host "🚀 Starting StudySync Platform..." -ForegroundColor Cyan
Write-Host ""

# Function to check if a process is running on a port
function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
    return $connection.TcpTestSucceeded
}

# Check if ports are already in use
$serverPort = 5000
$clientPort = 5173

if (Test-Port $serverPort) {
    Write-Host "⚠️  Port $serverPort is already in use. Server may already be running." -ForegroundColor Yellow
} else {
    Write-Host "✅ Port $serverPort is available" -ForegroundColor Green
}

if (Test-Port $clientPort) {
    Write-Host "⚠️  Port $clientPort is already in use. Client may already be running." -ForegroundColor Yellow
} else {
    Write-Host "✅ Port $clientPort is available" -ForegroundColor Green
}

Write-Host ""
Write-Host "📡 Starting Backend Server (Port $serverPort)..." -ForegroundColor Magenta

# Start backend server in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\server'; Write-Host '🔧 Backend Server Starting...' -ForegroundColor Green; npm start"

# Wait for backend to start
Start-Sleep -Seconds 3

Write-Host "🎨 Starting Frontend Client (Port $clientPort)..." -ForegroundColor Magenta

# Start frontend client in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\client'; Write-Host '🎨 Frontend Client Starting...' -ForegroundColor Cyan; npm start"

# Wait for frontend to start
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "✨ StudySync is starting up!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Application URLs:" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:$clientPort" -ForegroundColor White
Write-Host "   Backend:  http://localhost:$serverPort" -ForegroundColor White
Write-Host ""
Write-Host "💡 Both servers are running in separate windows" -ForegroundColor Cyan
Write-Host "💡 Close those windows to stop the servers" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Opening browser in 5 seconds..." -ForegroundColor Yellow

Start-Sleep -Seconds 5

# Open browser
Start-Process "http://localhost:$clientPort"

Write-Host ""
Write-Host "✅ StudySync is ready!" -ForegroundColor Green
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
