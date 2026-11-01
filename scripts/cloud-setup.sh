#!/usr/bin/env bash
#
# Claude Code のクラウド環境（または素の Ubuntu）で、CI と同じ検査を回せるようにする。
#
#   bash scripts/cloud-setup.sh
#
# 何度実行しても よい（済んでいる手順は飛ばす）。終わったら bash scripts/cloud-check.sh で CI 相当を全部回せる。
#
# 2026-11-01 にクラウド環境で実測して要ったもの:
#   - dfx が無い。公式の install.sh（dfxvm）は GitHub からの取得で
#     「error sending request」になり失敗する（プロキシ越しだと通らない）。curl なら同じ URL が落とせるので、
#     tarball を直接 ~/.local/bin に置く。
#   - e2e.mjs は ESM で `import "playwright"` する。環境には Playwright と Chromium が入っているが
#     /opt/node-tools にあり ESM からは見えない。node_modules へ symlink する
#     （CI の `npx playwright install` はしない＝版のずれた Chromium を落とすだけ）。
#
# 配備（scripts/deploy.sh）はここでは扱わない。配備鍵は RPi5 の外に出さない。
set -euo pipefail

DFX_VERSION="${DFX_VERSION:-0.32.0}"
BIN="$HOME/.local/bin"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p "$BIN"

echo "==> npm ci"
npm ci --no-audit --no-fund >/dev/null

echo "==> dfx $DFX_VERSION"
if ! "$BIN/dfx" --version 2>/dev/null | grep -q "$DFX_VERSION"; then
  tmp="$(mktemp -d)"
  curl -fsSL -o "$tmp/dfx.tgz" \
    "https://github.com/dfinity/sdk/releases/download/$DFX_VERSION/dfx-x86_64-unknown-linux-gnu.tar.gz"
  tar xzf "$tmp/dfx.tgz" -C "$tmp"
  install -m 755 "$(find "$tmp" -type f -name dfx | head -1)" "$BIN/dfx"
  rm -rf "$tmp"
fi
"$BIN/dfx" --version

echo "==> e2e 用の Playwright と jsQR"
npm install --no-save --no-audit --no-fund jsqr@1 >/dev/null
if [ ! -e node_modules/playwright ]; then
  pw="$(node -e "console.log(require.resolve('playwright/package.json').replace(/\/package\.json\$/, ''))" 2>/dev/null || true)"
  if [ -n "$pw" ] && [ -d "$pw" ]; then
    ln -sfn "$pw" node_modules/playwright
    ln -sfn "$(dirname "$pw")/playwright-core" node_modules/playwright-core
  else
    # 環境に入っていなければ CI と同じやり方に戻る
    npm install --no-save --no-audit --no-fund playwright@1 >/dev/null
    npx playwright install --with-deps chromium
  fi
fi
node --input-type=module -e "import('playwright').then(() => console.log('playwright ok'))"

echo
echo "準備できました。CI 相当を回す: bash scripts/cloud-check.sh"
