# Start local Supabase after Windows reboot (WSL + Docker Desktop required).
$ErrorActionPreference = "Stop"
$env:Path = "$env:ProgramFiles\Docker\Docker\resources\bin;$env:LOCALAPPDATA\Programs\nodejs;$env:Path"

Write-Host "Checking Docker..."
docker info | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker is not ready. Start Docker Desktop, wait until it is healthy, then re-run this script."
  exit 1
}

Set-Location (Split-Path $PSScriptRoot -Parent)
Write-Host "Starting Supabase (this pulls images on first run)..."
npx --yes supabase start
Write-Host ""
Write-Host "Done. Studio: http://127.0.0.1:54323"
Write-Host "API:    http://127.0.0.1:54321"
Write-Host "Then run: npm run dev"
Write-Host "Login:   http://localhost:3000/login"
Write-Host "Demo password for all seeded users: gura-demo-2026"
