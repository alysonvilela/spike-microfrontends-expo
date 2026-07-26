#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# setup-local-tls.sh — trust a local CA for *.alysonvilela.local
#
# Two methods (auto-detected):
#   1. Caddy (preferred) — uses `caddy trust` to install Caddy's internal CA.
#   2. mkcert (fallback)  — uses `mkcert -install` + generates a wildcard cert.
#
# Usage:
#   ./scripts/setup-local-tls.sh           # auto-detect
#   ./scripts/setup-local-tls.sh --caddy   # force Caddy
#   ./scripts/setup-local-tls.sh --mkcert  # force mkcert
# ---------------------------------------------------------------------------
set -euo pipefail

LOCAL_DOMAIN="*.alysonvilela.local"

info()  { printf "\033[36m➜\033[0m %s\n" "$*"; }
ok()    { printf "\033[32m✓\033[0m %s\n" "$*"; }
err()   { printf "\033[31m✗\033[0m %s\n" "$*" >&2; }

# ---- Detect method ----
METHOD="${1:-auto}"

setup_with_caddy() {
  if ! command -v caddy &>/dev/null; then
    err "Caddy not found. Install it first:"
    err "  brew install caddy             # macOS"
    err "  sudo apt install caddy         # Debian/Ubuntu"
    err "  sudo dnf install caddy         # Fedora"
    err "  or download from https://caddyserver.com/download"
    return 1
  fi

  info "Installing Caddy's local CA into the system trust store..."
  caddy trust

  ok "Caddy CA is trusted. Caddy will now serve ${LOCAL_DOMAIN} with valid HTTPS."
  info "Start Caddy with:  caddy run"
  return 0
}

setup_with_mkcert() {
  if ! command -v mkcert &>/dev/null; then
    err "mkcert not found. Install it first:"
    err "  brew install mkcert            # macOS"
    err "  sudo apt install mkcert        # Debian/Ubuntu"
    err "  or visit https://github.com/FiloSottile/mkcert"
    return 1
  fi

  info "Installing mkcert local CA..."
  mkcert -install

  info "Generating wildcard certificate for ${LOCAL_DOMAIN}..."
  # Strip the glob for mkcert — it wants the base domain too
  mkcert "${LOCAL_DOMAIN}" "alysonvilela.local"

  # Move certs to a known location
  mkdir -p .caddy
  mv -- *"alysonvilela.local"*".pem" .caddy/ 2>/dev/null || true

  ok "mkcert CA is trusted. Wildcard cert generated in ./.caddy/"
  info "Configure your reverse-proxy (Caddy/npm) to use:"
  info "  cert: .caddy/*.alysonvilela.local.pem"
  info "  key:  .caddy/*.alysonvilela.local-key.pem"
  return 0
}

# ---- Main ----
case "$METHOD" in
  --caddy|caddy)
    setup_with_caddy
    ;;
  --mkcert|mkcert)
    setup_with_mkcert
    ;;
  auto|--auto)
    if command -v caddy &>/dev/null; then
      info "Caddy detected — using Caddy's internal CA."
      setup_with_caddy
    elif command -v mkcert &>/dev/null; then
      info "Caddy not found — falling back to mkcert."
      setup_with_mkcert
    else
      err "Neither Caddy nor mkcert is installed."
      err ""
      err "Install one of them and re-run this script:"
      err ""
      err "  # Caddy (recommended)"
      err "  brew install caddy         # macOS"
      err "  sudo apt install caddy     # Debian/Ubuntu"
      err ""
      err "  # mkcert (alternative)"
      err "  brew install mkcert        # macOS"
      err "  sudo apt install mkcert    # Debian/Ubuntu"
      exit 1
    fi
    ;;
  *)
    echo "Usage: $0 [--caddy|--mkcert]" >&2
    exit 1
    ;;
esac
