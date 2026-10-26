$ErrorActionPreference = 'Stop'
$taskSource = Join-Path $PSScriptRoot 'eat-this'
foreach ($taskFile in @('index.js', 'manifest.json', 'engine.js', 'spotify.js', 'board.js', 'extension.js', 'style.css')) {
    if (-not (Test-Path -LiteralPath (Join-Path $taskSource $taskFile) -PathType Leaf)) { throw "Missing eat-this/$taskFile. Keep the eat-this folder beside install.ps1." }
}
if (-not (Get-Command spicetify -ErrorAction SilentlyContinue)) { throw 'Install and configure Spicetify first: https://spicetify.app/docs/getting-started' }
$taskConfigPath = (& spicetify -c | Select-Object -Last 1).Trim()
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $taskConfigPath -PathType Leaf)) { throw 'Could not locate the configuration with spicetify -c.' }
$taskDestination = Join-Path (Split-Path -Parent $taskConfigPath) 'CustomApps\eat-this'
New-Item -ItemType Directory -Force -Path $taskDestination | Out-Null
Get-ChildItem -LiteralPath $taskSource -File | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $taskDestination -Force }
& spicetify config custom_apps eat-this
if ($LASTEXITCODE -ne 0) { throw 'Could not register Eat This.' }
& spicetify apply
if ($LASTEXITCODE -ne 0) { throw 'Spicetify could not apply the change.' }
Write-Host 'Eat This installed. Open Spotify and find Eat This in the sidebar.'
