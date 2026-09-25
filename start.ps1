# Script PowerShell per avviare il progetto Sushi Streak in locale
# Uso: .\start.ps1            -> app collegata al backend locale
#      .\start.ps1 -Production -> app collegata al backend di produzione (https://sushi.dietalab.net)
param(
    [switch]$Production
)

Write-Host "🍣 Avvio del progetto Sushi Streak 🍣" -ForegroundColor Cyan

# Avvio del backend
Write-Host "Avvio del backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\sushi-game-backend'; npm install; npm start"

# Indirizzo IP della rete locale, raggiungibile dal telefono
$lanIp = Get-NetIPConfiguration |
    Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } |
    Select-Object -First 1 -ExpandProperty IPv4Address |
    Select-Object -First 1 -ExpandProperty IPAddress

if ($Production) {
    $apiUrl = ''
    Write-Host "L'app userà il backend di produzione" -ForegroundColor Green
} else {
    $apiUrl = "http://${lanIp}:3000"
    Write-Host "L'app userà il backend locale: $apiUrl" -ForegroundColor Green
}

Start-Sleep -Seconds 3

# Avvio del frontend
Write-Host "Avvio del frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\sushi-game-app'; `$env:EXPO_PUBLIC_API_URL='$apiUrl'; npm install; npx expo start"

Write-Host "🎉 Entrambi i servizi sono stati avviati! 🎉" -ForegroundColor Magenta
