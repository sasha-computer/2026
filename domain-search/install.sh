#!/usr/bin/env bash
set -euo pipefail

# domain-search installer
# https://github.com/sasha-computer/domain-search

REPO="sasha-computer/domain-search"
TOOL="domain-search"

info() { printf '\033[1;34m%s\033[0m\n' "$1"; }
ok()   { printf '\033[1;32m%s\033[0m\n' "$1"; }
err()  { printf '\033[1;31m%s\033[0m\n' "$1" >&2; }

# Check for Python 3.12+
check_python() {
  for cmd in python3 python; do
    if command -v "$cmd" >/dev/null 2>&1; then
      ver=$("$cmd" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")' 2>/dev/null)
      major=$(echo "$ver" | cut -d. -f1)
      minor=$(echo "$ver" | cut -d. -f2)
      if [ "$major" -ge 3 ] && [ "$minor" -ge 12 ]; then
        echo "$cmd"
        return 0
      fi
    fi
  done
  return 1
}

# Install via uv (preferred)
install_uv() {
  if command -v uv >/dev/null 2>&1; then
    info "Installing $TOOL via uv..."
    uv tool install "git+https://github.com/$REPO"
    return 0
  fi
  return 1
}

# Install via pipx (fallback)
install_pipx() {
  if command -v pipx >/dev/null 2>&1; then
    info "Installing $TOOL via pipx..."
    pipx install "git+https://github.com/$REPO"
    return 0
  fi
  return 1
}

# Install via pip (last resort)
install_pip() {
  local py
  py=$(check_python) || {
    err "Python 3.12+ is required but not found."
    err "Install Python from https://www.python.org or your package manager."
    exit 1
  }
  info "Installing $TOOL via pip..."
  "$py" -m pip install --user "git+https://github.com/$REPO"
  return 0
}

main() {
  info "Installing $TOOL..."
  echo

  # Try methods in order of preference
  if install_uv; then
    echo
    ok "Installed via uv."
  elif install_pipx; then
    echo
    ok "Installed via pipx."
  else
    info "Neither uv nor pipx found. Falling back to pip."
    echo
    if install_pip; then
      ok "Installed via pip."
    else
      err "Installation failed."
      exit 1
    fi
  fi

  echo
  if command -v "$TOOL" >/dev/null 2>&1; then
    ok "$TOOL is ready. Try: $TOOL creative"
  else
    info "Installed. You may need to add ~/.local/bin to your PATH:"
    echo '  export PATH="$HOME/.local/bin:$PATH"'
    echo
    info "Then try: $TOOL creative"
  fi
}

main
