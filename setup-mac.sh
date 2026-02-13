#!/usr/bin/env bash
set -euo pipefail

log()  { echo -e "\n\033[1;32m$*\033[0m"; }
warn() { echo -e "\n\033[1;33m$*\033[0m"; }
err()  { echo -e "\n\033[1;31m$*\033[0m" >&2; exit 1; }

# --- Ask for sudo upfront (needed for Homebrew and symlinks) ---
if ! sudo -v >/dev/null 2>&1; then
  echo "🔑 This script needs administrator access to install system tools."
  sudo -v || { err "Sudo access required to continue."; }
fi
# Keep sudo alive
while true; do sudo -n true; sleep 60; kill -0 "$$" || exit; done 2>/dev/null &

# --- Homebrew ---
if ! command -v brew >/dev/null 2>&1; then
  log "Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || err "Homebrew install failed."
  if [[ "$(uname -m)" == "arm64" ]]; then BREW_PREFIX="/opt/homebrew"; else BREW_PREFIX="/usr/local"; fi
  echo "eval \"\$(${BREW_PREFIX}/bin/brew shellenv)\"" >> "${HOME}/.zprofile"
  eval "$(${BREW_PREFIX}/bin/brew shellenv)"
else
  log "Homebrew already installed."
fi

# --- Xcode Command Line Tools ---
if ! xcode-select -p >/dev/null 2>&1; then
  warn "Installing Command Line Tools... (GUI may open)"
  xcode-select --install || true
  # Wait until installed (best-effort)
  for i in {1..30}; do xcode-select -p >/dev/null 2>&1 && break || sleep 2; done
else
  log "Command Line Tools already installed."
fi

# --- Git ---
if ! command -v git >/dev/null 2>&1; then
  log "Installing Git..."
  brew install git
else
  log "Git already installed."
fi

# --- NVM ---
if [[ ! -d "$HOME/.nvm" ]]; then
  log "Installing NVM..."
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
else
  log "NVM already installed."
fi

# --- Ensure NVM init in profiles ---
SHELL_NAME="$(basename "${SHELL:-/bin/zsh}")"
if [[ "$SHELL_NAME" == "zsh" ]]; then PROFILE="${HOME}/.zshrc"
elif [[ "$SHELL_NAME" == "bash" ]]; then PROFILE="${HOME}/.bashrc"
else PROFILE="${HOME}/.profile"; fi

if ! grep -q 'NVM_DIR' "$PROFILE" 2>/dev/null; then
  log "Adding NVM init to $PROFILE"
  cat >> "$PROFILE" <<'EOF'

# NVM setup
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"
EOF
fi

# --- Load NVM in this shell ---
export NVM_DIR="$HOME/.nvm"
# shellcheck source=/dev/null
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" || err "Failed to load NVM."

# --- Node 22 LTS ---
log "Ensuring Node.js 22 LTS..."
nvm install 22 >/dev/null 2>&1 || true
nvm alias default 22 >/dev/null 2>&1
nvm use 22 >/dev/null 2>&1
log "Node version: $(node -v 2>/dev/null || echo 'not found')"
log "NPM  version: $(npm -v 2>/dev/null || echo 'not found')"

# --- Make node/npm immediately available via symlinks ---
# (so you can run npm now, without reopening terminal)
NODE_PATH="$(nvm which 22 2>/dev/null || true)"
if [[ -x "$NODE_PATH" ]]; then
  NODE_BIN_DIR="$(dirname "$NODE_PATH")"
  for bin in node npm npx; do
    if [[ -x "${NODE_BIN_DIR}/${bin}" ]]; then
      # create/update symlinks in common PATH dirs
      for prefix in /usr/local/bin /opt/homebrew/bin; do
        sudo ln -sf "${NODE_BIN_DIR}/${bin}" "${prefix}/${bin}" 2>/dev/null || true
      done
    fi
  done
  log "Linked node/npm/npx into /usr/local/bin (and /opt/homebrew/bin if present)."
fi

# --- Package manager detection & install if needed ---
PKG="npm"
if [[ -f pnpm-lock.yaml ]]; then
  if ! command -v pnpm >/dev/null 2>&1; then
    log "Installing pnpm..."
    corepack enable >/dev/null 2>&1 || true
    corepack prepare pnpm@latest --activate >/dev/null 2>&1 || brew install pnpm
  fi
  PKG="pnpm"
elif [[ -f yarn.lock ]]; then
  if ! command -v yarn >/dev/null 2>&1; then
    log "Installing yarn..."
    corepack enable >/dev/null 2>&1 || true
    corepack prepare yarn@stable --activate >/dev/null 2>&1 || brew install yarn
  fi
  PKG="yarn"
fi
log "Using package manager: ${PKG}"

# --- Ensure next-sitemap if referenced by scripts ---
if grep -q '"postbuild": *"[^"]*next-sitemap' package.json 2>/dev/null && ! grep -q '"next-sitemap"' package.json; then
  log "Adding devDependency: next-sitemap..."
  case "$PKG" in
    npm)  npm i -D next-sitemap ;;
    pnpm) pnpm add -D next-sitemap ;;
    yarn) yarn add -D next-sitemap ;;
  esac
fi

# --- Install JS dependencies ---
log "Installing project dependencies..."
case "$PKG" in
  npm)  npm install ;;
  pnpm) pnpm install ;;
  yarn) yarn install ;;
esac

# --- Provider selection (OpenAI default) ---
echo
echo "Choose API provider:"
echo "  1) OpenAI (default)"
echo "  2) DeepSeek"
read -rp "Enter 1 or 2 [default: 1]: " choice
choice="${choice:-1}"
case "$choice" in
  1) VAR_NAME="OPENAI_API_KEY"; PROVIDER="OpenAI";   PROVIDER_PUBLIC="openai" ;;
  2) VAR_NAME="DEEP_SEEK_API_KEY"; PROVIDER="DeepSeek"; PROVIDER_PUBLIC="deepseek" ;;
  *) VAR_NAME="OPENAI_API_KEY"; PROVIDER="OpenAI";   PROVIDER_PUBLIC="openai" ;;
esac

# --- API key (visible) ---
read -rp "Enter your ${PROVIDER} API key: " API_KEY

# --- Write .env.local (overwrite) ---
ENV_FILE=".env.local"
{
  echo "${VAR_NAME}=${API_KEY}"
  echo "NEXT_PUBLIC_LLM_PROVIDER=${PROVIDER_PUBLIC}"
} > "$ENV_FILE"
log "Wrote to $(pwd)/${ENV_FILE}:"
echo "${VAR_NAME}=${API_KEY}"
echo "NEXT_PUBLIC_LLM_PROVIDER=${PROVIDER_PUBLIC}"

# --- Web Speech language ---
echo
echo "Web Speech Recognition language (BCP-47)."
echo "Examples: en-US, en-US, en-GB, fr-FR, de-DE, es-ES, it-IT, pl-PL, pt-BR, ru-RU, uk-UA"
read -rp "Enter language code (default: en-US): " SPEECH_LANG
SPEECH_LANG="${SPEECH_LANG:-en-US}"

TARGET_CONFIG="${PWD}/config.ts"
echo "export const DEFAULT_WEB_SPEECH_LANGUAGE = '${SPEECH_LANG}';" > "${TARGET_CONFIG}"
log "Wrote DEFAULT_WEB_SPEECH_LANGUAGE='${SPEECH_LANG}' to ${TARGET_CONFIG}"

# --- Disable Next telemetry (non-fatal) ---
npx next telemetry disable >/dev/null 2>&1 || true

log "✅ Setup complete!"
echo "You can now run:"
echo "  ${PKG} run dev"