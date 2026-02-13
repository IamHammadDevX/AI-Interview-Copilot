# --- Provider selection (OpenAI default) ---
$choice = Read-Host "Choose API provider: 1) OpenAI (default)  2) DeepSeek [Enter 1 or 2]"
if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }
switch ($choice) {
  "2" { $VAR_NAME = "DEEP_SEEK_API_KEY"; $PROVIDER = "DeepSeek"; $PROVIDER_PUBLIC = "deepseek" }
  default { $VAR_NAME = "OPENAI_API_KEY"; $PROVIDER = "OpenAI"; $PROVIDER_PUBLIC = "openai" }
}

# --- API key (secure prompt) ---
$sec  = Read-Host ("Enter your {0} API key" -f $PROVIDER) -AsSecureString
$ptr  = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
$API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringAuto($ptr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)

# --- Write .env.local (overwrite) ---
$ENV_FILE = ".env.local"
@(
  ("{0}={1}" -f $VAR_NAME, $API_KEY)
  ("NEXT_PUBLIC_LLM_PROVIDER={0}" -f $PROVIDER_PUBLIC)
) | Set-Content -Encoding UTF8 $ENV_FILE

# --- Confirmation (mask key) ---
$masked = if ($API_KEY.Length -gt 8) { $API_KEY.Substring(0,4) + "..." + $API_KEY.Substring($API_KEY.Length-4,4) } else { "****" }
Write-Host "`nWrote to $(Resolve-Path $ENV_FILE):" -ForegroundColor Green
Write-Host "$VAR_NAME=$masked"
Write-Host "NEXT_PUBLIC_LLM_PROVIDER=$PROVIDER_PUBLIC"

# --- Install deps with npm, then run dev ---
if (-not (Test-Path ".\package.json")) {
  Write-Host "`nNo package.json found in the current folder. Are you in the project root?" -ForegroundColor Yellow
} else {
  Write-Host "`nInstalling dependencies with npm..." -ForegroundColor Cyan
  npm install
}
