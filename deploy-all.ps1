param(
    [string]$message = "OTA update"
)

Write-Host "Deploying to Android (EAS) and PWA (Vercel) sequentially to avoid locks..." -ForegroundColor Cyan

Set-Location $PSScriptRoot

# 1. Export the Web build (PWA)
Write-Host "`n--- Exporting Web build ---" -ForegroundColor Yellow
npx expo export --platform web

# Rename node_modules to vendor to bypass Vercel deployment rules
node rename-node-modules.js

# 3. Deploy to Vercel (PWA + Landing)
Write-Host "`n--- Deploying Unified Landing and PWA to Vercel ---" -ForegroundColor Yellow
Remove-Item -Path "landing\pwa" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path "dist" -Destination "landing\pwa" -Recurse -Force
Remove-Item -Path "landing\.vercel" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path ".vercel" -Destination "landing\" -Recurse -Force
npx vercel deploy landing --prod --yes

# 4. Deploy EAS Update (Android & iOS)
Write-Host "`n--- Deploying EAS update ---" -ForegroundColor Yellow
npx eas update --branch production --message $message

Write-Host "`nAll deployments complete!" -ForegroundColor Cyan
