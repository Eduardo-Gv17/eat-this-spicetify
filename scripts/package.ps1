$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
& node (Join-Path $PSScriptRoot 'check-package.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Package validation failed.' }
$taskDist = Join-Path $taskRoot 'dist'
New-Item -ItemType Directory -Force -Path $taskDist | Out-Null
$taskArchive = Join-Path $taskDist 'eat-this.zip'
Compress-Archive -LiteralPath (Join-Path $taskRoot 'eat-this') -DestinationPath $taskArchive -Force
Write-Host "Created $taskArchive"
