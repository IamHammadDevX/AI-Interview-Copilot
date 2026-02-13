<# ============================================================
   Minimal Bootstrap (Scoop + Node.js 22+, then run quicksetup.ps1)
   - Assumes repo is already cloned and you're in the project root
   - Ensures npm works even if PATH/shims haven't refreshed yet
   - Sets execution policy to RemoteSigned (so npm.ps1 can run manually)
   ============================================================ #>

$ErrorActionPreference = 'Stop'
try { Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force } catch {}

# ---- Helpers ----
function Have-Cmd([string]$name) { [bool](Get-Command $name -ErrorAction SilentlyContinue) }

function Semver-Major([string]$ver) {
  if (-not $ver) { return 0 }
  $v = $ver.TrimStart('v','V')
  (($v -split '\.')[0] -as [int])
}

function Refresh-PathForSession {
  # Reload PATH from registry, then ensure Scoop shims are first
  $u = [Environment]::GetEnvironmentVariable('Path','User')
  $m = [Environment]::GetEnvironmentVariable('Path','Machine')
  $env:Path = @($u,$m) -join ';'

  $shim = Join-Path $HOME 'scoop\shims'
  if ( (Test-Path $shim) -and (-not (($env:Path -split ';') -contains $shim)) ) {
    $env:Path = "$shim;$env:Path"
  }
}

function Ensure-Scoop {
  if (Have-Cmd 'scoop') { return }
  Write-Host "Installing Scoop (per-user, no admin)..." -ForegroundColor Cyan
  try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
  $script = (Invoke-WebRequest -UseBasicParsing -Uri 'https://get.scoop.sh').Content
  Invoke-Expression $script
  Refresh-PathForSession
  if (-not (Have-Cmd 'scoop')) { throw "Scoop installation failed (not on PATH)." }
  try { scoop bucket add main | Out-Null } catch {}
}

function Scoop-IsInstalled([string]$pkg) {
  try { [bool](scoop list 2>$null | Select-String -SimpleMatch $pkg) } catch { $false }
}

function Scoop-Ensure([string]$pkg) {
  if (-not (Have-Cmd 'scoop')) { Ensure-Scoop }
  if (-not (Scoop-IsInstalled $pkg)) {
    Write-Host "Installing $pkg via Scoop..." -ForegroundColor DarkCyan
    scoop install $pkg | Out-Host
  }
  Refresh-PathForSession
}

# Returns a guaranteed-working npm.cmd path (prefers Scoop shim, falls back to Node app dir)
function Get-NpmPath {
  $candidates = @(
    "$HOME\scoop\shims\npm.cmd",
    "$HOME\scoop\apps\nodejs-lts\current\npm.cmd",
    "$env:LOCALAPPDATA\Programs\nodejs\npm.cmd"
  )
  foreach ($name in @('npm.cmd','npm')) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cmd -and (Test-Path $cmd.Source)) { $candidates += $cmd.Source }
  }
  $found = $candidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
  if (-not $found) { throw "npm not found. Open a NEW PowerShell window or ensure Node is installed." }
  return $found
}

# ---- Validate location ----
if (-not (Test-Path ".\package.json")) {
  Write-Host "No package.json found. Make sure you're in the project root (the cloned repo folder)." -ForegroundColor Yellow
  Write-Host "Example: cd C:\Users\krivo\interview-copilot" -ForegroundColor Yellow
  exit 1
}

# ---- Ensure Node.js 22+ (npm) via Scoop ----
Write-Host ">> Ensuring Scoop and Node.js (22+ LTS)..." -ForegroundColor Green
Ensure-Scoop

$needMajor = 22
$ok = $false
if (Have-Cmd 'node') {
  $maj = Semver-Major (& node -v 2>$null)
  if ($maj -ge $needMajor) { $ok = $true }
}
if (-not $ok) {
  Scoop-Ensure 'nodejs-lts'     # Node 22 LTS via Scoop
  try { scoop reset nodejs-lts | Out-Null } catch {}
  Refresh-PathForSession
  $maj = Semver-Major (& node -v)
  if ($maj -lt $needMajor) { throw "Installed Node is <$needMajor (found: $(node -v)). Please install Node 22+." }
}

# ---- Put Node app dir on PATH immediately (covers rare no-shim cases) ----
$nodeAppDir = "$HOME\scoop\apps\nodejs-lts\current"
if ( (Test-Path $nodeAppDir) -and (-not (($env:Path -split ';') -contains $nodeAppDir)) ) {
  $env:Path = "$nodeAppDir;$env:Path"
}

# ---- Resolve npm path and show versions ----
$npm = Get-NpmPath
Write-Host "Using npm at: $npm" -ForegroundColor DarkGray
node -v | Out-Host
& $npm -v | Out-Host

# ---- Run your existing quicksetup.ps1 (inherits refreshed PATH) ----
if (Test-Path ".\quicksetup.ps1") {
  Write-Host "`n>> Running quicksetup.ps1 ..." -ForegroundColor Cyan
  powershell -NoProfile -ExecutionPolicy Bypass -File .\quicksetup.ps1
} else {
  Write-Host "quicksetup.ps1 not found in this folder." -ForegroundColor Red
  exit 1
}

# ---- Final: ensure npm works and allow future manual runs ----
Write-Host "`nSetting PowerShell execution policy to RemoteSigned (for npm.ps1 support)..." -ForegroundColor Cyan
try {
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force -ErrorAction Stop
} catch {
  Write-Host "Execution policy change skipped: $($_.Exception.Message)" -ForegroundColor Yellow
}

Refresh-PathForSession
if ( (Test-Path $nodeAppDir) -and (-not (($env:Path -split ';') -contains $nodeAppDir)) ) {
  $env:Path = "$nodeAppDir;$env:Path"
}

$npm = Get-NpmPath
Write-Host "`n🚀 Starting dev server (npm run dev)..." -ForegroundColor Green
& $npm run dev
