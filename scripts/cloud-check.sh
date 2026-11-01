#!/usr/bin/env bash
#
# CI（.github/workflows/ci.yml）と同じ検査を、手元／クラウド環境で順に回す。
#
#   bash scripts/cloud-setup.sh   # 先に一度
#   bash scripts/cloud-check.sh            # 全部
#   bash scripts/cloud-check.sh --quick    # node の検算だけ（replica もブラウザも使わない）
#
# 鍵は使わない。ローカル replica だけを相手にする。
# CI にある「開発サーバーの中継」と「ts-loader の .ts」の 2 つはここでは回さない（CI に任せる）。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PATH="$HOME/.local/bin:$PATH"

echo "==> node の検算"
for t in shogi-rules shogi-ai shogi-endings sky-astro sky-names i18n-keys no-emoji analytics shogi-vs-oss; do
  node "tests/$t.test.mjs" > /dev/null || { echo "FAIL tests/$t.test.mjs" >&2; node "tests/$t.test.mjs" | tail -20 >&2; exit 1; }
  echo "  ok  $t"
done
[ "${1:-}" = "--quick" ] && exit 0

echo "==> ローカル replica"
dfx stop >/dev/null 2>&1 || true
dfx start --clean --background > replica.log 2>&1
for i in $(seq 1 30); do dfx ping >/dev/null 2>&1 && break; sleep 2; done
dfx ping >/dev/null 2>&1 || { echo "replica が起動しない（replica.log）" >&2; exit 1; }

echo "==> バックエンドを配置して宣言を生成"
dfx deploy todo_app_backend >/dev/null 2>&1
dfx generate todo_app_backend >/dev/null 2>&1

echo "==> 本番向けビルドを検証"
rm -rf dist
DFX_NETWORK=ic CANISTER_ID_TODO_APP_BACKEND=ifoqp-6iaaa-aaaaj-qnnrq-cai npx webpack --mode production >/dev/null
test "$(grep -c '<script' dist/todo_app_frontend/index.html)" -eq 1 || { echo "script タグが 1 個でない" >&2; exit 1; }
grep -q 'ic0.app' dist/todo_app_frontend/index.js || { echo "バンドルが ic0.app を向いていない" >&2; exit 1; }
grep -q 'ifoqp-6iaaa-aaaaj-qnnrq-cai' dist/todo_app_frontend/index.js || { echo "backend canister id が無い" >&2; exit 1; }
echo "  ok  script タグ 1 個 / ic0.app / backend canister id"

echo "==> ローカル replica 向けにビルドして配置"
rm -rf dist
npx webpack --mode production >/dev/null
dfx deploy todo_app_frontend >/dev/null 2>&1

# Chromium は *.localhost を自分で 127.0.0.1 に向けるが、Node（page.request）は OS の名前解決に頼る。
# クラウド環境では *.localhost が引けず manifest.json の取得で ENOTFOUND になったので hosts に足す。
id="$(dfx canister id todo_app_frontend)"
if ! getent hosts "$id.localhost" >/dev/null 2>&1; then
  if [ -w /etc/hosts ]; then
    echo "127.0.0.1 $id.localhost" >> /etc/hosts
  else
    echo "警告: $id.localhost が引けず /etc/hosts も書けない。e2e の途中で落ちるかもしれない" >&2
  fi
fi

echo "==> 実ブラウザで通しテスト"
node e2e/e2e.mjs "http://$id.localhost:4943/" | tail -3
