#!/usr/bin/env bash
#
# 禁欲カウンターの frontend だけを IC メインネットへデプロイする。
#
#   bash scripts/deploy-frontend.sh
#
# backend（カウント値を保持している側）には一切触れない。
# `dfx deploy` を使わないのはそのため。dfx deploy は canister 名を指定しても
# 依存先の backend まで install しようとし、count は非 stable 変数なので
# アップグレードで 0 にリセットされてしまう。
#
set -euo pipefail

BACKEND_ID="ifoqp-6iaaa-aaaaj-qnnrq-cai"
FRONTEND="todo_app_frontend"
FRONTEND_URL="https://iqjbc-7aaaa-aaaaj-qnnsa-cai.icp0.io/"

cd "$(dirname "$0")/.."

echo "==> デプロイ前のカウント値"
before="$(dfx canister --network ic call "$BACKEND_ID" getCount '()' --query)"
echo "    $before"

echo "==> 依存をインストール"
npm ci

echo "==> 前回ビルドの残骸を掃除（webpack に output.clean が無いため）"
rm -rf dist

echo "==> フロントエンドをビルド（network=ic）"
DFX_NETWORK=ic CANISTER_ID_TODO_APP_BACKEND="$BACKEND_ID" npx webpack --mode production

echo "==> 生成物を検証"
tags="$(grep -c '<script' dist/todo_app_frontend/index.html)"
if [ "$tags" -ne 1 ]; then
  echo "    NG: index.html の script タグが ${tags} 個。1 個であるべき（2 個だと +2 バグが再発する）" >&2
  exit 1
fi
grep -q 'ic0.app' dist/todo_app_frontend/index.js || { echo "    NG: バンドルが ic0.app を向いていない" >&2; exit 1; }
grep -q "$BACKEND_ID" dist/todo_app_frontend/index.js || { echo "    NG: バンドルに backend canister id が無い" >&2; exit 1; }
echo "    OK: script タグ 1 個 / ic0.app / backend canister id"

echo "==> frontend キャニスターだけを更新"
dfx build --network ic "$FRONTEND"
dfx canister install "$FRONTEND" --network ic --mode upgrade

echo "==> デプロイ後のカウント値（変わっていなければ backend は無傷）"
after="$(dfx canister --network ic call "$BACKEND_ID" getCount '()' --query)"
echo "    before=${before}  after=${after}"
if [ "$before" != "$after" ]; then
  echo "    警告: カウント値が変化しています。backend が巻き込まれた可能性があります" >&2
fi

echo
echo "完了: ${FRONTEND_URL}"
