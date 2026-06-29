#!/usr/bin/env bash
#
# Root-free Playwright runner: drives a headless Chromium against the dev server
# for frontend diagnosis. No sudo in our env, so instead of `playwright
# install-deps` we vendor Chromium's native libs into a gitignored cache.
#
# Usage (dev server must be running, e.g. `pnpm --filter @ascentry/web dev`):
#   apps/web/scripts/pw.sh node apps/web/e2e/<probe>.mjs [args…]
#
# Assumes Debian/Ubuntu (apt-get + dpkg-deb) on x86_64.
set -euo pipefail

WEB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE="$WEB_DIR/.pw-libs"
LIBROOT="$CACHE/root"
ARCH_DIR="$LIBROOT/usr/lib/x86_64-linux-gnu"

# Native libs Chromium's headless shell needs (extend if a launch fails on a missing .so).
PKGS="libgbm1 libdrm2 libasound2 libwayland-server0 libwayland-client0 libwayland-egl1 \
libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libxext6 libxi6 libxtst6 \
libnss3 libnspr4 libcups2 libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 libpango-1.0-0 \
libcairo2 libxcb1 libxcursor1 libxrender1"

if [ ! -d "$ARCH_DIR" ]; then
  echo "[pw] vendoring native libs (no sudo) into $CACHE …"
  mkdir -p "$CACHE/debs" "$LIBROOT"
  ( cd "$CACHE/debs" && apt-get download $PKGS )
  for deb in "$CACHE/debs"/*.deb; do dpkg-deb -x "$deb" "$LIBROOT"; done
fi

# Ensure the Chromium binary is present (cached in ~/.cache/ms-playwright).
if [ ! -f "$CACHE/.browser-installed" ]; then
  echo "[pw] installing chromium browser …"
  pnpm --filter @ascentry/web exec playwright install chromium
  touch "$CACHE/.browser-installed"
fi

export LD_LIBRARY_PATH="$ARCH_DIR:$LIBROOT/lib/x86_64-linux-gnu:${LD_LIBRARY_PATH:-}"
exec "$@"
