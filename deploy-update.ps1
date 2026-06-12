#!/usr/bin/env pwsh
# deploy-update.ps1
# Publishes an OTA update to BOTH preview and production channels simultaneously.
# Usage: .\deploy-update.ps1 "Your update message here"
#
# This ensures that:
#   - Users on preview APKs (internal testers) get the update
#   - Users on production APKs (Play Store) get the update
#   - The two channels are always in sync

param(
    [Parameter(Mandatory=$false)]
    [string]$Message = "OTA update"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  FAF OTA Update Publisher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Message : $Message" -ForegroundColor White
Write-Host "Channels: preview + production" -ForegroundColor White
Write-Host ""

# ── Publish to production ──────────────────────────────────────────────────────
Write-Host "[1/2] Publishing to production channel..." -ForegroundColor Yellow
eas update --branch production --message $Message
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to publish to production." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Production channel updated." -ForegroundColor Green
Write-Host ""

# ── Publish to preview ────────────────────────────────────────────────────────
Write-Host "[2/2] Publishing to preview channel..." -ForegroundColor Yellow
eas update --branch preview --message $Message
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to publish to preview." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Preview channel updated." -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  🎉 All channels updated!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Both preview APK users and production users" -ForegroundColor Gray
Write-Host "will receive this update on next app launch." -ForegroundColor Gray
Write-Host ""
