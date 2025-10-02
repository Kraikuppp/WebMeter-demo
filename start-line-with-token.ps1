# PowerShell script to start LINE server with token
Write-Host "🚀 Starting LINE Server with Access Token..." -ForegroundColor Green

# Set the LINE Channel Access Token
$env:LINE_CHANNEL_ACCESS_TOKEN = "TpepU3krrJuCANdERlRqYYfTi9bH10G0vFriid+tGfNZxaFY2jfC3MJXCE5XjVylBK2sgVN+6zkZhi04+ZwE3HtfDFGPB88WdqOoBjZoKaBymG4SFYUiXC+XE8jePY4nl0x905WH9bWyE8Xqvjt3GQdB04t89/1O/w1cDnyilFU="

Write-Host "✅ LINE_CHANNEL_ACCESS_TOKEN set successfully" -ForegroundColor Green
Write-Host "🔍 Token length: $($env:LINE_CHANNEL_ACCESS_TOKEN.Length)" -ForegroundColor Yellow
Write-Host "🔍 Token starts with: $($env:LINE_CHANNEL_ACCESS_TOKEN.Substring(0, 10))..." -ForegroundColor Yellow

# Start the LINE server
Write-Host "🚀 Starting LINE Server..." -ForegroundColor Green
cd server
node line-server.js
