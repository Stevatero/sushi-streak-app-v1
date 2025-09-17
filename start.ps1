# Script PowerShell per avviare il progetto Sushi Game

Write-Host "🍣 Avvio del progetto Sushi Game 🍣" -ForegroundColor Cyan

# Avvio del backend
Write-Host "Avvio del backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\sushi-game-backend'; npm install; npm start"

# Attesa per dare tempo al backend di avviarsi
Start-Sleep -Seconds 5

# Avvio del frontend
Write-Host "Avvio del frontend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\sushi-game-app'; npm install; npx expo start"

Write-Host "🎉 Entrambi i servizi sono stati avviati! 🎉" -ForegroundColor Magenta