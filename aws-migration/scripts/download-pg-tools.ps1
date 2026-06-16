# File: aws-migration/scripts/download-pg-tools.ps1
#
# Downloads the official PostgreSQL Windows binaries zip from EnterpriseDB,
# extracts the 'bin' utilities (pg_dump, psql, and dependent DLLs),
# saves them to aws-migration/bin, and cleans up the temp files.

$ErrorActionPreference = "Stop"

$tempZip = "$env:TEMP\postgresql-binaries.zip"
$tempExtract = "$env:TEMP\postgresql-extracted"
$targetBin = "aws-migration\bin"

Write-Output "=========================================================="
Write-Output "   Downloading PostgreSQL Client Utilities"
Write-Output "=========================================================="

# 1. Download EDB PostgreSQL Binaries Zip (v15.4)
Write-Output "[1/3] Downloading official zip from EnterpriseDB..."
$url = "https://sbp.enterprisedb.com/get/dbbinaries/postgresql-15.4-1-windows-x64-binaries.zip"

# Download using Node.js helper (supports modern TLS protocols)
node aws-migration/scripts/download.js $url $tempZip

# 2. Extract files
Write-Output "[2/3] Extracting binaries..."
if (Test-Path $tempExtract) {
    Remove-Item $tempExtract -Recurse -Force
}
Expand-Archive -Path $tempZip -DestinationPath $tempExtract

# 3. Create target directory and copy bin files
Write-Output "[3/3] Saving tools to $targetBin..."
if (-Not (Test-Path $targetBin)) {
    New-Item -ItemType Directory -Path $targetBin | Out-Null
}

# Copy the bin files and required DLLs
Copy-Item "$tempExtract\pgsql\bin\*" -Destination $targetBin -Force

# 4. Cleanup temp zip and folders
Write-Output "Cleaning up temporary files..."
Remove-Item $tempZip -Force
Remove-Item $tempExtract -Recurse -Force

Write-Output "=========================================================="
Write-Output "   PostgreSQL Client Utilities Installed Successfully!"
Write-Output "   Location: $targetBin"
Write-Output "=========================================================="
